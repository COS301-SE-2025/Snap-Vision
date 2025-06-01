// src/components/atoms/ProgressCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  title: string;
  value: string | number;
  backgroundColor?: string;
  textColor?: string;
  borderColor?: string;
}

export default function ProgressCard({ 
  title, 
  value, 
  backgroundColor = '#fff', 
  textColor = '#333',
  borderColor = '#ddd'
}: Props) {
  return (
    <View style={[
      styles.container, 
      { backgroundColor, borderColor }
    ]}>
      <Text style={[styles.title, { color: textColor }]}>{title}</Text>
      <Text style={[styles.value, { color: textColor }]}>{value}</Text>
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