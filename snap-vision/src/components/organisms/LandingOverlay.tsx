import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

const LandingOverlay = ({ onDismiss }: { onDismiss: () => void }) => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  // Swap the text and primary colors
  const baseBlue = colors.text; // Blue used as background
  const overlayBackgroundColor = `${baseBlue}99`; // ~60% opacity

  const swappedTextColor = colors.primary;   // Use brown for text
  const swappedAccentColor = colors.text;    // Blue for accents/headings

  return (
    <TouchableWithoutFeedback onPress={onDismiss}>
      <View style={[styles.overlay, { backgroundColor: overlayBackgroundColor }]}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text
            style={[
              styles.titles,
              {
                color: swappedTextColor,
                fontFamily: 'PermanentMarkerRegular',
                transform: [{ rotate: '-2deg' }],
              },
            ]}
          >
            Snap Vision
          </Text>

          <Text style={[styles.tagline, { color: swappedAccentColor }]}>
            Wander Less, Discover More
          </Text>

          <Text style={[styles.description, { color: swappedTextColor }]}>
            Snap Vision is an indoor and outdoor navigation system designed to help students and visitors
            find their way around university spaces. Our mission is to make every step intuitive,
            accessible, and fast — whether you’re locating a lecture hall or the nearest exit.
          </Text>

          <View style={styles.featureSection}>
            <Text style={[styles.sectionTitle, { color: swappedTextColor }]}>Key Features</Text>
            <View style={styles.featureBox}>
              <Text style={[styles.featureText, { color: swappedTextColor }]}>Turn-by-turn Navigation</Text>
            </View>
            <View style={styles.featureBox}>
              <Text style={[styles.featureText, { color: swappedTextColor }]}>Indoor & Outdoor Coverage</Text>
            </View>
            <View style={styles.featureBox}>
              <Text style={[styles.featureText, { color: swappedTextColor }]}>Voice Assistance</Text>
            </View>
            <View style={styles.featureBox}>
              <Text style={[styles.featureText, { color: swappedTextColor }]}>AR Navigation</Text>
            </View>
          </View>