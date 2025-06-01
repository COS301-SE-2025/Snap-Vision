import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function PrivacySettings() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Manage your privacy and security preferences here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  text: {
    fontSize: 16,
  },
});