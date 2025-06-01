import React from 'react';
import { View, StyleSheet } from 'react-native';
import SettingsHeader from '../molecules/SettingsHeader';
import PrivacySettings from '../molecules/PrivacySettings';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

export default function PrivacySecurityContent() {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <SettingsHeader title="Privacy & Security" />
      <PrivacySettings />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
});