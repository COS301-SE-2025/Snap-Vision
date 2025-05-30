// src/components/atoms/AppInput.tsx
import React from 'react';
import { TextInput, StyleSheet, TextInputProps } from 'react-native';

export default function AppInput(props: TextInputProps) {
  return (
    <TextInput
      {...props}
      style={[styles.input, props.style]}
      placeholderTextColor="#888"
    />
  );
}

const styles = StyleSheet.create({
  input: {
    height: 48,
    borderColor: '#2f6e83',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    color: '#000',
  },
});
