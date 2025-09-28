import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

interface Props {
  title: string;
  value: string | number;
  backgroundColor?: string;
  borderColor?: string;
}

export default function ProgressCard({ title, value, backgroundColor, borderColor }: Props) {
  const { theme, isDark } = useTheme();
  const colors = getThemeColors(theme);
  const bgColor = colors.card;
  const bColor = colors.primary;
  return (
    <View style={[styles.container, { backgroundColor: bgColor, borderColor: bColor }]}>
      <Text style={[styles.title, { color: colors.primary }]}>{title}</Text>
      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    marginHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  title: {
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
