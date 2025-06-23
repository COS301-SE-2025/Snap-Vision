import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import SettingsHeader from '../molecules/SettingsHeader';
import FAQList from '../molecules/FAQList';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

const FAQContent = () => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title="Frequently Asked Questions" />
      <Text style={[styles.introText, { color: colors.text }]}>
        Find answers to common questions about using SnapVision below:
      </Text>
      <FAQList />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  introText: {
    fontSize: 16,
    paddingHorizontal: 16,
    marginBottom: 16,
  }
});

export default FAQContent;