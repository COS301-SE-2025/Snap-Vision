// src/components/atoms/SectionTitle.tsx
import React from 'react';
import { Text, StyleSheet, TextStyle } from 'react-native';

interface Props {
  children: string;
  color?: string;
  fontFamily?: string;
  style?: TextStyle;
}

export default function SectionTitle({ children, color = '#000', fontFamily, style }: Props) {
  return (
    <Text style={[styles.title, { color, fontFamily }, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'left',
    marginHorizontal: 20,
  },
});
