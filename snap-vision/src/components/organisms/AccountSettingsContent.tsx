import React from 'react';
import { View, StyleSheet } from 'react-native';
import SettingsHeader from '../molecules/Settingsheader';
import AccountDetails from '../molecules/AccountDetails';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

export default function AccountSettingsContent() {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <SettingsHeader title="Account Settings" />
      <AccountDetails />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});