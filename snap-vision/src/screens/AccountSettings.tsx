// AccountSettingsScreen.tsx
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import AccountSettingsContent from '../components/organisms/AccountSettingsContent';

import { StackNavigationProp } from '@react-navigation/stack';

type AccountSettingsScreenProps = {
  navigation: StackNavigationProp<any>;
};

export default function AccountSettingsScreen({ navigation }: AccountSettingsScreenProps) {
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
