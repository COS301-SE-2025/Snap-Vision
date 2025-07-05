import React from 'react';
import { View, StyleSheet, Text, Alert } from 'react-native';
import { useAccessibility } from '../../context/AccessibilityContext';
import { getThemeColors } from '../../theme';
import SettingsToggleItem from '../molecules/SettingsToggleItem';

interface Props {
  isDark: boolean;
  navigation: any;
}

export default function AccessibilitySettingsContent({ isDark }: Props) {
  const colors = getThemeColors(isDark);
  const { isHapticFeedbackEnabled, setHapticFeedbackEnabled, loading } = useAccessibility();

  const handleHapticFeedbackToggle = async (enabled: boolean) => {
    try {
      await setHapticFeedbackEnabled(enabled);
    } catch {
      Alert.alert('Error', 'Failed to save haptic feedback setting. Please try again.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.text }]}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Touch & Vibration</Text>
        <SettingsToggleItem
          icon="pulse"
          label="Haptic Feedback"
          description="Enable vibration feedback for navigation events and interactions"
          value={isHapticFeedbackEnabled}
          onToggle={handleHapticFeedbackToggle}
          color={colors.primary}
          textColor={colors.text}
          descriptionColor={colors.secondary}
        />
      </View>

      <View style={styles.infoSection}>
        <Text style={[styles.infoText, { color: colors.secondary }]}>
          Haptic feedback provides tactile confirmation of your actions and navigation events to
          help make the app more accessible and easier to use.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  infoSection: {
    marginTop: 24,
    padding: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 40,
  },
});
