// src/screens/MapScreen.tsx
import React, { useState, useRef } from 'react';
import { View, Alert, Share, Text } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { PermissionsAndroid } from 'react-native';
import { WebView as WebViewType } from 'react-native-webview';
import { useEffect } from 'react';
import firestore from '@react-native-firebase/firestore';
import { Modal, FlatList, Pressable } from 'react-native';
import Tts from 'react-native-tts';
import MapWebView from '../components/organisms/MapWebView';
import CrowdReportModal from '../components/molecules/CrowdReportModal';
import StatusOverlay from '../components/atoms/StatusOverlay';
import DestinationSearch from '../components/molecules/DestinationSearch';
import MapActionsPanel from '../components/organisms/MapActionsPanel';
import NavigationPanel from '../components/organisms/NavigationPanel';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import { TextIcon } from '../components/atoms/TextIcon';
import DirectionsModal from '../components/organisms/DirectionsModal';
import TextToSpeech from '../components/molecules/TextToSpeech';
import { useRoute } from '@react-navigation/native';

type MapScreenParams = {
  lat?: string;
  lng?: string;
};

const ROUTING_API_BASE = "http://192.168.0.133:3000"; // <-- Use your correct backend IP here
// emulator: 10.0.2.2
// T home: 192.168.0.133
//L wifi: 192.168.0.127
// T data: 192.168.43.155

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

  // Turn-by-turn state
  const [steps, setSteps] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [shouldStartTTS, setShouldStartTTS] = useState(false);
  const [showDirectionsSheet, setShowDirectionsSheet] = useState(false);
  
  // Navigation state
  const [isNavigating, setIsNavigating] = useState(false);
  const [routeProgress, setRouteProgress] = useState(0);
  const [distanceToDestination, setDistanceToDestination] = useState<number | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);

  const [destinationCoords, setDestinationCoords] = useState<[number, number] | null>(null);
  const [pois, setPOIs] = useState<any[]>([]);
  const [poiSuggestions, setPOISuggestions] = useState<any[]>([]);

  // share location things
  const route = useRoute();
  const params = route.params as MapScreenParams;
  const [hasHandledDeepLink, setHasHandledDeepLink] = useState(false);


  const sendLocationToWebView = (lat: number, lon: number, centerMap = false) => {
    setCurrentLocation({ latitude: lat, longitude: lon });
    const jsCode = `window.updateUserLocation && window.updateUserLocation(${lat}, ${lon}, ${centerMap});`;
    webViewRef.current?.injectJavaScript(jsCode);
    
    // Always update progress when navigating - force this to run
    if (isNavigating && lastRoute.current && lastRoute.current.length > 0) {
      // Add visual feedback that we're updating
      setStatus(`Updating location: ${lat.toFixed(6)}, ${lon.toFixed(6)}`);
      
      // Call updateNavigationProgress directly
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
      const stepsArr = data.features?.[0]?.properties?.segments?.[0]?.steps || [];
      setSteps(stepsArr);
      setCurrentStep(0);
      setShowDirectionsSheet(true);
      
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
    setRouteProgress(0);
    
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
        interval: 1000 // Update every 2 seconds
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

  // Update the updateNavigationProgress function to check for destination arrival
  
  const updateNavigationProgress = (latitude: number, longitude: number) => {
    if (!lastRoute.current || lastRoute.current.length === 0) {
      return;
    }
  
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
  
    // Calculate a more precise progress
    // Consider not just the closest point, but also the percentage between points
    let progressValue;
    
    if (closestPointIndex < lastRoute.current.length - 1) {
      // Calculate distance between current point and next point
      const currentPoint = lastRoute.current[closestPointIndex];
      const nextPoint = lastRoute.current[closestPointIndex + 1];
      
      // Distance from user to closest point
      const distToClosest = getDistanceMeters(
        latitude, longitude,
        currentPoint[1], currentPoint[0]
      );
      
      // Distance from user to next point
      const distToNext = getDistanceMeters(
        latitude, longitude,
        nextPoint[1], nextPoint[0]
      );
      
      // Distance between closest and next point
      const segmentLength = getDistanceMeters(
        currentPoint[1], currentPoint[0],
        nextPoint[1], nextPoint[0]
      );
      
      // If we're between two points, calculate the fractional position
      if (distToClosest + distToNext <= segmentLength * 1.2) { // Allow some margin
        const segmentProgress = distToClosest / (distToClosest + distToNext);
        const fractionalIndex = closestPointIndex + segmentProgress;
        progressValue = (fractionalIndex / (lastRoute.current.length - 1)) * 100;
      } else {
        // Just use the closest point index
        progressValue = (closestPointIndex / (lastRoute.current.length - 1)) * 100;
      }
    } else {
      // At the last point
      progressValue = 100;
    }
    
    // Update progress with a more precise value
    const newProgress = Math.min(Math.round(progressValue), 100);
    setRouteProgress(newProgress);
    
    // Check if we've reached the destination point
    const destinationPoint = lastRoute.current[lastRoute.current.length - 1];
    const distanceToEnd = getDistanceMeters(
      latitude, longitude,
      destinationPoint[1], destinationPoint[0]
    );
    
    // Update distance to destination
    setDistanceToDestination(distanceToEnd);
    
    // Keep status update brief to avoid UI clutter
    setStatus(`Progress: ${newProgress}%`);
  
    // Update route progress visually
    if (webViewRef.current) {
      const jsProgressCode = `
        if (window.updateRouteProgress) {
          window.updateRouteProgress(${closestPointIndex}, ${progressValue / 100});
        }
      `;
      webViewRef.current.injectJavaScript(jsProgressCode);
    }
  
    // Check destination arrival based on either:
    // 1. Progress is 100%
    // 2. Distance to destination is less than 20 meters
    if (newProgress >= 100 || distanceToEnd < 20) {
      destinationReached();
    }
  };
  
  // Add this new function to handle reaching the destination
  const destinationReached = () => {
    if (!isNavigating) return; // Only handle if actually navigating
    
    // Stop navigation
    stopNavigation();
    
    // Show destination reached message
    setStatus('You have reached your destination!');
    
    // Ensure progress is set to 100%
    setRouteProgress(100);
    
    // Speak the arrival message if voice is enabled
    if (isVoiceEnabled) {
      Tts.stop();
      setTimeout(() => {
        Tts.speak('You have reached your destination');
      }, 500);
    }
    
    // Optional: Show a congratulatory alert
    Alert.alert(
      'Destination Reached',
      'You have arrived at your destination!',
      [{ text: 'OK', onPress: () => console.log('Destination reached acknowledged') }]
    );
  };

  // Fetch POIs from Firestoreconst [showDirectionsSheet, setShowDirectionsSheet] = useState(false);

useEffect(() => {
  if (isNavigating && shouldStartTTS && steps.length > 0 && currentStep < steps.length) {
    const instruction = steps[currentStep]?.instruction;
    if (instruction) {
      console.log('TTS should speak:', instruction);
      try {
        Tts.stop();
        setTimeout(() => {
          Tts.speak(instruction);
        }, 500);
      } catch (e) {
        console.error('TTS Error:', e);
        setError('Voice guidance is not available.');
      }
    }
  }
}, [isNavigating, shouldStartTTS, steps, currentStep]);

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
    setHasHandledDeepLink(true); // Prevent deep link from overriding
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
  
  // Handle deep link params if they exist
  useEffect(() => {
    // Only process params once and if they exist
    if (!hasHandledDeepLink && params && params.lat && params.lng && currentLocation) {
      const lat = parseFloat(params.lat);
      const lng = parseFloat(params.lng);
      setDestination("Friend's Location");
      setDestinationCoords([lng, lat]);
      fetchRoute([lng, lat]);
      setHasHandledDeepLink(true);
    }
  }, [params, currentLocation, hasHandledDeepLink]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current) {
        Geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

    // Add this new useEffect after your other useEffects
  useEffect(() => {
    // Only run when navigating
    if (!isNavigating || !currentLocation) return;
    
    // Force update progress every 2 seconds
    const progressInterval = setInterval(() => {
      if (currentLocation && lastRoute.current && lastRoute.current.length > 0) {
        updateNavigationProgress(currentLocation.latitude, currentLocation.longitude);
      }
    }, 500);
    
    return () => clearInterval(progressInterval);
  }, [isNavigating, currentLocation]);


  // Dynamically request location updates every 3 seconds
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
          { enableHighAccuracy: true, distanceFilter: 0, interval: 3000, fastestInterval: 3000 }
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


 return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <DirectionsModal
        visible={showDirectionsSheet}
        onClose={() => setShowDirectionsSheet(false)}
        onStart={() => {
          setIsNavigating(true);
          setShouldStartTTS(true);
          setCurrentStep(0);
          setShowDirectionsSheet(false);
          console.log('Navigation started');
        }}
        destination={destination}
        steps={steps}
        currentStep={currentStep}
      />
      {/* Rest of your components remain the same */}
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
  isVoiceEnabled={isVoiceEnabled}
  onToggleVoice={() => setIsVoiceEnabled(!isVoiceEnabled)}
  currentInstruction={steps[currentStep]?.instruction}
  onSpeakingChange={setIsSpeaking}
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

     {isNavigating && (
  <>
 
    
    <Pressable
      style={{
        position: 'absolute',
        bottom: 171,
        right: 22,
        backgroundColor: colors.primary,
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 4,
      }}
      onPress={() => setShowDirectionsSheet(true)}
    >
      <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 24 }}>🧭</Text>
    </Pressable>
  </>
)}
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