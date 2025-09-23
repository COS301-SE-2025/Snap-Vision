import React, { useState } from 'react';
import { View, StyleSheet, Text, ScrollView } from 'react-native';
import { useAccessibility } from '../../context/AccessibilityContext';
import { getThemeColors } from '../../theme';
import SettingsToggleItem from '../molecules/SettingsToggleItem';
import SettingsHeader from '../molecules/SettingsHeader';
import StandardPopup from '../atoms/StandardPopup';

interface Props {
  isDark: boolean;
}

export default function AccessibilitySettingsContent({ isDark }: Props) {
  const colors = getThemeColors(isDark);
  const { isHapticFeedbackEnabled, isAccessibilityModeEnabled, setHapticFeedbackEnabled, setAccessibilityModeEnabled, loading } = useAccessibility();
  const [showErrorPopup, setShowErrorPopup] = useState(false);

  const handleHapticFeedbackToggle = async (enabled: boolean) => {
    try {
      await setHapticFeedbackEnabled(enabled);
    } catch {
      setShowErrorPopup(true);
    }
  };

  const handleAccessibilityModeToggle = async (enabled: boolean) => {
    try {
      await setAccessibilityModeEnabled(enabled);
    } catch {
      setShowErrorPopup(true);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SettingsHeader title="Accessibility Settings" />
        <View style={styles.loadingContent}>
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading settings...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title="Accessibility Settings" />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
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

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Indoor Navigation</Text>
            <SettingsToggleItem
              icon="wheel-chair"
              label="Accessibility Mode"
              description="Prioritize elevators over stairs for indoor navigation routes"
              value={isAccessibilityModeEnabled}
              onToggle={handleAccessibilityModeToggle}
              color={colors.primary}
              textColor={colors.text}
              descriptionColor={colors.secondary}
            />
          </View>
        </View>
      </ScrollView>

      {/* Error Popup */}
      <StandardPopup
        visible={showErrorPopup}
        title="Error"
        message="Failed to save accessibility setting. Please try again."
        onConfirm={() => setShowErrorPopup(false)}
        confirmText="OK"
        showCancel={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
});
