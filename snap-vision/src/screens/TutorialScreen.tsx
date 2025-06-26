import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import TutorialContent from '../components/organisms/TutorialContent';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';

const TutorialScreen = () => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar
        backgroundColor={colors.background}
        barStyle={isDark ? 'light-content' : 'dark-content'}
      />
      <TutorialContent />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
});

export default TutorialScreen;
