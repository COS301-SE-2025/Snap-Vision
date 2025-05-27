import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { useNavigation } from '@react-navigation/native';
import { NavigationProp } from '@react-navigation/native';
import MapScreen from './MapScreen';

// Define your navigation type
type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  MapScreen: undefined;
  // Add other screens as needed
};

type NavigationProps = NavigationProp<RootStackParamList>;

export default function LoginScreen() {
  const navigation = useNavigation();
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
      navigation.navigate('MapScreen'); // Change if Home screen route differs
    } catch (error: any) {
      console.error('Login Error:', error);
      const errorMessages: { [key: string]: string } = {
        'auth/invalid-email': 'Invalid email address.',
        'auth/user-not-found': 'No account found with this email.',
        'auth/wrong-password': 'Incorrect password.',
        'auth/too-many-requests': 'Too many login attempts. Try again later.',
        'auth/invalid-credential': 'Incorrect email or password.',
      };
      const message =
        errorMessages[error?.code] ??
        error?.message ??
        'Something went wrong. Please try again.';
      Alert.alert('Login Error', message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>LOGIN</Text>
      <Text style={styles.star}>★</Text>

      <Text style={styles.label}>Email</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <View style={styles.rememberContainer}>
        <TouchableOpacity onPress={() => setRememberMe(!rememberMe)}>
          <Text style={styles.rememberText}>
            {rememberMe ? '◉' : '◯'} Remember Me
          </Text>
        </TouchableOpacity>
        <TouchableOpacity>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.loginButton} onPress={handleLogin}  testID="login-button">
        <Text style={styles.buttonText}>LOGIN</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Register')}>
        <Text style={styles.signUpText}>
          Don’t have an account? SIGN UP
        </Text>
      </TouchableOpacity>

      <View style={styles.dividerRow}>
        <View style={styles.line} />
        <Text style={styles.orText}>Or Continue With</Text>
        <View style={styles.line} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  header: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#2f6e83',
    fontFamily: 'cursive', // replace with custom font if needed
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
  input: {
    height: 48,
    borderColor: '#2f6e83',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  rememberContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  rememberText: {
    color: '#2f6e83',
  },
  forgotText: {
    color: '#2f6e83',
  },
  loginButton: {
    backgroundColor: '#2f6e83',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  signUpText: {
    textAlign: 'center',
    color: '#333',
    marginBottom: 20,
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
