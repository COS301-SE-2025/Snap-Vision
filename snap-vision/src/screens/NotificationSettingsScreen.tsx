import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import NotificationSettingsContent from '../components/organisms/NotificationSettingsContent';

export default function NotificationSettingsScreen() {
  return (
    <ScrollView style={styles.container}>
      <NotificationSettingsContent />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});