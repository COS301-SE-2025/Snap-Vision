import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Camera, useCameraPermission, useFrameProcessor } from 'react-native-vision-camera';
import Geolocation from '@react-native-community/geolocation';
import firestore from '@react-native-firebase/firestore';
import { detectBuildingsInCameraView, filterBuildingsByProximity } from '../utils/buildingDetection';
import { BuildingRecognitionOverlay } from '../components/ar/BuildingRecognitionOverlay';

export default function OutdoorARNavigationScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const [device, setDevice] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [deviceHeading, setDeviceHeading] = useState(0);
  const [nearbyBuildings, setNearbyBuildings] = useState([]);
  const [detectedBuildings, setDetectedBuildings] = useState([]);

  // Get GPS location
  useEffect(() => {
    const watchId = Geolocation.watchPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => //consoleerror('GPS error:', error),
      { enableHighAccuracy: true, distanceFilter: 5 }
    );

    return () => Geolocation.clearWatch(watchId);
  }, []);

  // Load nearby buildings when location changes
  useEffect(() => {
    const loadBuildings = async () => {
      if (!userLocation) return;

      try {
        // Load buildings from Firestore
        const buildingsSnap = await firestore()
          .collection('locations')
          .doc('your-location-id')
          .collection('buildingPOIs')
          .get();

        const allBuildings = buildingsSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Filter to nearby buildings
        const nearby = filterBuildingsByProximity(allBuildings, userLocation, 500);
        setNearbyBuildings(nearby);
      } catch (error) {
        //consoleerror('Failed to load buildings:', error);
      }
    };

    loadBuildings();
  }, [userLocation]);

  // Frame processor for building detection
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';
    
    if (!userLocation || !nearbyBuildings.length) return;

    // Detect buildings in current camera view
    const detected = detectBuildingsInCameraView(nearbyBuildings, {
      userLocation,
      deviceHeading,
      cameraFOV: 60,
      maxDistance: 300
    });

    runOnJS(setDetectedBuildings)(detected);
  }, [userLocation, nearbyBuildings, deviceHeading]);

  const handleBuildingTap = useCallback((building) => {
    // Handle building selection for navigation
    //consolelog('Building selected:', building);
  }, []);

  if (!hasPermission) {
    return null; // Show permission request UI
  }

  return (
    <View style={styles.container}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive
        frameProcessor={frameProcessor}
      />
      
      <BuildingRecognitionOverlay
        detectedBuildings={detectedBuildings}
        onBuildingTap={handleBuildingTap}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});