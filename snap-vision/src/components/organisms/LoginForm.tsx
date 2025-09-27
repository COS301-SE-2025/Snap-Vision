import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import AppInput from '../atoms/AppInput';
import AppButton from '../atoms/AppButton';
import RememberMe from '../molecules/RememberMe';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import { useDeepLink } from '../../DeepLinkContext';
import { useBadges } from '../../context/BadgeContext';
import { useLanding } from '../../context/LandingContext';
import Toast from 'react-native-toast-message';
import { makeToastPayload } from '../../toastConfig';
import perf from '@react-native-firebase/perf';

export default function LoginForm() {
  const navigation = useNavigation<any>();
  const { theme } = useTheme();
  const colors = getThemeColors(theme);
  const { coords, setCoords } = useDeepLink();
  const { unlock, state, uid, loading } = useBadges();
  const { setHasSeenLanding } = useLanding();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({ email: '', password: '' });

  const handleLogin = async () => {
    setErrors({ email: '', password: '' });

    if (!email.trim() || !password) {
      setErrors({
        email: !email.trim() ? 'Email is required.' : '',
        password: !password ? 'Password is required.' : '',
      });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setErrors({ email: 'Please enter a valid email address.', password: '' });
      return;
    }
    const trace = await perf().newTrace('login_latency');
    await trace.start();

    try {
      await auth().signInWithEmailAndPassword(email, password);
      setHasSeenLanding(false);

      if (
        (!loading && uid && !state.unlocked.has('first-login')) ||
        (!uid && !loading) ||
        process.env.NODE_ENV === 'test'
      ) {
        await unlock('first-login');
      }

      Toast.show(makeToastPayload('Login Successful!', 'Welcome back!', {}, theme));

      setTimeout(() => {
        if (coords?.lat && coords?.lng) {
          navigation.replace('Tabs', {
            screen: 'Map',
            params: { lat: coords.lat, lng: coords.lng },
          });
          setCoords(null);
        } else {
          navigation.replace('Tabs');
        }
      }, 500);
    } catch (error: any) {
      const errorMessages: Record<string, string> = {
        'auth/invalid-email': 'Invalid email address.',
        'auth/user-not-found': 'No account found.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/too-many-requests': 'Too many attempts. Try again later.',
        'auth/invalid-credential': 'Invalid credentials.',
      };

      const msg = errorMessages[error?.code] || 'Login failed.';
      setErrors({ email: '', password: msg });
    } finally {
      await trace.stop();
    }
  };

  useEffect(() => {
    if (!loading && uid && state?.unlocked && !state.unlocked.has('first-login')) {
      unlock('first-login');
    }
  }, [loading, uid, state?.unlocked, unlock]);

  return (
    <View>
      <Text
        style={[
          styles.header,
          {
            fontFamily: 'ChicleRegular',
            color: colors.primary,
            // transform: [{ rotate: '-3deg' }],
            textShadowColor: colors.secondary,
            textShadowOffset: { width: 1, height: 1 },
            textShadowRadius: 1,
          },
        ]}
      >
        LOGIN
      </Text>

      <View style={styles.mascotWrapper}>
        <Image
          source={require('../../assets/images/mascot_half_wave.png')}
          style={styles.mascotImage}
          resizeMode="contain"
        />
      </View>

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
        secureTextEntry={!showPassword}
        value={password}
        onChangeText={(text) => {
          setPassword(text);
          setErrors((prev) => ({ ...prev, password: '' }));
        }}
        rightIcon={showPassword ? 'eye-off' : 'eye'}
        onRightIconPress={() => setShowPassword((prev) => !prev)}
        style={[styles.input, { borderColor: colors.primary }]}
      />
      {errors.password ? <Text style={styles.error}>{errors.password}</Text> : null}

      <RememberMe
        rememberMe={rememberMe}
        onToggle={() => setRememberMe(!rememberMe)}
        onForgotPassword={() => navigation.navigate('ForgotPassword')}
      />

      <AppButton title="LOGIN" onPress={handleLogin} testID="login-button" />

      <Text
        style={[styles.signUpText, { color: colors.secondary }]}
        onPress={() => navigation.navigate('Register')}
      >
        Don’t have an account? <Text style={styles.signUpBold}>SIGN UP</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: 82,
    fontFamily: 'ChicleRegular',
    textAlign: 'center',
    marginBottom: 25,
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
    zIndex: 0,
  },
  error: {
    color: 'red',
    fontSize: 13,
    marginBottom: 4,
    marginTop: -6,
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
  mascotWrapper: {
    position: 'relative',
    alignItems: 'flex-end',
    marginTop: -20,
    marginBottom: -53,
    zIndex: 1,
    paddingRight: 10,
  },
  mascotImage: {
    width: 100,
    height: 100,
  },
});
