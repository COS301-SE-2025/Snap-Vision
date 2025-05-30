import React from 'react';
import { View, StyleSheet } from 'react-native';
import ThemedText from '../components/atoms/ThemedText';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';

const AchievementsScreen = () => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ThemedText size="xl" weight="bold" style={{ color: colors.text }}>
        Achievements
      </ThemedText>
    </View>
  );
};

export default AchievementsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
