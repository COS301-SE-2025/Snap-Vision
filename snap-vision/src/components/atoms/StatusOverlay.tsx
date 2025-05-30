
// src/components/atoms/StatusOverlay.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function StatusOverlay({ status }: { status: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
  },
  text: {
    color: 'white',
  },
});
