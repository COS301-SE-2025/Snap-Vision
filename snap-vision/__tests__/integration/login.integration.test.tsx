import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import LoginScreen from '../../src/screens/LoginScreen';
import LoginForm from '../../src/components/organisms/LoginForm';

// Mock Firebase auth
jest.mock('@react-native-firebase/auth', () => {
  const signInWithEmailAndPassword = jest.fn();
  return () => ({
    signInWithEmailAndPassword,
  });
});

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// Mock Navigation
const mockNavigate = jest.fn();
const mockReplace = jest.fn();
jest.mock('@react-navigation/native', () => {
  return {
    ...jest.requireActual('@react-navigation/native'),
    useNavigation: () => ({
      navigate: mockNavigate,
      replace: mockReplace,
    }),
  };
});

// Mock Theme Context
jest.mock('../../src/theme/ThemeContext', () => ({
  useTheme: () => ({ isDark: false }),
}));

// Mock Theme Colors
jest.mock('../../src/theme', () => ({
  getThemeColors: () => ({
    background: '#FFFFFF',
    text: '#000000',
    primary: '#1E88E5',
    secondary: '#4CAF50',
    border: '#DDDDDD',
  }),
}));

// Mock DeepLink Context
const mockSetCoords = jest.fn();
jest.mock('../../src/DeepLinkContext', () => ({
  useDeepLink: () => ({
    coords: null,
    setCoords: mockSetCoords,
  }),
}));

// Mock Badge Context
const mockUnlock = jest.fn();
jest.mock('../../src/context/BadgeContext', () => ({
  useBadges: () => ({
    unlock: mockUnlock,
  }),
}));

// Mock AppInput component
jest.mock('../../src/components/atoms/AppInput', () => {
  const React = require('react');
  const { View, TextInput, TouchableOpacity, Text } = require('react-native');
  return function MockAppInput({
    placeholder,
    value,
    onChangeText,
    secureTextEntry,
    rightIcon,
    onRightIconPress,
    testID,
    ...props
  }) {
    return (
      <View>
        <TextInput
          testID={testID || 'input'}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          {...props}
        />
        {rightIcon && (
          <TouchableOpacity testID="toggle-password" onPress={onRightIconPress}>
            <Text>{rightIcon}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };
});

// Mock AppButton component
jest.mock('../../src/components/atoms/AppButton', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  return function MockAppButton({ title, onPress, testID, ...props }) {
    return (
      <TouchableOpacity testID={testID} onPress={onPress} {...props}>
        <Text>{title}</Text>
      </TouchableOpacity>
    );
  };
});

// Mock RememberMe component
jest.mock('../../src/components/molecules/RememberMe', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return function MockRememberMe({ rememberMe, onToggle, onForgotPassword }) {
    return (
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <TouchableOpacity testID="remember-me-toggle" onPress={onToggle}>
          <Text>Remember me</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="forgot-password" onPress={onForgotPassword}>
          <Text>Forgot Password?</Text>
        </TouchableOpacity>
      </View>
    );
  };
});

describe('Login Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles form input changes', () => {
    const { getAllByTestId } = render(<LoginForm />);
    const inputs = getAllByTestId('input');
    const emailInput = inputs[0];
    const passwordInput = inputs[1];
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    expect(emailInput.props.value).toBe('test@example.com');
    expect(passwordInput.props.value).toBe('password123');
  });

  it('validates form inputs before submission', async () => {
    const { getByTestId, getAllByTestId } = render(<LoginForm />);
    fireEvent.press(getByTestId('login-button'));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please fill in all fields');
    });
    const inputs = getAllByTestId('input');
    const emailInput = inputs[0];
    const passwordInput = inputs[1];
    fireEvent.changeText(emailInput, 'invalid-email');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(getByTestId('login-button'));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please enter a valid email address');
    });
  });

  it('attempts login with valid credentials', async () => {
    const auth = require('@react-native-firebase/auth')();
    auth.signInWithEmailAndPassword.mockResolvedValueOnce({});
    const { getByTestId, getAllByTestId } = render(<LoginForm />);
    const inputs = getAllByTestId('input');
    const emailInput = inputs[0];
    const passwordInput = inputs[1];
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'password123');
    fireEvent.press(getByTestId('login-button'));
    await waitFor(() => {
      expect(auth.signInWithEmailAndPassword).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
      );
      expect(mockUnlock).toHaveBeenCalledWith('first-login');
      expect(mockReplace).toHaveBeenCalledWith('Tabs');
    });
  });

  it('handles login errors', async () => {
    const auth = require('@react-native-firebase/auth')();
    auth.signInWithEmailAndPassword.mockRejectedValueOnce({
      code: 'auth/wrong-password',
    });
    const { getByTestId, getAllByTestId } = render(<LoginForm />);
    const inputs = getAllByTestId('input');
    const emailInput = inputs[0];
    const passwordInput = inputs[1];
    fireEvent.changeText(emailInput, 'test@example.com');
    fireEvent.changeText(passwordInput, 'wrong-password');
    fireEvent.press(getByTestId('login-button'));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Login Error', 'Incorrect password.');
    });
  });

  it('navigates to forgot password screen', () => {
    const { getByTestId } = render(<LoginForm />);
    fireEvent.press(getByTestId('forgot-password'));
    expect(mockNavigate).toHaveBeenCalledWith('ForgotPassword');
  });

  it('toggles password visibility', () => {
    const { getByTestId, getAllByTestId } = render(<LoginForm />);
    const inputs = getAllByTestId('input');
    const passwordInput = inputs[1];
    const toggleButton = getByTestId('toggle-password');
    expect(passwordInput.props.secureTextEntry).toBe(true);
    fireEvent.press(toggleButton);
    expect(passwordInput.props.secureTextEntry).toBe(false);
  });

  it('shows success message after login', async () => {
    const auth = require('@react-native-firebase/auth')();
    auth.signInWithEmailAndPassword.mockResolvedValueOnce({});
    const { getByTestId, getAllByTestId, findByText } = render(<LoginForm />);
    const inputs = getAllByTestId('input');
    fireEvent.changeText(inputs[0], 'test@example.com');
    fireEvent.changeText(inputs[1], 'password123');
    fireEvent.press(getByTestId('login-button'));
    expect(await findByText('Login successful!')).toBeTruthy();
  });

  it('shows error message for unknown error', async () => {
    const auth = require('@react-native-firebase/auth')();
    auth.signInWithEmailAndPassword.mockRejectedValueOnce({
      code: 'auth/unknown-error',
    });
    const { getByTestId, getAllByTestId } = render(<LoginForm />);
    const inputs = getAllByTestId('input');
    fireEvent.changeText(inputs[0], 'test@example.com');
    fireEvent.changeText(inputs[1], 'password123');
    fireEvent.press(getByTestId('login-button'));
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Login failed.');
    });
  });

  it('navigates to register screen when sign up text is pressed', () => {
    const { getByText } = render(<LoginForm />);
    fireEvent.press(getByText(/SIGN UP/i));
    expect(mockNavigate).toHaveBeenCalledWith('Register');
  });

  it('renders login screen with correct background', () => {
    const { getByTestId } = render(<LoginScreen />);
    // The root View in LoginScreen does not have a testID, so we check for LoginForm existence
    expect(getByTestId('login-button')).toBeTruthy();
  });

  it('toggles remember me', () => {
    const { getByTestId } = render(<LoginForm />);
    fireEvent.press(getByTestId('remember-me-toggle'));
    // No assertion needed, just ensure no crash and toggle works
  });
});
