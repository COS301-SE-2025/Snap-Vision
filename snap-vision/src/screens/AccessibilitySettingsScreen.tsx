import React from 'react';
import { StyleSheet, SafeAreaView } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import AccessibilitySettingsContent from '../components/organisms/AccessibilitySettingsContent';

import type { StackNavigationProp } from '@react-navigation/stack';

type AccessibilitySettingsScreenProps = {
  navigation: StackNavigationProp<any>;
};

export default function AccessibilitySettingsScreen({
  navigation,
}: AccessibilitySettingsScreenProps) {
  const { theme, isDark } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <AccessibilitySettingsContent />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    justifyContent: 'center',
  },
  headerText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
