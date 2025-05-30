import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import AccountSettingsContent from '../components/organisms/AccountSettingsContent';

export default function AccountSettingsScreen() {
  return (
    <ScrollView style={styles.container}>
      <AccountSettingsContent />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});