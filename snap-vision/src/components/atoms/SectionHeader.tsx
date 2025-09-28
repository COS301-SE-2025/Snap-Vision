import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

export default function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { theme, isDark } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <View style={styles.header}>
      <Text style={[styles.title, { color: colors.primary }]}>{title}</Text>
      {subtitle && <Text style={[styles.subtitle, { color: colors.text }]}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { marginBottom: 16 },
  title: { fontSize: 18, fontWeight: 'bold' },
  subtitle: { fontSize: 14, opacity: 0.7 },
});
