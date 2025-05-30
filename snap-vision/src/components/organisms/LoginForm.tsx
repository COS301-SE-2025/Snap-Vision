// src/components/organisms/LoginForm.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import AppInput from '../atoms/AppInput';
import AppButton from '../atoms/AppButton';
import RememberMe from '../molecules/RememberMe';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';

type RootStackParamList = {
  Tabs: undefined;
  Register: undefined;
  Home: undefined;
};

type NavigationProps = NavigationProp<RootStackParamList>;

export default function LoginForm() {
  const navigation = useNavigation<NavigationProps>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      await auth().signInWithEmailAndPassword(email, password);
      Alert.alert('Success', 'Logged in!');
      navigation.navigate('Tabs');
    } catch (error: any) {
      const errorMessages: Record<string, string> = {
        'auth/invalid-email': 'Invalid email address.',
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/too-many-requests': 'Too many login attempts. Try again later.',
        'auth/invalid-credential': 'Incorrect email or password.',
      };
      const message = errorMessages[error?.code] || 'Something went wrong.';
      Alert.alert('Login Error', message);
    }
  };

  return (
    <View>
      <Text style={styles.header}>LOGIN</Text>
      <Text style={styles.star}>★</Text>

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

      <RememberMe rememberMe={rememberMe} onToggle={() => setRememberMe(!rememberMe)} />

      <AppButton title="LOGIN" onPress={handleLogin} testID="login-button"/>

      <Text style={styles.signUpText} onPress={() => navigation.navigate('Register')}>
        Don’t have an account? <Text style={styles.signUpBold}>SIGN UP</Text>
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
    fontFamily: 'serif',
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
  signUpBold: {
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
