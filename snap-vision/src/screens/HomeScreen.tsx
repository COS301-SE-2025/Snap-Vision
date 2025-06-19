// src/screens/HomeScreen.tsx
import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import MapHomeContent from '../components/organisms/HomeContent';
import LandingOverlay from '../components/organisms/LandingOverlay';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';

const HomeScreen = () => {
  const [showLanding, setShowLanding] = useState(true);
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
