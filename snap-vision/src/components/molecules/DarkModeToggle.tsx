import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import { useBadges } from '../../context/BadgeContext';

export default function DarkModeToggle() {
  const { theme, baseTheme, isDark, toggleDarkMode } = useTheme();
  const colors = getThemeColors(theme);
  const { unlock } = useBadges();

  const handleToggleDarkMode = () => {
    toggleDarkMode();
    // Unlock the switch-themes badge when user toggles dark mode for the first time
    unlock('switch-themes').catch(() => {
      // Ignore errors - badge might already be unlocked
    });
  };

  // Get theme display name for the label
  const getThemeDisplayName = () => {
    switch (baseTheme) {
      case 'light': return '';
      case 'pink': return ' Pink';
      case 'ocean': return ' Ocean';
      case 'forest': return ' Forest';
      default: return '';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.primary }]}>
        Enable{getThemeDisplayName()} Dark Mode
      </Text>
      <Switch value={isDark} onValueChange={handleToggleDarkMode} />
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
