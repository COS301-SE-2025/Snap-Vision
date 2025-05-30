import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

export default function DarkModeToggle() {
  const { isDark, toggleTheme } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.primary }]}>Enable Dark Mode</Text>
      <Switch value={isDark} onValueChange={toggleTheme} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
  },
});