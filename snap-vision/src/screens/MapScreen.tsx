// src/screens/MapScreen.tsx
import React, { useState, useRef } from 'react';
import { View, Alert, Share, StyleSheet, TextInput, TouchableOpacity, Text } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { PermissionsAndroid } from 'react-native';
import { WebView as WebViewType } from 'react-native-webview';

import MapWebView from '../components/organisms/MapWebView';
import CrowdReportModal from '../components/molecules/CrowdReportModal';
import StatusOverlay from '../components/atoms/StatusOverlay';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';

// You'll need to install react-native-vector-icons or use a similar icon library
// For now, using text-based icons as placeholders
const ShareIcon = () => <Text style={styles.iconText}>📍</Text>;
const ReportIcon = () => <Text style={styles.iconText}>⚠️</Text>;
const SearchIcon = () => <Text style={styles.iconText}>🔍</Text>;

const MapScreen = () => {
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

  const handleDestinationSearch = () => {
    if (destination.trim()) {
      // Implement destination search logic here
      console.log('Searching for:', destination);
      // You can integrate with Google Places API or similar
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Destination Section */}
      <View style={[styles.destinationContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.destinationLabel, { color: colors.text }]}>Where to?</Text>
        <View style={[styles.searchContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            value={destination}
            onChangeText={setDestination}
            placeholder="Search destination..."
            placeholderTextColor={isDark ? '#999' : '#666'}
          />
          <TouchableOpacity 
            style={[styles.searchButton, { backgroundColor: colors.primary }]}
            onPress={handleDestinationSearch}
          >
            <SearchIcon />
          </TouchableOpacity>
        </View>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        <MapWebView ref={webViewRef} onMessage={handleWebViewMessage} />
      </View>

      {/* Action Buttons */}
      {currentLocation && (
        <View style={styles.actionButtonsContainer}>
          {/* Share Location Button */}
          <View style={styles.buttonWithTooltip}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={shareLocation}
              onPressIn={() => setShowShareTooltip(true)}
              onPressOut={() => setShowShareTooltip(false)}
            >
              <ShareIcon />
            </TouchableOpacity>
            {showShareTooltip && (
              <View style={[styles.tooltip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.tooltipText, { color: colors.text }]}>Share Location</Text>
              </View>
            )}
          </View>

          {/* Report Crowd Button */}
          <View style={styles.buttonWithTooltip}>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowCrowdPopup(true)}
              onPressIn={() => setShowReportTooltip(true)}
              onPressOut={() => setShowReportTooltip(false)}
            >
              <ReportIcon />
            </TouchableOpacity>
            {showReportTooltip && (
              <View style={[styles.tooltip, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.tooltipText, { color: colors.text }]}>Report Crowds</Text>
              </View>
            )}
          </View>
        </View>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  destinationContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    zIndex: 1000,
  },
  destinationLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
  },
  searchButton: {
    paddingHorizontal: 15,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapContainer: {
    flex: 1,
  },
  actionButtonsContainer: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    flexDirection: 'column',
    gap: 15,
  },
  buttonWithTooltip: {
    position: 'relative',
    alignItems: 'center',
  },
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  tooltip: {
    position: 'absolute',
    right: 65,
    top: 15,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  tooltipText: {
    fontSize: 14,
    fontWeight: '500',
    whiteSpace: 'nowrap',
  },
  iconText: {
    fontSize: 24,
  },
});

export default MapScreen;