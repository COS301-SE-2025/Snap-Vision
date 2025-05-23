import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { WebView } from 'react-native-webview';

const MapScreen: React.FC = () => {
  return (
    <WebView
      originWhitelist={['*']}
      source={{ uri: 'file:///android_asset/leaflet.html' }}
      style={styles.webview}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      allowFileAccess={true}
    />
  );
};

const styles = StyleSheet.create({
  webview: {
    flex: 1,
  },
});

export default MapScreen;