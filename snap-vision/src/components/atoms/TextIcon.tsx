// atoms/TextIcon.tsx
import React from 'react';
import { Text, StyleSheet } from 'react-native';

export const TextIcon = ({ icon }: { icon: string }) => (
  <Text style={styles.iconText}>{icon}</Text>
);

const styles = StyleSheet.create({
  iconText: {
    fontSize: 20,
  },
});
