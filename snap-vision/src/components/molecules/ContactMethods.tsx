import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import ContactMethod from '../atoms/ContactMethod';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

const ContactMethods = () => {
  const { theme, isDark } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <View style={styles.container}>
      <Text style={[styles.heading, { color: colors.text }]}>Get in touch with us</Text>
      <Text style={[styles.description, { color: colors.text }]}>
        Our support team is available to help you.
      </Text>

      <View style={styles.methodsContainer}>
        <ContactMethod email="bltscapstone@gmail.com" label="Email Support" />
      </View>

      <View
        style={[
          styles.infoBox,
          { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' },
        ]}
      >
        <Text style={[styles.infoText, { color: colors.text }]}>
          When contacting support, please include:
        </Text>
        <Text style={[styles.bulletPoint, { color: colors.text }]}>• Your account email</Text>
        <Text style={[styles.bulletPoint, { color: colors.text }]}>
          • Device type and OS version
        </Text>
        <Text style={[styles.bulletPoint, { color: colors.text }]}>
          • A detailed description of the issue
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  heading: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
  },
  methodsContainer: {
    marginBottom: 24,
  },
  infoBox: {
    padding: 16,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  bulletPoint: {
    fontSize: 14,
    marginBottom: 4,
    lineHeight: 20,
  },
});

export default ContactMethods;
