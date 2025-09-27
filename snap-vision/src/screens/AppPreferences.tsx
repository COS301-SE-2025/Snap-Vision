import React from 'react';
import { ScrollView, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import AppPreferencesContent from '../components/organisms/AppPreferencesContent';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';

export default function AppPreferencesScreen() {
  const { theme, isDark } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar
        backgroundColor={colors.background}
        barStyle={isDark ? 'light-content' : 'dark-content'}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ backgroundColor: colors.background, flexGrow: 1 }}
      >
        <AppPreferencesContent />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
});
