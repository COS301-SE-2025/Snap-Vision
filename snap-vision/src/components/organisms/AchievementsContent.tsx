import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import SettingsHeader from '../molecules/SettingsHeader';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

export default function AchievementsContent() {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <SettingsHeader title="Achievements" />
      <Text style={{ color: colors.primary, padding: 20 }}>Achievements will be shown here.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
});