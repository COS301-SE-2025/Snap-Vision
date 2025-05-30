import React from 'react';
import { View, Switch, StyleSheet } from 'react-native';
import ThemedText from '../components/atoms/ThemedText';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';

const SettingsScreen = () => {
  const { isDark, toggleTheme } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ThemedText size="lg" weight="bold" style={{ color: colors.text }}>
        Dark Mode
      </ThemedText>
      <Switch value={isDark} onValueChange={toggleTheme} />
    </View>
  );
};

export default SettingsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
