import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';

interface Props {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  weight?: 'normal' | 'bold' | '600';
  style?: TextStyle;
}

export default function ThemedText({ children, size = 'md', weight = 'normal', style }: Props) {
  const fontSize = {
    sm: 14,
    md: 16,
    lg: 20,
    xl: 24,
  }[size];

  return (
    <Text style={[styles.base, { fontSize, fontWeight: weight, color: '#2f6e83' }, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    textAlign: 'center',
  },
});
