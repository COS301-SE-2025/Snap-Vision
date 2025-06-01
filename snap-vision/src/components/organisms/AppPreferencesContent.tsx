import React from 'react';
import { View, StyleSheet } from 'react-native';
import SettingsHeader from '../molecules/SettingsHeader';
import DarkModeToggle from '../molecules/DarkModeToggle';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

export default function AppPreferencesContent() {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <SettingsHeader title="App Preferences" />
      <DarkModeToggle />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
});