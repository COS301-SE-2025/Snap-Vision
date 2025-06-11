// src/screens/MapScreen.tsx
import React, { useState, useRef } from 'react';
import { View, Alert, Share, StyleSheet, TextInput, TouchableOpacity, Text} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { PermissionsAndroid } from 'react-native';
import { WebView as WebViewType } from 'react-native-webview';
import { useEffect } from 'react';
//import { MAPTILER_API_KEY } from '@env'; // assumes you're using `react-native-dotenv`
import firestore from '@react-native-firebase/firestore';
import NavigationPanel from '../components/organisms/NavigationPanel';

// Add this type declaration at the top-level of project (e.g., src/types/env.d.ts):
// declare module '@env' {
//   export const MAPTILER_API_KEY: string;
// }


import MapWebView from '../components/organisms/MapWebView';
import CrowdReportModal from '../components/molecules/CrowdReportModal';
import StatusOverlay from '../components/atoms/StatusOverlay';
import DestinationSearch from '../components/molecules/DestinationSearch';
import MapActionsPanel from '../components/organisms/MapActionsPanel';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import { TextIcon } from '../components/atoms/TextIcon';


const MapScreen = () => {
  const lastRoute = useRef<any[]>([]);
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  
  const [status, setStatus] = useState('Loading map...');
  const [error, setError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [showCrowdPopup, setShowCrowdPopup] = useState(false);
  const [selectedDensity, setSelectedDensity] = useState('moderate');
  const [destination, setDestination] = useState('');
  const [showShareTooltip, setShowShareTooltip] = useState(false);
  const [showReportTooltip, setShowReportTooltip] = useState(false);
  const webViewRef = useRef<WebViewType>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  const [isNavigating, setIsNavigating] = useState(false);
  const [routeProgress, setRouteProgress] = useState(0);
  const [distanceToDestination, setDistanceToDestination] = useState<number | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

  const sendLocationToWebView = (lat: number, lon: number) => {
    setCurrentLocation({ latitude: lat, longitude: lon });
    const jsCode = `window.updateUserLocation && window.updateUserLocation(${lat}, ${lon});`;
    webViewRef.current?.injectJavaScript(jsCode);
  };

  const requestLocation = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        Geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            sendLocationToWebView(latitude, longitude);
          },
          (error) => {
            setError('Failed to get location');
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
      } else {
        setError('Location permission denied');
      }
    } catch (err) {
      setError('Permission request failed');
    }
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = event.nativeEvent.data;
      if (data === 'MAP_READY') {
        setStatus('Map loaded');
         setIsMapReady(true);
        requestLocation();
        if (lastRoute.current.length > 0) {
        const reinject = `window.drawRoute && window.drawRoute(${JSON.stringify(lastRoute.current)});`;
        console.log('🔄 Reinjecting route on MAP_READY');
        webViewRef.current?.injectJavaScript(reinject);
      }

      } else {
        const parsed = JSON.parse(data);
        if (parsed.type === 'ERROR') {
          setError(parsed.message);
        } else if (parsed.type === 'POI_SELECTED') {
          // Handle POI selection from map tap
          const selectedPOI = parsed.poi;
          setDestination(selectedPOI.name);
          setDestinationCoords([selectedPOI.centroid.longitude, selectedPOI.centroid.latitude]);
          setStatus(`Selected: ${selectedPOI.name}`);
        }
      }
    } catch (e) {
      console.log('WebView message:', event.nativeEvent.data);
    }
  };

  const shareLocation = async () => {
    if (!currentLocation) {
      Alert.alert('No Location', 'Your location is not available yet.');
      return;
    }
    console.log('🔵 Sharing location:', currentLocation);
    console.log('🔵 WebView ref exists?', !!webViewRef.current);


    try {
      const url = `https://www.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`;
      const message = `Check out my location: ${url}`;
      await Share.share({ message, url, title: 'Share Location' });
      setStatus('Location shared successfully');
    } catch {
      setError('Failed to share location');
    }
  };

  const submitCrowdReport = () => {
    if (!currentLocation) return;

    const jsCrowdCode = `window.updateCrowdDensity && window.updateCrowdDensity(${currentLocation.latitude}, ${currentLocation.longitude}, '${selectedDensity}');`;
    webViewRef.current?.injectJavaScript(jsCrowdCode);

    setShowCrowdPopup(false);
    setStatus(`Crowd density reported: ${selectedDensity}`);
  };

  // Update handleDestinationSearch to use the most current location
