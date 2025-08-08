// src/screens/LiveTrackingScreen.tsx

import React, { useState, useRef } from 'react';
import { View, Text, Dimensions, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import IndoorPositionDot from '../components/atoms/IndoorPositionDot';
import { useIndoorPosition } from '../hooks/useIndoorPosition';

export default function LiveTrackingScreen() {
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height * 0.8;

  // Hardcoded for testing; you can pass these as route params or use context
  const locationId = 'up-campus';
  const buildingId = 'RsHiMzNsHcXXZSHEBNU4';
  const floorId = '1';

  const { position, loading, error } = useIndoorPosition(locationId, buildingId, floorId);

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>Live Indoor Tracking</Text>
      <View style={[styles.mapArea, { width: screenWidth, height: screenHeight }]}>
        {loading && <ActivityIndicator size="large" color="gray" />}
        {error && <Text style={styles.error}>{error}</Text>}

        {position && (
          <IndoorPositionDot
            x={position.x}
            y={position.y}
            containerWidth={screenWidth}
            containerHeight={screenHeight}
          />
        )}
      </View>
      <Text style={styles.label}>
        {position ? `x: ${position.x.toFixed(2)}, y: ${position.y.toFixed(2)}` : 'No position yet'}
        console.log("Current indoor position:", position);

      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 20,
    color: '#fff',
  },
  mapArea: {
    backgroundColor: '#222',
    borderRadius: 12,
    marginTop: 20,
    overflow: 'hidden',
  },
  label: {
    marginTop: 10,
    fontSize: 16,
    color: '#ccc',
  },
  error: {
    color: 'red',
    marginTop: 10,
  },
});
