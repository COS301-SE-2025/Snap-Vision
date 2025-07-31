// Test file to verify AR implementation
// Run this in a React Native screen to test the AR components

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import SimpleAROverlay from '../components/organisms/SimpleAROverlay';
import { useCompass } from '../hooks/useCompass';

export default function ARTestScreen() {
  const [showAR, setShowAR] = useState(false);
  const deviceHeading = useCompass();

  // Mock indoor coordinates (these should be in your building's coordinate system)
  const mockCurrentLocation = { x: 0, y: 0 }; // Starting point
  const mockDestination = { x: 100, y: 50 }; // Northeast direction

  const calculateBearing = () => {
    const dx = mockDestination.x - mockCurrentLocation.x;
    const dy = mockDestination.y - mockCurrentLocation.y;
    return Math.atan2(dx, dy) * (180 / Math.PI);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>AR Navigation Test</Text>

      <View style={styles.infoContainer}>
        <Text style={styles.info}>Device Heading: {Math.round(deviceHeading)}°</Text>
        <Text style={styles.info}>Target Bearing: {Math.round(calculateBearing())}°</Text>
        <Text style={styles.info}>AR Status: {showAR ? '✅ Active' : '❌ Inactive'}</Text>
      </View>

      <TouchableOpacity
        style={[styles.button, { backgroundColor: showAR ? '#ff4444' : '#44ff44' }]}
        onPress={() => setShowAR(!showAR)}
      >
        <Text style={styles.buttonText}>{showAR ? 'Hide AR' : 'Show AR'}</Text>
      </TouchableOpacity>

      {showAR && (
        <View style={styles.arContainer}>
          <SimpleAROverlay
            currentLocation={mockCurrentLocation}
            destinationCoords={mockDestination}
            deviceHeading={deviceHeading}
            navigationSteps={[]}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f0f0f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  infoContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  info: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 5,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  arContainer: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
});
