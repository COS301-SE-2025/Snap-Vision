import React, { useState } from 'react';
import { View, StyleSheet, Text, Platform, TouchableOpacity, Share, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import Geolocation from '@react-native-community/geolocation';
import { PermissionsAndroid } from 'react-native';

const MapScreen = () => {
  const [status, setStatus] = useState('Loading map...');
  const [error, setError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const webViewRef = React.useRef<WebView>(null);

  const sendLocationToWebView = (lat: number, lon: number) => {
    // Store the current location for sharing
    setCurrentLocation({latitude: lat, longitude: lon});
    
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

  // Share location function
  const shareLocation = async () => {
    if (!currentLocation) {
      Alert.alert('No Location', 'Your location is not available yet.');
      return;
    }

    try {
      // Create Google Maps URL with current location
      const url = `https://www.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`;
      
      // Create a message to share
      const message = `Check out my location: ${url}`;
      
      const result = await Share.share({
        message: message,
        url: url, // iOS only
        title: 'Share Location'
      });

      if (result.action === Share.sharedAction) {
        setStatus('Location shared successfully');
      } else if (result.action === Share.dismissedAction) {
        setStatus('Share cancelled');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      setError('Failed to share location');
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
          setError(`WebView Error: ${nativeEvent.description}`);
        }}
      />
      
      {/* Share button - only shows when location is available */}
      {currentLocation && (
        <TouchableOpacity 
          style={styles.shareButton}
          onPress={shareLocation}
          activeOpacity={0.7}
        >
          <Text style={styles.shareButtonText}>SHARE LOCATION</Text>
        </TouchableOpacity>
      )}
      
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
  shareButton: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    backgroundColor: '#007AFF',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  shareButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
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