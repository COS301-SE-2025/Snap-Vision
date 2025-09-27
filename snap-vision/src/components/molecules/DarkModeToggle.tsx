import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import { useBadges } from '../../context/BadgeContext';

export default function DarkModeToggle() {
  const { isDark, toggleTheme } = useTheme();
  const colors = getThemeColors(isDark);
  const { unlock } = useBadges();

  const handleToggleTheme = () => {
    toggleTheme();
    // Unlock the switch-themes badge when user toggles theme for the first time
    unlock('switch-themes').catch(() => {
      // Ignore errors - badge might already be unlocked
    });
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.primary }]}>Enable Dark Mode</Text>
      <Switch value={isDark} onValueChange={handleToggleTheme} />
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
