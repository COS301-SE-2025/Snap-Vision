// src/components/molecules/MapButton.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function MapButton() {
  return (
    <TouchableOpacity style={styles.mapButton}>
      <Text style={styles.mapButtonText}>Go to maps</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  mapButton: {
    backgroundColor: '#245f68',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 25,
  },
  mapButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
