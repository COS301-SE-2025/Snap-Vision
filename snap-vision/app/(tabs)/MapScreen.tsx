import React, { useState } from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import Geolocation from '@react-native-community/geolocation';
import { PermissionsAndroid } from 'react-native';

const MapScreen = () => {
  const [status, setStatus] = useState('Loading map...');
  const [error, setError] = useState<string | null>(null);
const webViewRef = React.useRef<WebView>(null); // provide correct type

  const sendLocationToWebView = (lat: number, lon: number) => {
  const jsCode = `
    if (window.updateUserLocation) {
      window.updateUserLocation(${lat}, ${lon});
    }
  `;
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
            console.error(error);
            setError('Failed to get location');
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
        );
      } else {
        setError('Location permission denied');
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const handleWebViewMessage = (event: any) => {
    try {
      const data = event.nativeEvent.data;
      if (data === 'MAP_READY') {
        setStatus('Map loaded');
        requestLocation(); // Get location when map is ready
      } else {
        const parsed = JSON.parse(data);
        if (parsed.type === 'ERROR') {
          console.error('Map Error:', parsed);
          setError(parsed.message);
        }
      }
    } catch (e) {
      console.log('WebView message:', event.nativeEvent.data);
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{
          uri: Platform.OS === 'android'
            ? 'file:///android_asset/leaflet.html'
            : './leaflet.html'
        }}
        onMessage={handleWebViewMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        mixedContentMode="always"
        originWhitelist={['*']}
        style={styles.webview}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          setError( `WebView Error: ${nativeEvent.description}`);
        }}
      />
      {error && (
        <View style={styles.errorOverlay}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      <View style={styles.statusOverlay}>
        <Text style={styles.statusText}>{status}</Text>
      </View>
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  webview: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  errorOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255,0,0,0.7)',
    padding: 10,
    borderRadius: 5,
  },
  errorText: {
    color: 'white',
  },
  statusOverlay: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  statusText: {
    color: 'white',
  },
});

export default MapScreen;