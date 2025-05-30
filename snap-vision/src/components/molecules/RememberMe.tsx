// src/components/molecules/RememberMe.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface Props {
  rememberMe: boolean;
  onToggle: () => void;
  onForgotPassword?: () => void;
}

export default function RememberMe({ rememberMe, onToggle, onForgotPassword }: Props) {
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onToggle}>
        <Text style={styles.linkText}>{rememberMe ? '◉' : '◯'} Remember Me</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onForgotPassword}>
        <Text style={styles.linkText}>Forgot Password?</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  linkText: {
    color: '#2f6e83',
  },
});
