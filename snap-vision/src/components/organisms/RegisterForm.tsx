import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AppInput from '../atoms/AppInput';
import AppButton from '../atoms/AppButton';
import RememberMe from '../molecules/RememberMe';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Tabs: undefined;
};

export default function RegisterForm() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({
    username: '', email: '', password: '', confirmPassword: ''
  });
  const [successMessage, setSuccessMessage] = useState('');

  const handleRegister = async () => {
    const newErrors = { username: '', email: '', password: '', confirmPassword: '' };
    let hasError = false;
    setSuccessMessage('');

    if (!username.trim()) {
      newErrors.username = 'Username is required.';
      hasError = true;
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required.';
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email format.';
      hasError = true;
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!passwordRegex.test(password)) {
      newErrors.password = 'Password must include a capital letter, number, special char, and be 8+ chars.';
      hasError = true;
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
      hasError = true;
    }

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    try {
      await auth().createUserWithEmailAndPassword(email, password);
      setSuccessMessage('Account created!');
      setTimeout(() => {
        navigation.navigate('Tabs');
      }, 1000);
    } catch (error: any) {
      const errorMessages: { [key: string]: string } = {
        'auth/email-already-in-use': 'This email is already registered.',
        'auth/invalid-email': 'Invalid email address.',
        'auth/weak-password': 'Password is too weak.',
      };
      setErrors({
        ...newErrors,
        email: errorMessages[error?.code] || 'Registration failed.',
      });
    }
  };

  return (
    <View>
      <Text style={[styles.header, {
        fontFamily: 'PermanentMarkerRegular',
        color: colors.primary,
        transform: [{ rotate: '-3deg' }],
      }]}>
        REGISTER
      </Text>

      <Text style={[styles.label, { color: colors.secondary }]}>Username</Text>
      <AppInput
        placeholder="Enter your name"
        value={username}
        onChangeText={(text) => {
          setUsername(text);
          setErrors((prev) => ({ ...prev, username: '' }));
        }}
        style={[styles.input, { borderColor: colors.primary }]}
      />
      {errors.username ? <Text style={styles.error}>{errors.username}</Text> : null}

      <Text style={[styles.label, { color: colors.secondary }]}>Email</Text>
      <AppInput
        placeholder="Enter your email"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          setErrors((prev) => ({ ...prev, email: '' }));
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        style={[styles.input, { borderColor: colors.primary }]}
      />
      {errors.email ? <Text style={styles.error}>{errors.email}</Text> : null}

      <Text style={[styles.label, { color: colors.secondary }]}>Password</Text>
      <AppInput
        placeholder="Enter your password"
        secureTextEntry
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          setErrors((prev) => ({ ...prev, password: '' }));
        }}
        style={[styles.input, { borderColor: colors.primary }]}
      />
      {errors.password ? <Text style={styles.error}>{errors.password}</Text> : null}

      <Text style={[styles.label, { color: colors.secondary }]}>Confirm Password</Text>
      <AppInput
        placeholder="Confirm your password"
        secureTextEntry
        value={confirmPassword}
        onChangeText={(text) => {
          setConfirmPassword(text);
          setErrors((prev) => ({ ...prev, confirmPassword: '' }));
        }}
        style={[styles.input, { borderColor: colors.primary }]}
      />
      {errors.confirmPassword ? <Text style={styles.error}>{errors.confirmPassword}</Text> : null}

      <RememberMe rememberMe={rememberMe} onToggle={() => setRememberMe(!rememberMe)} />

      <AppButton title="REGISTER" onPress={handleRegister} color={colors.primary} />

      {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}

      <Text style={[styles.signUpText, { color: colors.secondary }]} onPress={() => navigation.navigate('Login')}>
        Already have an account? <Text style={styles.signUpBold}>LOGIN</Text>
      </Text>

      <View style={styles.dividerRow}>
        <View style={[styles.line, { backgroundColor: colors.secondary }]} />
        <Text style={[styles.orText, { color: colors.secondary }]}>Register With</Text>
        <View style={[styles.line, { backgroundColor: colors.secondary }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: 72,
    textAlign: 'center',
    marginBottom: 40,
  },
  label: {
    fontWeight: '600',
    fontSize: 14,
    marginTop: 12,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  error: {
    color: 'red',
    fontSize: 13,
    marginBottom: 4,
    marginTop: -6,
  },
  success: {
    color: 'green',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 12,
  },
  signUpText: {
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
    fontSize: 14,
    fontWeight: '600',
  },
  signUpBold: {
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 50,
    marginBottom: 10,
  },
  line: {
    flex: 1,
    height: 1,
  },
  orText: {
    marginHorizontal: 10,
    fontSize: 13,
    fontWeight: '600',
  },
});
