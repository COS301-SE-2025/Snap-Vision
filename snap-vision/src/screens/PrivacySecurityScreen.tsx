import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import PrivacySecurityContent from '../components/organisms/PrivacySecurityContent';

export default function PrivacySecurityScreen() {
  return (
    <ScrollView style={styles.container}>
      <PrivacySecurityContent />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});