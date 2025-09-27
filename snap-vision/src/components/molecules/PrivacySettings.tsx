import React, { useState } from 'react';
import { View, Text, StyleSheet, Switch, ScrollView } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

export default function PrivacySettings() {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  const [locationEnabled, setLocationEnabled] = useState(true);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);

  const trackColorOff = isDark ? '#444444' : '#cccccc';
  const trackColorOn = isDark ? '#61dafb' : colors.primary; 
  const thumbColor = isDark ? '#ffffff' : '#ffffff';

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Privacy Policy Header */}
      <Text style={[styles.headerText, { color: colors.text }]}>
        Privacy & Data Protection
      </Text>
      
      <Text style={[styles.introText, { color: colors.secondary }]}>
        Snap-Vision is committed to protecting your privacy. This explains how we collect, use, and safeguard your information.
      </Text>

      {/* Privacy Controls */}
      {/* <View style={styles.settingsSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Privacy Controls</Text>

        <View style={[styles.row, { borderBottomColor: colors.border || '#e1e1e1' }]}>
          <View style={styles.labelContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Location Services</Text>
            <Text style={[styles.sublabel, { color: colors.text, opacity: 0.7 }]}>
              GPS and Wi-Fi positioning for navigation
            </Text>
          </View>
          <Switch
            value={locationEnabled}
            onValueChange={setLocationEnabled}
            trackColor={{ false: trackColorOff, true: trackColorOn }}
            thumbColor={thumbColor}
            ios_backgroundColor={trackColorOff}
          />
        </View>

        <View style={[styles.row, { borderBottomColor: colors.border || '#e1e1e1' }]}>
          <View style={styles.labelContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Usage Analytics</Text>
            <Text style={[styles.sublabel, { color: colors.text, opacity: 0.7 }]}>
              Help improve app performance
            </Text>
          </View>
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
          <View style={styles.labelContainer}>
            <Text style={[styles.label, { color: colors.text }]}>Biometric Authentication</Text>
            <Text style={[styles.sublabel, { color: colors.text, opacity: 0.7 }]}>
              Use fingerprint or face unlock
            </Text>
          </View>
          <Switch
            value={biometricsEnabled}
            onValueChange={setBiometricsEnabled}
            trackColor={{ false: trackColorOff, true: trackColorOn }}
            thumbColor={thumbColor}
            ios_backgroundColor={trackColorOff}
          />
        </View>
      </View> */}

      {/* Information We Collect Section */}
      <View style={styles.infoSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Information We Collect</Text>
        
        <Text style={[styles.subSectionTitle, { color: colors.text }]}>Location Information</Text>
        <Text style={[styles.bulletPoint, { color: colors.secondary }]}>
          • GPS Location Data for accurate navigation{'\n'}
          • Wi-Fi and Bluetooth signals for indoor positioning{'\n'}
          • Navigation routes (processed temporarily)
        </Text>

        <Text style={[styles.subSectionTitle, { color: colors.text }]}>Camera & Media</Text>
        <Text style={[styles.bulletPoint, { color: colors.secondary }]}>
          • QR code scanning for location identification{'\n'}
          • Augmented Reality navigation features{'\n'}
        </Text>

        <Text style={[styles.subSectionTitle, { color: colors.text }]}>Device Information</Text>
        <Text style={[styles.bulletPoint, { color: colors.secondary }]}>
          • Device sensors (compass, accelerometer){'\n'}
          • Network connectivity for map data{'\n'}
          • Performance optimization data
        </Text>

        <Text style={[styles.subSectionTitle, { color: colors.text }]}>Usage Analytics</Text>
        <Text style={[styles.bulletPoint, { color: colors.secondary }]}>
          • App usage patterns (anonymized){'\n'}
          • Performance metrics for improvements{'\n'}
          • Feature usage to enhance experience
        </Text>
      </View>

      {/* Data Protection Section */}
      <View style={styles.infoSection}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Data Protection</Text>
        
        <View style={styles.highlightBox}>
          <Text style={[styles.highlightText, { color: colors.text }]}>
            ✓ We DO NOT permanently save your location{'\n'}
            ✓ All data transmission is encrypted{'\n'}
            ✓ You control all privacy settings
          </Text>
        </View>
      </View>

      {/* Bottom spacing */}
      <View style={styles.bottomSpacing} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  introText: {
    fontSize: 16,
    marginBottom: 24,
    lineHeight: 22,
  },
  settingsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    marginTop: 8,
  },
  subSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  labelContainer: {
    flex: 1,
    marginRight: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
  },
  sublabel: {
    fontSize: 14,
    marginTop: 2,
  },
  infoSection: {
    marginBottom: 24,
  },
  bulletPoint: {
    fontSize: 15,
    lineHeight: 24,
    marginBottom: 12,
  },
  highlightBox: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 122, 255, 0.2)',
  },
  highlightText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  bottomSpacing: {
    height: 40,
  },
});
