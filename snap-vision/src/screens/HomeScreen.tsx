import React from 'react';
import { View, StyleSheet } from 'react-native';
import MapHomeContent from '../components/organisms/HomeContent';
import LandingOverlay from '../components/organisms/LandingOverlay';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import { useLanding } from '../context/LandingContext';

const HomeScreen = () => {
  // const [showLanding, setShowLanding] = useState(true);
  const { theme, isDark } = useTheme();
  const colors = getThemeColors(theme);
  const { hasSeenLanding, setHasSeenLanding, loading } = useLanding();

  if (loading) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {!hasSeenLanding && <LandingOverlay onDismiss={() => setHasSeenLanding(true)} />}
      {hasSeenLanding && <MapHomeContent />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default HomeScreen;
