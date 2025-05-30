import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import SettingsContent from '../components/organisms/SettingsContent';

export default function UserSettingsScreen() {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: '#A75C00' }]}>
        <Text style={styles.headerText}>‹ User Settings</Text>
      </View>
      <SettingsContent isDark={isDark} />
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
