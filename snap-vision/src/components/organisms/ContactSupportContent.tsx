import React from 'react';
import { View, StyleSheet } from 'react-native';
import SettingsHeader from '../molecules/SettingsHeader';
import ContactMethods from '../molecules/ContactMethods';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

const ContactSupportContent = () => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

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