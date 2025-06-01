import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import SupportContent from '../components/organisms/SupportContent';

export default function SupportScreen() {
  return (
    <ScrollView style={styles.container}>
      <SupportContent />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});