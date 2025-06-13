// src/screens/MapScreen.tsx
import React, { useState, useRef } from 'react';
import { View, Alert, Share, StyleSheet, TextInput, TouchableOpacity, Text} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { PermissionsAndroid } from 'react-native';
import { WebView as WebViewType } from 'react-native-webview';
import { useEffect } from 'react';
//import { MAPTILER_API_KEY } from '@env'; // assumes you're using `react-native-dotenv`
import firestore from '@react-native-firebase/firestore';

// Add this type declaration at the top-level of project (e.g., src/types/env.d.ts):
// declare module '@env' {
//   export const MAPTILER_API_KEY: string;
// }


import { Modal, FlatList, Pressable } from 'react-native';
import Tts from 'react-native-tts';

import MapWebView from '../components/organisms/MapWebView';
import CrowdReportModal from '../components/molecules/CrowdReportModal';
import StatusOverlay from '../components/atoms/StatusOverlay';
import DestinationSearch from '../components/molecules/DestinationSearch';
import MapActionsPanel from '../components/organisms/MapActionsPanel';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import { TextIcon } from '../components/atoms/TextIcon';
import DirectionsModal from '../components/organisms/DirectionsModal';


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

  // Turn-by-turn state
  const [steps, setSteps] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState(0);

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
      const stepsArr = data.features?.[0]?.properties?.segments?.[0]?.steps || [];
      setSteps(stepsArr);
      setCurrentStep(0);
      setShowDirectionsSheet(true);
    } catch (error) {
      console.error('Route fetch error:', error);
      setError('Failed to fetch or draw route');
    }
  };

  fetchRoute();
};


const [destinationCoords, setDestinationCoords] = useState<[number, number] | null>(null);
const [pois, setPOIs] = useState<any[]>([]);
const [showDirectionsSheet, setShowDirectionsSheet] = useState(false);
const [isNavigating, setIsNavigating] = useState(false);
const [shouldStartTTS, setShouldStartTTS] = useState(false);

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
        }}
        onSearch={handleDestinationSearch}
        suggestions={poiSuggestions}
        onSelectSuggestion={handleSelectPOI}
      />
      
      <View style={{ flex: 1 }}>
        <MapWebView ref={webViewRef} onMessage={handleWebViewMessage} />
      </View>

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
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
    }}
    onPress={() => setShowDirectionsSheet(true)}
    accessibilityLabel="Show Directions"
  >
    <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 24 }}>🧭</Text>
  </Pressable>
)} 

      <CrowdReportModal
        visible={showCrowdPopup}
        selectedDensity={selectedDensity}
        onChangeDensity={setSelectedDensity}
        onSubmit={submitCrowdReport}
        onCancel={() => setShowCrowdPopup(false)}
      />

      {status && <StatusOverlay status={status} />}
    </View>
  );
};

export default MapScreen;