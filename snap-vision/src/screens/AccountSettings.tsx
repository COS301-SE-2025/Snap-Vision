// AccountSettingsScreen.tsx
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import AccountSettingsContent from '../components/organisms/AccountSettingsContent';

export default function AccountSettingsScreen({ navigation }) {
  return (
    <ScrollView style={styles.container}>
      <AccountSettingsContent navigation={navigation} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
