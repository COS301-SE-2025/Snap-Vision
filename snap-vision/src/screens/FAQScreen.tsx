import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet, ScrollView } from 'react-native';
import FAQContent from '../components/organisms/FAQContent';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';

const FAQScreen = () => {
  const { theme, isDark } = useTheme();
  const colors = getThemeColors(theme);

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
        <FAQContent />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
});

export default FAQScreen;
