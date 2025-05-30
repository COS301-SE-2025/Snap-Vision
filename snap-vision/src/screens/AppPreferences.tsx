import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import AppPreferencesContent from '../components/organisms/AppPreferencesContent';

export default function AppPreferencesScreen() {
  return (
    <ScrollView style={styles.container}>
      <AppPreferencesContent />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});