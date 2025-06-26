import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

export default function PrivacySettings() {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  const [locationEnabled, setLocationEnabled] = useState(true);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);

  // Better contrast colors for the switch
  const trackColorOff = isDark ? '#444444' : '#cccccc';
  const trackColorOn = isDark ? '#61dafb' : colors.primary; // Light blue for dark mode
  const thumbColor = isDark ? '#ffffff' : '#ffffff';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.introText, { color: colors.text }]}>
        Manage your privacy and security preferences here.
      </Text>

      <View style={styles.settingsSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Privacy Settings</Text>

        <View style={[styles.row, { borderBottomColor: colors.border || '#e1e1e1' }]}>
          <Text style={[styles.label, { color: colors.text }]}>Location Services</Text>
          <Switch
            value={locationEnabled}
            onValueChange={setLocationEnabled}
            trackColor={{ false: trackColorOff, true: trackColorOn }}
            thumbColor={thumbColor}
            ios_backgroundColor={trackColorOff}
          />
        </View>

        <View style={[styles.row, { borderBottomColor: colors.border || '#e1e1e1' }]}>
          <Text style={[styles.label, { color: colors.text }]}>Analytics</Text>
          <Switch
            value={analyticsEnabled}
            onValueChange={setAnalyticsEnabled}
            trackColor={{ false: trackColorOff, true: trackColorOn }}
            thumbColor={thumbColor}
            ios_backgroundColor={trackColorOff}
          />
        </View>
      </View>

      <View style={styles.settingsSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Security Settings</Text>

        <View style={[styles.row, { borderBottomColor: colors.border || '#e1e1e1' }]}>
          <Text style={[styles.label, { color: colors.text }]}>Biometric Authentication</Text>
          <Switch
            value={biometricsEnabled}
            onValueChange={setBiometricsEnabled}
            trackColor={{ false: trackColorOff, true: trackColorOn }}
            thumbColor={thumbColor}
            ios_backgroundColor={trackColorOff}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  introText: {
    fontSize: 16,
    marginBottom: 24,
  },
  settingsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  label: {
    fontSize: 16,
  },
});
