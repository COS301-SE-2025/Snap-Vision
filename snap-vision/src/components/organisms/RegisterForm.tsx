import React, { useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import AppInput from '../atoms/AppInput';
import AppButton from '../atoms/AppButton';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import { useDeepLink } from '../../DeepLinkContext';
import firestore from '@react-native-firebase/firestore';
import { useBadges } from '../../context/BadgeContext';
import { useLanding } from '../../context/LandingContext';
import StandardPopup from '../atoms/StandardPopup';

type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Tabs: { screen?: string; params?: { lat: string; lng: string } } | undefined;
  ForgotPassword: undefined;
};

export default function RegisterForm() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const { coords, setCoords } = useDeepLink();
  const { setHasSeenLanding } = useLanding();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [successMessage, setSuccessMessage] = useState('');
  const { unlock } = useBadges();

  // Success message state
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Popup states
  const [showError, setShowError] = useState(false);
  const [errorTitle, setErrorTitle] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successTitle, setSuccessTitle] = useState('');
  const [successMessageState, setSuccessMessageState] = useState('');

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
      newErrors.email = 'Please enter a valid email address.';
      hasError = true;
    }

    const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
    if (!passwordRegex.test(password)) {
      newErrors.password =
        'Password must be at least 8 characters, include a capital letter, number, and special character.';
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
      const userCredential = await auth().createUserWithEmailAndPassword(email, password);
      const uid = userCredential.user.uid;

      await firestore().collection('userInformation').doc(uid).set({
        email,
        name: username.trim(),
        role: 'user',
      });

      // Create a Firestore entry for this user in the 'users' collection with default purchase
      const defaultPurchase = {
        id: 'home-icon-home',
        title: 'Standard Home',
        description: 'Classic home icon for the Home tab',
        icon: 'home-outline',
        tabType: 'Home',
        cost: 0,
        equipped: true,
      };
      await firestore()
        .collection('users')
        .doc(uid)
        .set({
          badges: [],
          points: 0,
          checkIns: 0,
          routesCompleted: 0,
          purchases: [defaultPurchase],
        });

      setHasSeenLanding(false); // triggers Landing screen on registration
      unlock('first-login');
      setSuccessTitle('Registration Successful');
      setSuccessMessageState('Your account has been created successfully!');
      setShowSuccess(true);
      setSuccessMessage('Account created!');
      // Navigate after success
      setTimeout(() => {
        if (coords && coords.lat && coords.lng) {
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
      const errorMessages: { [key: string]: string } = {
        'auth/email-already-in-use': 'This email is already registered.',
        'auth/invalid-email': 'Invalid email address.',
        'auth/weak-password': 'Password is too weak.',
      };
      const msg = errorMessages[error?.code] || 'Registration failed.';
      setErrorTitle('Registration Error');
      setErrorMessage(msg);
      setShowError(true);
    }
  };

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
        REGISTER
      </Text>

      <View style={styles.mascotWrapper}>
        <Image
          source={require('../../assets/images/mascot_half_wave.png')}
          style={styles.mascotImage}
          resizeMode="contain"
        />
      </View>

      <Text style={[styles.label, { color: colors.secondary }]}>Username</Text>
      <AppInput
        placeholder="Enter your name"
        value={username}
        onChangeText={(text) => {
          setUsername(text);
          setErrors((prev) => ({ ...prev, username: '' }));
        }}
        style={[styles.input, { borderColor: colors.primary, color: colors.text }]}
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

      <Text style={[styles.label, { color: colors.secondary }]}>Confirm Password</Text>
      <AppInput
        placeholder="Confirm your password"
        secureTextEntry={!showConfirmPassword}
        value={confirmPassword}
        onChangeText={(text) => {
          setConfirmPassword(text);
          setErrors((prev) => ({ ...prev, confirmPassword: '' }));
        }}
        rightIcon={showConfirmPassword ? 'eye-off' : 'eye'}
        onRightIconPress={() => setShowConfirmPassword((prev) => !prev)}
        style={[styles.input, { borderColor: colors.primary }]}
      />
      {errors.confirmPassword ? <Text style={styles.error}>{errors.confirmPassword}</Text> : null}

      <View style={styles.buttonSpacing}></View>
      <AppButton title="REGISTER" onPress={handleRegister} testID="register-button" />

      {successMessage ? <Text style={styles.success}>{successMessage}</Text> : null}

      <Text
        style={[styles.signUpText, { color: colors.secondary }]}
        onPress={() => navigation.navigate('Login')}
      >
        Already have an account? <Text style={styles.signUpBold}>LOGIN</Text>
      </Text>

      <StandardPopup
        visible={showError}
        title={errorTitle}
        message={errorMessage}
        onClose={() => setShowError(false)}
        showCloseButton={true}
      />

      <StandardPopup
        visible={showSuccess}
        title={successTitle}
        message={successMessageState}
        onClose={() => setShowSuccess(false)}
        showCloseButton={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: 60,
    fontFamily: 'ChicleRegular',
    textAlign: 'center',
    marginBottom: 50,
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
    position: 'relative',
    zIndex: 0,
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
  buttonSpacing: {
    height: 12,
  },
  mascotWrapper: {
    position: 'relative',
    alignItems: 'flex-end',
    marginTop: -60,
    marginBottom: -53,
    zIndex: 1,
    paddingRight: 10,
  },
  mascotImage: {
    width: 100,
    height: 100,
  },
});
