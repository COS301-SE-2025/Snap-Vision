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
    top: 80, 
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    zIndex: 1002, 
  },
  text: {
    color: 'white',
  },
});
