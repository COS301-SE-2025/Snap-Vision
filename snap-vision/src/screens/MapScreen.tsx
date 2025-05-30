// src/screens/MapScreen.tsx
import React, { useState, useRef } from 'react';
import { View, Alert, Share } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { PermissionsAndroid } from 'react-native';
import { WebView as WebViewType } from 'react-native-webview';

import MapWebView from '../components/organisms/MapWebView';
import ShareButton from '../components/molecules/ShareButton';
import ReportButton from '../components/molecules/ReportButton';
import CrowdReportModal from '../components/molecules/CrowdReportModal';
import StatusOverlay from '../components/atoms/StatusOverlay';

const MapScreen = () => {
  const [status, setStatus] = useState('Loading map...');
  const [error, setError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [showCrowdPopup, setShowCrowdPopup] = useState(false);
  const [selectedDensity, setSelectedDensity] = useState('moderate');
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

    console.log('🔴 Reporting density:', selectedDensity, currentLocation);
    console.log('🔴 WebView ref exists?', !!webViewRef.current);
    const jsCrowdCode = `window.updateCrowdDensity && window.updateCrowdDensity(${currentLocation.latitude}, ${currentLocation.longitude}, '${selectedDensity}');`;
    webViewRef.current?.injectJavaScript(jsCrowdCode);

    setShowCrowdPopup(false);
    setStatus(`Crowd density reported: ${selectedDensity}`);
  };

  return (
    <View style={{ flex: 1 }}>
      <MapWebView ref={webViewRef} onMessage={handleWebViewMessage} />

      {currentLocation && (
        <>
          <ShareButton onPress={shareLocation} />
          <ReportButton onPress={() => setShowCrowdPopup(true)} />
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
    </View>
  );
};

export default MapScreen;
