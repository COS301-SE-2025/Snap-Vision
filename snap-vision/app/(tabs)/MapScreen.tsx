import React, { useState } from 'react';
import { View, StyleSheet, Text, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

const MapScreen = () => {
  const [status, setStatus] = useState('Loading map...');
  const [error, setError] = useState<string | null>(null);

  const handleWebViewMessage = (event: any) => {
    try {
      const data = event.nativeEvent.data;
      if (data === 'MAP_READY') {
        setStatus('Map loaded');
      } else {
        const parsed = JSON.parse(data);
        if (parsed.type === 'ERROR') {
          console.error('Map Error:', parsed);
          setError(parsed.message);
        }
      }
    } catch (e) {
      console.log('WebView message:', data);
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: Platform.OS === 'android' 
          ? 'file:///android_asset/leaflet.html' 
          : './leaflet.html' }}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mixedContentMode="always"
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        onMessage={handleWebViewMessage}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          setError(`WebView Error: ${nativeEvent.description}`);
        }}
        style={styles.webview}
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