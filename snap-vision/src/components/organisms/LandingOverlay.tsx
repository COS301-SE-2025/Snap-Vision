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

  