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

  const handleDestinationSearch = () => {
  if (!currentLocation || !destinationCoords) {
    setError('Please select a valid destination');
    return;
  }

  const fetchRoute = async () => {
    try {
      const start = `${currentLocation.longitude},${currentLocation.latitude}`;
      const end = `${destinationCoords[0]},${destinationCoords[1]}`;
      webViewRef.current?.injectJavaScript('window.clearDestinationMarker && window.clearDestinationMarker();');

      const response = await fetch(`http://10.0.2.2:3000/api/directions?start=${start}&end=${end}`);//Change 10.0.0.10 to your IP address
      //In command prompt: ipconfig, take the second IPV4 address that appears in the list
      //If using Android Studio, 10.0.2.2 should work
      //This will be changed once the app is deployed
      const data = await response.json();

      const coordinates = data.features?.[0]?.geometry?.coordinates;
      if (!coordinates || coordinates.length === 0) throw new Error('No route found');

      lastRoute.current = coordinates;

      const jsRouteCode = `window.drawRoute && window.drawRoute(${JSON.stringify(coordinates)});`;
      webViewRef.current?.injectJavaScript(jsRouteCode);
      setStatus('Route drawn!');
    } catch (error) {
      console.error('Route fetch error:', error);
      setError('Failed to fetch or draw route');
    }
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
  if (lastRoute.current.length === 0) {
    handleDestinationSearch();
    // Small delay to ensure route is drawn before starting navigation
    setTimeout(() => {
      initializeNavigation();
    }, 500);
  } else {
    // Route already exists, just start navigation
    initializeNavigation();
  }
};

// New function to handle the actual navigation initialization
const initializeNavigation = () => {
  setIsNavigating(true);
  
  // Start watching position with higher frequency
  watchIdRef.current = Geolocation.watchPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      sendLocationToWebView(latitude, longitude);
      
      // Check if we need to recalculate route
      checkRouteDeviation(latitude, longitude);
    },
    (error) => {
      console.error('Location tracking error:', error);
      setError('Failed to track location');
    },
    { 
      enableHighAccuracy: true, 
      distanceFilter: 10, // Update every 10 meters
      interval: 3000,     // Update every 3 seconds (Android)
      fastestInterval: 1000 // Fastest update interval (Android)
    }
  );
  
  // Calculate initial estimated time
  if (lastRoute.current.length > 0) {
    const routeDistance = calculateRouteDistance(lastRoute.current);
    const avgWalkingSpeed = 1.4; // m/s (5 km/h)
    const timeInSeconds = routeDistance / avgWalkingSpeed;
    setEstimatedTime(Math.round(timeInSeconds / 60)); // in minutes
    
    // Calculate initial distance to destination
    if (currentLocation && destinationCoords) {
      const destPoint = lastRoute.current[lastRoute.current.length - 1];
      const distance = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        destPoint[1], // Latitude
        destPoint[0]  // Longitude
      );
      setDistanceToDestination(distance);
    }
  }
  
  setStatus('Navigation started');
};

// Add this function to stop navigation
const stopNavigation = () => {
  if (watchIdRef.current !== null) {
    Geolocation.clearWatch(watchIdRef.current);
    watchIdRef.current = null;
  }
  setIsNavigating(false);
  setStatus('Navigation stopped');
};

// Add this function to check if the user has deviated from the route
const checkRouteDeviation = (latitude: number, longitude: number) => {
  if (!lastRoute.current || lastRoute.current.length === 0) return;
  
  // First, check if we've reached the destination (within 30 meters)
  const destinationPoint = lastRoute.current[lastRoute.current.length - 1];
  const distanceToEnd = calculateDistance(
    latitude, 
    longitude, 
    destinationPoint[1], // Latitude
    destinationPoint[0]  // Longitude
  );
  
  // Update distance to destination
  setDistanceToDestination(distanceToEnd);
  
  // If we're close to destination, end navigation
  if (distanceToEnd < 30) {
    stopNavigation();
    setStatus('You have reached your destination!');
    webViewRef.current?.injectJavaScript('window.clearRoute && window.clearRoute();');
    return;
  }
  
  // Check if we've deviated from the route
  let onRoute = false;
  let closestDistance = Infinity;
  let closestPointIndex = 0;
  
  // Find closest point on the route
  for (let i = 0; i < lastRoute.current.length; i++) {
    const routePoint = lastRoute.current[i];
    const distance = calculateDistance(
      latitude, 
      longitude, 
      routePoint[1], // Latitude
      routePoint[0]  // Longitude
    );
    
    if (distance < closestDistance) {
      closestDistance = distance;
      closestPointIndex = i;
    }
  }
  
  // If we're within 50 meters of the route, we're considered on route
  if (closestDistance < 50) {
    onRoute = true;
    
    // Update route progress (0-100%)
    const progress = (closestPointIndex / lastRoute.current.length) * 100;
    setRouteProgress(Math.round(progress));
    
    // Update the user's position on the route
    const jsProgressCode = `window.updateRouteProgress && window.updateRouteProgress(${closestPointIndex});`;
    webViewRef.current?.injectJavaScript(jsProgressCode);
  }
  
  // If we've deviated significantly, recalculate route
  if (!onRoute && closestDistance > 100) {
    recalculateRoute(latitude, longitude);
  }
};

// Add this function to recalculate the route
const recalculateRoute = async (latitude: number, longitude: number) => {
  if (!destinationCoords) return;
  
  try {
    setStatus('Recalculating route...');
    
    const start = `${longitude},${latitude}`;
    const end = `${destinationCoords[0]},${destinationCoords[1]}`;
    
    const response = await fetch(`http://10.0.2.2:3000/api/directions?start=${start}&end=${end}`);
    const data = await response.json();
    
    const coordinates = data.features?.[0]?.geometry?.coordinates;
    if (!coordinates || coordinates.length === 0) throw new Error('No route found');
    
    lastRoute.current = coordinates;
    
    const jsRouteCode = `window.updateRoute && window.updateRoute(${JSON.stringify(coordinates)});`;
    webViewRef.current?.injectJavaScript(jsRouteCode);
    
    setStatus('Route updated');
    
    // Estimate time based on route length
    const routeDistance = calculateRouteDistance(coordinates);
    const avgWalkingSpeed = 1.4; // m/s (5 km/h)
    const timeInSeconds = routeDistance / avgWalkingSpeed;
    setEstimatedTime(Math.round(timeInSeconds / 60)); // in minutes
    
  } catch (error) {
    console.error('Route recalculation error:', error);
    setError('Failed to recalculate route');
  }
};

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