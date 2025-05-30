import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

interface AccountInfoFieldProps {
  label: string;
  value: string;
}

export default function AccountInfoField({ label, value }: AccountInfoFieldProps) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <View style={[styles.container, { borderColor: colors.border }]}>
      <Text style={[styles.label, { color: colors.secondary }]}>{label}</Text>
      <Text style={[styles.value, { color: colors.primary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  label: {
    fontSize: 12,
    marginBottom: 2,
  },
  value: {
    fontSize: 16,
    fontWeight: '500',
  },
});