const handleDestinationSearch = () => {
  if (!destinationCoords) {
    setError('Please select a valid destination');
    return;
  }

  const fetchRoute = async () => {
    setIsCalculatingRoute(true);

    Geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          setCurrentLocation({ latitude, longitude });

          sendLocationToWebView(latitude, longitude);

          webViewRef.current?.injectJavaScript('window.clearRoute && window.clearRoute();');
          webViewRef.current?.injectJavaScript('window.clearDestinationMarker && window.clearDestinationMarker();');

          const start = `${longitude},${latitude}`;
          const end = `${destinationCoords[0]},${destinationCoords[1]}`;

          const response = await fetch(`http://10.0.2.2:3000/api/directions?start=${start}&end=${end}`);
          const data = await response.json();

          const coordinates = data.features?.[0]?.geometry?.coordinates;
          if (!coordinates || coordinates.length === 0) throw new Error('No route found');

          lastRoute.current = coordinates;

          const jsRouteCode = `window.drawRoute && window.drawRoute(${JSON.stringify(coordinates)});`;
          webViewRef.current?.injectJavaScript(jsRouteCode);

          setStatus('Route drawn!');
        } catch (err) {
          console.error('Route fetch error:', err);
          setError('Failed to fetch or draw route');
        } finally {
          setIsCalculatingRoute(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setError('Failed to get current location for routing');
        setIsCalculatingRoute(false);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 1000 }
    );
  };

  fetchRoute();
};



const [destinationCoords, setDestinationCoords] = useState<[number, number] | null>(null);
const [pois, setPOIs] = useState<any[]>([]);

useEffect(() => {
  const fetchPOIs = async () => {
    try {
      const snapshot = await firestore().collection('UPcampusPOIs').get();
      const poiList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPOIs(poiList);
    } catch (e) {
      console.error('Failed to fetch POIs:', e);
    }
  };
  fetchPOIs();
}, []);

// Send POIs to WebView when they change and WebView is ready
useEffect(() => {
  if (isMapReady && pois.length > 0 && webViewRef.current) {
    const jsPOICode = `window.displayPOIs && window.displayPOIs(${JSON.stringify(pois)});`;
    webViewRef.current.injectJavaScript(jsPOICode);
  }
}, [isMapReady, pois]);

const [poiSuggestions, setPOISuggestions] = useState<any[]>([]);

const filterPOIs = (query: string) => {
  if (!query.trim()) {
    setPOISuggestions([]);
    return;
  }
  const filtered = pois.filter(poi =>
    poi.name && poi.name.toLowerCase().includes(query.toLowerCase())
  );
  setPOISuggestions(filtered);
};

const handleSelectPOI = (poi: any) => {
  setDestination(poi.name);
  setDestinationCoords([poi.centroid.longitude, poi.centroid.latitude]);
  setPOISuggestions([]);
};

// Update this function to fetch a route if needed
const startNavigation = () => {
  if (!currentLocation || !destinationCoords) {
    setError('Cannot start navigation without destination');
    return;
  }
  
  // If we don't have a route yet, calculate one first

// Add this function to calculate the distance between two points
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
};

// Add this function to calculate the total route distance
const calculateRouteDistance = (coordinates: number[][]) => {
  let totalDistance = 0;
  for (let i = 0; i < coordinates.length - 1; i++) {
    const point1 = coordinates[i];
    const point2 = coordinates[i + 1];
    totalDistance += calculateDistance(
      point1[1], point1[0], 
      point2[1], point2[0]
    );
  }
  return totalDistance;
};

// Add this useEffect to clean up when the component unmounts
useEffect(() => {
  return () => {
    // Clear the watch when component unmounts
    if (watchIdRef.current !== null) {
      Geolocation.clearWatch(watchIdRef.current);
    }
  };
}, []);

    // Modify your MapScreen.tsx return statement to include the NavigationPanel
  
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <DestinationSearch
        value={destination}
        onChange={text => {
          setDestination(text);
          filterPOIs(text);
        }}
        onSearch={handleDestinationSearch}
        suggestions={poiSuggestions}
        onSelectSuggestion={handleSelectPOI}
      />
  
      <View style={{ flex: 1 }}>
        <MapWebView ref={webViewRef} onMessage={handleWebViewMessage} />
      </View>
  
      {destination && destinationCoords && (
        <NavigationPanel
          isNavigating={isNavigating}
          isLoading={isCalculatingRoute}
          onStartNavigation={startNavigation}
          onStopNavigation={stopNavigation}
          progress={routeProgress}
          distance={distanceToDestination}
          time={estimatedTime}
          destination={destination}
        />
      )}
  
      <MapActionsPanel
        currentLocation={!!currentLocation}
        onShare={shareLocation}
        onReport={() => setShowCrowdPopup(true)}
        shareTooltip={showShareTooltip}
        reportTooltip={showReportTooltip}
        onShareIn={() => setShowShareTooltip(true)}
        onShareOut={() => setShowShareTooltip(false)}
        onReportIn={() => setShowReportTooltip(true)}
        onReportOut={() => setShowReportTooltip(false)}
        color={colors.primary}
      />
  
      <CrowdReportModal
        visible={showCrowdPopup}
        selectedDensity={selectedDensity}
        onChangeDensity={setSelectedDensity}
        onSubmit={submitCrowdReport}
        onCancel={() => setShowCrowdPopup(false)}
      />
  
      {status && <StatusOverlay status={status} />}
      {error && <StatusOverlay status={error} isError={true} />}
    </View>
  );
};

export default MapScreen;