// src/screens/IndoorSchematicMapScreen.tsx
import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import IndoorSchematicNavScreen from '../components/organisms/IndoorSchematicNavContent';

export default function IndoorSchematicMapScreen() {
  const { theme, isDark } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar
        backgroundColor={colors.background}
        barStyle={isDark ? 'light-content' : 'dark-content'}
      />
      <IndoorSchematicNavScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
});
