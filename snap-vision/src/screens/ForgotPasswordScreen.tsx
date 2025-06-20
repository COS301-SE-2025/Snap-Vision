import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import AppInput from '../components/atoms/AppInput';
import AppButton from '../components/atoms/AppButton';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import auth from '@react-native-firebase/auth';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }

    try {
      await auth().sendPasswordResetEmail(email);
      Alert.alert('Success', 'Password reset email sent.');
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to send reset email.');
    }
  };

  return (
    <View style={styles.container}>
      <AppInput
        placeholder="Enter your email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        style={[styles.input, { borderColor: colors.primary }]}
      />
      <AppButton title="Send Reset Email" onPress={handleResetPassword} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  input: {
    marginBottom: 20,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
