// src/components/atoms/SectionTitle.tsx
import React from 'react';
import { Text, StyleSheet } from 'react-native';

interface Props {
  children: string;
  color: string;
}

export default function SectionTitle({ children, color }: Props) {
  return <Text style={[styles.title, { color }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 6,
    marginTop: 100,
  },
});
