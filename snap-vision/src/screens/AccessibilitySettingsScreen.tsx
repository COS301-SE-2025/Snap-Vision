import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
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
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={styles.headerText}>Accessibility Settings</Text>
      </View>
      <AccessibilitySettingsContent isDark={isDark} navigation={navigation} />
    </ScrollView>
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
