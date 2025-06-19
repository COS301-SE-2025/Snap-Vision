import React from 'react';
import { ScrollView, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
import PrivacySecurityContent from '../components/organisms/PrivacySecurityContent';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';

export default function PrivacySecurityScreen() {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar 
        backgroundColor={colors.background}
        barStyle={isDark ? 'light-content' : 'dark-content'} 
      />
      <ScrollView 
        style={[styles.container, { backgroundColor: colors.background }]}
        contentContainerStyle={{ backgroundColor: colors.background, flexGrow: 1 }}
      >
        <PrivacySecurityContent />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
});