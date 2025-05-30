// src/screens/HomeScreen.tsx
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import HomeContent from '../components/organisms/HomeContent';

export default function HomeScreen() {
  const { isDark } = useTheme();

  return (
    <ScrollView style={styles.container}>
      <HomeContent isDark={isDark} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
