import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

interface ContactMethodProps {
  email: string;
  label: string;
}

const ContactMethod = ({ email, label }: ContactMethodProps) => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  const handlePress = () => {
    Linking.openURL(`mailto:${email}`);
  };

  return (
    <TouchableOpacity 
      style={[styles.container, { borderColor: colors.border || '#e1e1e1' }]}
      onPress={handlePress}
    >
      <Icon name="email-outline" size={24} color={colors.primary} style={styles.icon} />
      <View style={styles.textContainer}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        <Text style={[styles.value, { color: colors.primary }]}>{email}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
  },
  icon: {
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ContactMethod;