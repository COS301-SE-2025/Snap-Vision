jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve(null)),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve(null)),
  clear: jest.fn(() => Promise.resolve(null)),
}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../../src/screens/LoginScreen';
import LoginForm from '../../src/components/organisms/LoginForm';
import Toast from 'react-native-toast-message';

// Mock Toast
jest.mock('react-native-toast-message', () => ({
  show: jest.fn(),
}));

// Mock Firebase auth
const mockSignIn = jest.fn();
jest.mock('@react-native-firebase/auth', () => {
  return () => ({
    signInWithEmailAndPassword: mockSignIn,
  });
});

// Mock Navigation
const mockNavigate = jest.fn();
const mockReplace = jest.fn();
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    replace: mockReplace,
  }),
}));

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

const mockUnlock = jest.fn(() => Promise.resolve());

jest.mock('../../src/context/BadgeContext', () => {
  const originalModule = jest.requireActual('../../src/context/BadgeContext');
  return {
    ...originalModule,
    useBadges: () => ({
      unlock: mockUnlock,
      state: {
        unlocked: new Set(),
      },
      uid: 'test-uid',
      loading: false,
    }),
  };
});

// Mock AppInput
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

// Mock AppButton
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

// Mock RememberMe
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
    fireEvent.changeText(inputs[0], 'test@example.com');
    fireEvent.changeText(inputs[1], 'password123');
    expect(inputs[0].props.value).toBe('test@example.com');
    expect(inputs[1].props.value).toBe('password123');
  });

  it('validates empty inputs before submission', async () => {
    const { getByTestId, getByText } = render(<LoginForm />);
    fireEvent.press(getByTestId('login-button'));

    await waitFor(() => {
      expect(getByText('Email is required.')).toBeTruthy();
      expect(getByText('Password is required.')).toBeTruthy();
    });
  });

  it('validates invalid email format', async () => {
    const { getByTestId, getAllByTestId, getByText } = render(<LoginForm />);
    const inputs = getAllByTestId('input');
    fireEvent.changeText(inputs[0], 'invalid-email');
    fireEvent.changeText(inputs[1], 'password123');
    fireEvent.press(getByTestId('login-button'));

    await waitFor(() => {
      expect(getByText('Please enter a valid email address.')).toBeTruthy();
    });
  });

  it('attempts login with valid credentials', async () => {
    mockSignIn.mockResolvedValueOnce({});
    const { getByTestId, getAllByTestId } = render(<LoginForm />);
    const inputs = getAllByTestId('input');
    fireEvent.changeText(inputs[0], 'test@example.com');
    fireEvent.changeText(inputs[1], 'password123');
    fireEvent.press(getByTestId('login-button'));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(mockUnlock).toHaveBeenCalledWith('first-login');
      expect(mockReplace).toHaveBeenCalledWith('Tabs');
    });
  });

  it('handles wrong-password error', async () => {
    mockSignIn.mockRejectedValueOnce({ code: 'auth/wrong-password' });
    const { getByTestId, getAllByTestId, getByText } = render(<LoginForm />);
    const inputs = getAllByTestId('input');
    fireEvent.changeText(inputs[0], 'test@example.com');
    fireEvent.changeText(inputs[1], 'wrong-password');
    fireEvent.press(getByTestId('login-button'));

    await waitFor(() => {
      expect(getByText('Incorrect password.')).toBeTruthy();
    });
  });

  it('shows Toast on successful login', async () => {
    mockSignIn.mockResolvedValueOnce({});
    const { getByTestId, getAllByTestId } = render(<LoginForm />);
    const inputs = getAllByTestId('input');
    fireEvent.changeText(inputs[0], 'test@example.com');
    fireEvent.changeText(inputs[1], 'password123');
    fireEvent.press(getByTestId('login-button'));

    await waitFor(() => {
      expect(Toast.show).toHaveBeenCalledWith(expect.objectContaining({
        text1: 'Login Successful!',
      }));
    });
  });

  it('handles unknown login error', async () => {
    mockSignIn.mockRejectedValueOnce({ code: 'auth/unknown-error' });
    const { getByTestId, getAllByTestId, getByText } = render(<LoginForm />);
    const inputs = getAllByTestId('input');
    fireEvent.changeText(inputs[0], 'test@example.com');
    fireEvent.changeText(inputs[1], 'password123');
    fireEvent.press(getByTestId('login-button'));

    await waitFor(() => {
      expect(getByText('Login failed.')).toBeTruthy();
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
    const toggleButton = getByTestId('toggle-password');
    expect(inputs[1].props.secureTextEntry).toBe(true);
    fireEvent.press(toggleButton);
    // Assume state change occurred, value should flip
    expect(inputs[1].props.secureTextEntry).toBe(false);
  });

  it('navigates to register screen when sign up text is pressed', () => {
    const { getByText } = render(<LoginForm />);
    fireEvent.press(getByText(/SIGN UP/i));
    expect(mockNavigate).toHaveBeenCalledWith('Register');
  });

  it('renders login screen with form present', () => {
    const { getByTestId } = render(<LoginScreen />);
    expect(getByTestId('login-button')).toBeTruthy();
  });

  it('toggles remember me without error', () => {
    const { getByTestId } = render(<LoginForm />);
    fireEvent.press(getByTestId('remember-me-toggle'));
    // No assertion needed, just ensures toggle does not crash
  });
});
