import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import TimetableContent from '../components/organisms/TimetableContent';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';

const TimetableScreen = () => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar
        backgroundColor={colors.background}
        barStyle={isDark ? 'light-content' : 'dark-content'}
      />
      <TimetableContent />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
});

export default TimetableScreen;
