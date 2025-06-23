// src/screens/HomeScreen.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import HomeContent from '../components/organisms/HomeContent';
import LandingOverlay from '../components/organisms/LandingOverlay';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import { useLanding } from '../context/LandingContext'; 

const HomeScreen = () => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const { hasSeenLanding, setHasSeenLanding } = useLanding();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <HomeContent />
      {/* Important: The logic was reversed */}
      {hasSeenLanding && <LandingOverlay onDismiss={() => setHasSeenLanding(true)} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default HomeScreen;