// SettingsScreen.tsx
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import SettingsContent from '../components/organisms/SettingsContent';

export default function SettingsScreen({ navigation }) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={styles.headerText}>User Settings</Text>
      </View>
      <SettingsContent isDark={isDark} navigation={navigation} /> {/* pass it here */}
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
