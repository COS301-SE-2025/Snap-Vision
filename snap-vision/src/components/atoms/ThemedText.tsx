import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

interface Props {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  weight?: 'normal' | 'bold' | '600';
  style?: TextStyle;
}

export default function ThemedText({ children, size = 'md', weight = 'normal', style }: Props) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  
  const fontSize = {
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
  }[size];

  return (
    <Text style={[styles.base, { fontSize, fontWeight: weight, color: colors.text }, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    textAlign: 'left', // Changed from center to left
  },
});