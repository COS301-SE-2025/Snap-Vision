// src/screens/MapScreen.tsx
import React, { useState, useRef } from 'react';
import { View, Alert, Share, StyleSheet, TextInput, TouchableOpacity, Text} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { PermissionsAndroid } from 'react-native';
import { WebView as WebViewType } from 'react-native-webview';

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
  if (!destination.trim()) {
    setError('Please enter a destination');
    return;
  }

  if (!currentLocation) {
    setError('Current location not available yet');
    return;
  }

  const fetchRoute = async () => {
    try {
      const start = `${currentLocation.longitude},${currentLocation.latitude}`;
      const end = `${currentLocation.longitude + 0.005},${currentLocation.latitude + 0.002}`;

      console.log('📍 Starting fetch from:', start, 'to:', end);

      const response = await fetch(`http://192.168.56.1:3000/api/directions?start=${start}&end=${end}`);
      const data = await response.json();

      console.log('📦 Raw route response:', data);

      const coordinates = data.features?.[0]?.geometry?.coordinates;

      if (!coordinates || coordinates.length === 0) {
        throw new Error('No coordinates in response');
      }

      lastRoute.current = coordinates; // ✅ Save route here

      const jsRouteCode = `window.drawRoute && window.drawRoute(${JSON.stringify(coordinates)});`;
      console.log('🧠 Injecting route JS:', jsRouteCode);

      webViewRef.current?.injectJavaScript(jsRouteCode);
      setStatus('Route drawn!');
    } catch (error) {
      console.error('❌ Route error:', error);
      setError('Failed to fetch or draw route');
    }
  };

  console.log('🔵 Destination search initiated');
  fetchRoute();
};

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <DestinationSearch
        value={destination}
        onChange={setDestination}
        onSearch={handleDestinationSearch}
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