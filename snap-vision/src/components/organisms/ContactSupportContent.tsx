import React from 'react';
import { View, StyleSheet } from 'react-native';
import SettingsHeader from '../molecules/SettingsHeader';
import ContactMethods from '../molecules/ContactMethods';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

const ContactSupportContent = () => {
  const { theme, isDark } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title="Contact Support" />
      <ContactMethods />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default ContactSupportContent;
