import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AppInput from '../atoms/AppInput';
import AppButton from '../atoms/AppButton';
import RememberMe from '../molecules/RememberMe';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';



export default function LoginForm() {
  const navigation = useNavigation();
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [successMessage, setSuccessMessage] = useState('');

  const handleLogin = async () => {
    const newErrors = { email: '', password: '' };
    let hasError = false;
    setSuccessMessage('');

    if (!email.trim()) {
      newErrors.email = 'Email is required.';
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email format.';
      hasError = true;
    }

    if (!password) {
      newErrors.password = 'Password is required.';
      hasError = true;
    }

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    try {
      await auth().signInWithEmailAndPassword(email, password);
      setSuccessMessage('Login successful!');
      setTimeout(() => {
        navigation.navigate('Tabs');
      }, 1000);
    } catch (error: any) {
      const errorMessages: Record<string, string> = {
        'auth/invalid-email': 'Invalid email address.',
        'auth/user-not-found': 'No account found.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/too-many-requests': 'Too many attempts. Try again later.',
        'auth/invalid-credential': 'Invalid credentials.',
      };
      setErrors({ email: '', password: errorMessages[error?.code] || 'Login failed.' });
    }
  };

  return (
    <View>
      <Text style={[styles.header, {
      fontFamily: 'PermanentMarkerRegular',
      color: colors.primary,
      transform: [{ rotate: '-3deg' }],
    }]}>
      LOGIN
    </Text>
      {/* <Text style={[styles.starOverlay, { color: colors.primary }]}>Wander Less. Discover More.</Text> */}

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

      <RememberMe rememberMe={rememberMe} onToggle={() => setRememberMe(!rememberMe)} />

      <AppButton title="LOGIN" onPress={handleLogin} color={colors.primary} />

      {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}

      <Text
        style={[styles.signUpText, { color: colors.secondary }]}
        onPress={() => navigation.navigate('Register')}
      >
        Don’t have an account? <Text style={styles.signUpBold}>SIGN UP</Text>
      </Text>

      <View style={styles.dividerRow}>
        <View style={[styles.line, { backgroundColor: colors.secondary }]} />
        <Text style={[styles.orText, { color: colors.secondary }]}>Login With</Text>
        <View style={[styles.line, { backgroundColor: colors.secondary }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: 72,
    fontFamily: 'PermanentMarkerRegular',
    textAlign: 'center',
    marginBottom: 40,
  },
  starOverlay: {
  position: 'absolute',
  top: 200,
  left: 50,
  fontSize: 24,
  
  },
  titleWrapper: {
    alignSelf: 'center',
    position: 'relative',
  },
  star: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 20,
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
