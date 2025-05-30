import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import SettingsHeader from '../molecules/SettingsHeader';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

export default function SupportContent() {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <SettingsHeader title="Support" />
      <Text style={{ color: colors.primary, padding: 20 }}>Support information will be shown here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});