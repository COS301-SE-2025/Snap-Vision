// src/screens/RegistrationScreen.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import RegisterForm from '../components/organisms/RegisterForm';

export default function RegistrationScreen() {
  return (
    <View style={styles.container}>
      <RegisterForm />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
});
