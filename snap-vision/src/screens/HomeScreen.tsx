import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import HomeContent from '../components/organisms/HomeContent';

export default function HomeScreen() {
  const { isDark } = useTheme(); 
  const colors = getThemeColors(isDark);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <HomeContent isDark={isDark} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
