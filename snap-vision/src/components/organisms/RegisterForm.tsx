// src/components/organisms/RegisterForm.tsx
import React, { useState } from 'react';
import { View, Text, Alert, StyleSheet } from 'react-native';
import AppInput from '../atoms/AppInput';
import AppButton from '../atoms/AppButton';
import RememberMe from '../molecules/RememberMe';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Tabs: undefined;
  // Add other routes here if needed
};

export default function RegisterForm() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleRegister = async () => {
    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!passwordRegex.test(password)) {
      Alert.alert(
        'Error',
        'Password must be at least 8 characters, include a capital letter, a number, and a special character'
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    try {
      await auth().createUserWithEmailAndPassword(email, password);
      Alert.alert('Success', 'Account created!');
      navigation.navigate('Tabs');
    } catch (error: any) {
      console.error('Registration Error:', error);
      const errorMessages: { [key: string]: string } = {
        'auth/email-already-in-use': 'This email is already registered.',
        'auth/invalid-email': 'The email address is not valid.',
        'auth/weak-password': 'Password is too weak (must meet all criteria).',
      };
      const message =
        errorMessages[error?.code] ??
        error?.message ??
        'Something went wrong. Please try again.';
      Alert.alert('Registration Error', message);
    }
  };

  return (
    <View>
      <Text style={styles.header}>REGISTER</Text>
      <Text style={styles.star}>★</Text>

      <Text style={styles.label}>UserName</Text>
      <AppInput placeholder="Enter your name" value={username} onChangeText={setUsername} />

      <Text style={styles.label}>Email</Text>
      <AppInput
        placeholder="Enter your email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={styles.label}>Password</Text>
      <AppInput
        placeholder="Enter your password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Text style={styles.label}>Confirm Password</Text>
      <AppInput
        placeholder="Confirm your password"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />

      <RememberMe rememberMe={rememberMe} onToggle={() => setRememberMe(!rememberMe)} />

      <AppButton title="REGISTER" onPress={handleRegister} />

      <Text style={styles.signUpText} onPress={() => navigation.navigate('Tabs')}>
        Already have an account? <Text style={styles.bold}>LOGIN</Text>
      </Text>

      <View style={styles.dividerRow}>
        <View style={styles.line} />
        <Text style={styles.orText}>Or Continue With</Text>
        <View style={styles.line} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#2f6e83',
    fontFamily: 'cursive',
  },
  star: {
    textAlign: 'center',
    color: '#2f6e83',
    fontSize: 24,
    marginBottom: 20,
  },
  label: {
    marginTop: 12,
    marginBottom: 4,
    color: '#2f6e83',
    fontWeight: '500',
  },
  signUpText: {
    textAlign: 'center',
    color: '#333',
    marginBottom: 20,
  },
  bold: {
    fontWeight: 'bold',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#aaa',
  },
  orText: {
    marginHorizontal: 10,
    color: '#2f6e83',
    fontSize: 14,
  },
});
