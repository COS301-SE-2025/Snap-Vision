// src/screens/MapScreen.tsx
import React, { useState, useRef } from 'react';
import { View, Alert, Share } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { PermissionsAndroid } from 'react-native';
import { WebView as WebViewType } from 'react-native-webview';
import { useEffect } from 'react';
import firestore from '@react-native-firebase/firestore';

import MapWebView from '../components/organisms/MapWebView';
import CrowdReportModal from '../components/molecules/CrowdReportModal';
import StatusOverlay from '../components/atoms/StatusOverlay';
import DestinationSearch from '../components/molecules/DestinationSearch';
import MapActionsPanel from '../components/organisms/MapActionsPanel';
import NavigationPanel from '../components/organisms/NavigationPanel';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';

const ROUTING_API_BASE = "http://192.168.0.133:3000"; // <-- Use your correct backend IP here

const MapScreen = () => {
  const lastRoute = useRef<any[]>([]);
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const watchIdRef = useRef<number | null>(null);

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
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  
  // Navigation state
  const [isNavigating, setIsNavigating] = useState(false);
  const [routeProgress, setRouteProgress] = useState(0);
  const [distanceToDestination, setDistanceToDestination] = useState<number | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);

  const [destinationCoords, setDestinationCoords] = useState<[number, number] | null>(null);
  const [pois, setPOIs] = useState<any[]>([]);
  const [poiSuggestions, setPOISuggestions] = useState<any[]>([]);

  const sendLocationToWebView = (lat: number, lon: number, centerMap = false) => {
    setCurrentLocation({ latitude: lat, longitude: lon });
    const jsCode = `window.updateUserLocation && window.updateUserLocation(${lat}, ${lon}, ${centerMap});`;
    webViewRef.current?.injectJavaScript(jsCode);
    
    // Update navigation progress when navigating
    if (isNavigating && destinationCoords) {
      updateNavigationProgress(lat, lon);
    }
  };

  const requestLocation = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        setStatus('Getting your location...');
        Geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            sendLocationToWebView(latitude, longitude, true);
            setStatus('Location found');
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
          webViewRef.current?.injectJavaScript(reinject);
        }
      } else {
        const parsed = JSON.parse(data);
        if (parsed.type === 'ERROR') {
          setError(parsed.message);
        } else if (parsed.type === 'POI_SELECTED') {
          const selectedPOI = parsed.poi;
          
          // Stop navigation if currently navigating
          if (isNavigating) {
            stopNavigation();
          }
          
          // Clear any existing route
          webViewRef.current?.injectJavaScript('window.clearRoute && window.clearRoute();');
          lastRoute.current = [];
          
          setDestination(selectedPOI.name);
          setDestinationCoords([selectedPOI.centroid.longitude, selectedPOI.centroid.latitude]);
          setStatus(`Selected: ${selectedPOI.name}`);
          
          // Automatically fetch route when POI is selected
          if (currentLocation) {
            fetchRoute([selectedPOI.centroid.longitude, selectedPOI.centroid.latitude]);
          }
        }
      }
    } catch (e) {
      console.log('WebView message:', event.nativeEvent.data);
    }
  };

  // ...existing code...
  const shareLocation = async () => {
    if (!currentLocation) {
      Alert.alert('No Location', 'Your location is not available yet.');
      return;
    }
    try {
      const url = `https://snap-vision-f6954.web.app/location?lat=${currentLocation.latitude}&lng=${currentLocation.longitude}`;
      const message = `Check out my location: ${url}`;
      await Share.share({ message, url, title: 'Share Location' });
      setStatus('Location shared successfully');
    } catch {
      setError('Failed to share location');
    }
  };
  // ...existing code...

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
    fetchRoute(destinationCoords);
  };

  const fetchRoute = async (destCoords: [number, number]) => {
    if (!currentLocation) {
      setError('Your location is not available yet');
      return;
    }
    
    setIsRouteLoading(true);
    setStatus('Calculating route...');
    
    try {
      const start = `${currentLocation.longitude},${currentLocation.latitude}`;
      const end = `${destCoords[0]},${destCoords[1]}`;
      
      // Clear any existing route first
      webViewRef.current?.injectJavaScript('window.clearRoute && window.clearRoute();');
      
      const url = `${ROUTING_API_BASE}/api/directions?start=${start}&end=${end}`;
      const response = await fetch(url);
      const data = await response.json();

      const coordinates = data.features?.[0]?.geometry?.coordinates;
      if (!coordinates || coordinates.length === 0) throw new Error('No route found');

      lastRoute.current = coordinates;

      // Calculate distance and time for the route
      let totalDistance = 0;
      for (let i = 0; i < coordinates.length - 1; i++) {
        const point1 = coordinates[i];
        const point2 = coordinates[i + 1];
        totalDistance += getDistanceMeters(
          point1[1], point1[0], 
          point2[1], point2[0]
        );
      }
      
      // Set the total distance
      setDistanceToDestination(totalDistance);
      
      // Estimate time (assuming average walking speed of 5 km/h = 1.4 m/s)
      const timeMinutes = Math.round(totalDistance / (1.4 * 60));
      setEstimatedTime(timeMinutes);

      const jsRouteCode = `window.drawRoute && window.drawRoute(${JSON.stringify(coordinates)});`;
      webViewRef.current?.injectJavaScript(jsRouteCode);
      setStatus('Route found!');
      
      // Reset progress
      setRouteProgress(0);
    } catch (error) {
      console.error('Route fetch error:', error);
      setError('Failed to fetch or draw route');
    } finally {
      setIsRouteLoading(false);
    }
  };

  // Start navigation function
  const startNavigation = () => {
    if (!currentLocation || !destinationCoords || lastRoute.current.length === 0) {
      setError('Cannot start navigation without a route');
      return;
    }
    
    setIsNavigating(true);
    setStatus('Navigation started');
    
    // Start watching position with higher frequency
    if (watchIdRef.current) {
      Geolocation.clearWatch(watchIdRef.current);
    }
    
    watchIdRef.current = Geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        sendLocationToWebView(latitude, longitude);
      },
      (error) => {
        setError('Failed to track location');
      },
      { 
        enableHighAccuracy: true, 
        distanceFilter: 5, // Update every 5 meters
        interval: 2000 // Update every 2 seconds
      }
    );
  };

  // Stop navigation function
  const stopNavigation = () => {
    if (watchIdRef.current) {
      Geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    
    setIsNavigating(false);
    setStatus('Navigation stopped');
    
    // Clear progress line
    webViewRef.current?.injectJavaScript('if (window.progressLine) { map.removeLayer(window.progressLine); window.progressLine = null; }');
  };

  // Update navigation progress
  const updateNavigationProgress = (latitude: number, longitude: number) => {
    if (!lastRoute.current || lastRoute.current.length === 0) return;
    
    // Find closest point on the route
    let minDist = Infinity;
    let closestPointIndex = 0;
    
    for (let i = 0; i < lastRoute.current.length; i++) {
      const routePoint = lastRoute.current[i];
      const distance = getDistanceMeters(
        latitude, 
        longitude, 
        routePoint[1], // Latitude
        routePoint[0]  // Longitude
      );
      
      if (distance < minDist) {
        minDist = distance;
        closestPointIndex = i;
      }
    }
    
    // Calculate progress (0-100%)
    const progress = (closestPointIndex / (lastRoute.current.length - 1)) * 100;
    setRouteProgress(Math.min(Math.round(progress), 100));
    
    // Update route progress visually
    const jsProgressCode = `window.updateRouteProgress && window.updateRouteProgress(${closestPointIndex});`;
    webViewRef.current?.injectJavaScript(jsProgressCode);
    
    // Check if we've reached the destination (within 20 meters)
    const destinationPoint = lastRoute.current[lastRoute.current.length - 1];
    const distanceToEnd = getDistanceMeters(
      latitude, 
      longitude, 
      destinationPoint[1], // Latitude
      destinationPoint[0]  // Longitude
    );
    
    // Update distance to destination
    setDistanceToDestination(distanceToEnd);
    
    // If we're very close to destination, end navigation
    if (distanceToEnd < 20) {
      stopNavigation();
      setStatus('You have reached your destination!');
      // Show 100% completion
      setRouteProgress(100);
    }
  };

  // Fetch POIs from Firestore
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
      // Modify the POI data to set labels to empty by default
      const poisWithHiddenLabels = pois.map(poi => ({
        ...poi,
        showLabel: false // Add property to control label visibility
      }));
      
      const jsPOICode = `window.displayPOIs && window.displayPOIs(${JSON.stringify(poisWithHiddenLabels)});`;
      webViewRef.current.injectJavaScript(jsPOICode);
    }
  }, [isMapReady, pois]);

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
    // Stop navigation if currently navigating
    if (isNavigating) {
      stopNavigation();
    }
    
    // Clear any existing route
    webViewRef.current?.injectJavaScript('window.clearRoute && window.clearRoute();');
    lastRoute.current = [];
    
    setDestination(poi.name);
    setDestinationCoords([poi.centroid.longitude, poi.centroid.latitude]);
    setPOISuggestions([]);
    
    // Automatically fetch route when POI is selected from search
    if (currentLocation) {
      fetchRoute([poi.centroid.longitude, poi.centroid.latitude]);
    }
  };

  // Dynamically request location updates
  useEffect(() => {
    let watchId: number | null = null;

    const startWatchingLocation = async () => {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        watchId = Geolocation.watchPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            sendLocationToWebView(latitude, longitude);
          },
          (error) => {
            setError('Failed to get location');
          },
          { enableHighAccuracy: true, distanceFilter: 5, interval: 2000 }
        );
      } else {
        setError('Location permission denied');
      }
    };

    startWatchingLocation();

    return () => {
      if (watchId !== null) {
        Geolocation.clearWatch(watchId);
      }
    };
  }, []);

  // Helper to calculate distance between two lat/lon points (Haversine formula)
  function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
    const toRad = (x: number) => (x * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Dynamic rerouting if user deviates from route
  useEffect(() => {
    if (
      !isNavigating ||
      !currentLocation ||
      !destinationCoords ||
      !lastRoute.current ||
      lastRoute.current.length === 0 ||
      isRouteLoading
    ) return;

    // Find nearest point on route
    let minDist = Infinity;
    for (const coord of lastRoute.current) {
      // route is [lng, lat]
      const dist = getDistanceMeters(
        currentLocation.latitude,
        currentLocation.longitude,
        coord[1],
        coord[0]
      );
      if (dist < minDist) minDist = dist;
    }

    // If user is more than 30 meters from the route, reroute
    if (minDist > 30) {
      setStatus('Re-routing...');
      rerouteFromCurrentLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLocation, isNavigating]);

  // Reroute function
  const rerouteFromCurrentLocation = async () => {
    if (!currentLocation || !destinationCoords || isRouteLoading) return;
    
    setIsRouteLoading(true);
    
    try {
      const start = `${currentLocation.longitude},${currentLocation.latitude}`;
      const end = `${destinationCoords[0]},${destinationCoords[1]}`;
      
      // Clear any existing route first
      webViewRef.current?.injectJavaScript('window.clearRoute && window.clearRoute();');
      
      const url = `${ROUTING_API_BASE}/api/directions?start=${start}&end=${end}`;
      const response = await fetch(url);
      const data = await response.json();

      const coordinates = data.features?.[0]?.geometry?.coordinates;
      if (!coordinates || coordinates.length === 0) throw new Error('No route found');

      lastRoute.current = coordinates;

      // Calculate distance and time for the new route
      let totalDistance = 0;
      for (let i = 0; i < coordinates.length - 1; i++) {
        const point1 = coordinates[i];
        const point2 = coordinates[i + 1];
        totalDistance += getDistanceMeters(
          point1[1], point1[0], 
          point2[1], point2[0]
        );
      }
      
      setDistanceToDestination(totalDistance);
      // Estimate time (assuming average walking speed of 5 km/h = 1.4 m/s)
      const timeMinutes = Math.round(totalDistance / (1.4 * 60));
      setEstimatedTime(timeMinutes);

      const jsRouteCode = `window.drawRoute && window.drawRoute(${JSON.stringify(coordinates)});`;
      webViewRef.current?.injectJavaScript(jsRouteCode);
      setStatus('Route updated!');
    } catch (error) {
      console.error('Route fetch error:', error);
      setError('Failed to fetch or draw route');
    } finally {
      setIsRouteLoading(false);
    }
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current) {
        Geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <DestinationSearch
        value={destination}
        onChange={text => {
          setDestination(text);
          filterPOIs(text);
          
          // Stop navigation and clear route if text field is cleared
          if (!text.trim()) {
            if (isNavigating) {
              stopNavigation();
            }
            webViewRef.current?.injectJavaScript('window.clearRoute && window.clearRoute();');
            lastRoute.current = [];
            setDestinationCoords(null);
          }
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
          isLoading={isRouteLoading}
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
      {error && <StatusOverlay status={error} isError={true} onDismiss={() => setError(null)} />}
    </View>
  );
};

export default MapScreen;