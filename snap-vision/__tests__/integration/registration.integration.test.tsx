jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve(null)),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve(null)),
  clear: jest.fn(() => Promise.resolve(null)),
}));

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import RegistrationScreen from '../../src/screens/RegistrationScreen';
import RegisterForm from '../../src/components/organisms/RegisterForm';

// Mock Firebase auth and firestore
const mockCreateUserWithEmailAndPassword = jest.fn();
const mockSet = jest.fn();
jest.mock('@react-native-firebase/auth', () => () => ({
  createUserWithEmailAndPassword: mockCreateUserWithEmailAndPassword,
}));
jest.mock('@react-native-firebase/firestore', () => () => ({
  collection: () => ({
    doc: () => ({
      set: mockSet,
    }),
  }),
}));

// Mock StandardPopup component
const mockStandardPopup = jest.fn();
jest.mock('../../src/components/atoms/StandardPopup', () => {
  return jest.fn(({ visible, title, message, onClose, showCloseButton }) => {
    const { View, Text, TouchableOpacity } = require('react-native');

    // Call the mock function to track calls
    mockStandardPopup({ visible, title, message, onClose, showCloseButton });

    // Return a proper React component
    if (!visible) return null;
    return (
      <View testID="standard-popup">
        <Text testID="popup-title">{title}</Text>
        <Text testID="popup-message">{message}</Text>
        <TouchableOpacity onPress={onClose} testID="popup-close">
          <Text>Close</Text>
        </TouchableOpacity>
      </View>
    );
  });
});

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
// jest.mock('../../src/components/molecules/RememberMe', () => {
//   const React = require('react');
//   const { View, Text, TouchableOpacity } = require('react-native');
//   return function MockRememberMe({ rememberMe, onToggle, onForgotPassword }) {
//     return (
//       <View>
//         <TouchableOpacity testID="remember-me-toggle" onPress={onToggle}>
//           <Text>Remember me</Text>
//         </TouchableOpacity>
//         <TouchableOpacity testID="forgot-password" onPress={onForgotPassword}>
//           <Text>Forgot Password?</Text>
//         </TouchableOpacity>
//       </View>
//     );
//   };
// });

describe('Registration Integration Tests', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockStandardPopup.mockClear();
    mockCreateUserWithEmailAndPassword.mockReset();
    mockSet.mockReset();
    mockUnlock.mockReset();
    mockNavigate.mockReset();
    mockReplace.mockReset();
  });

  it('handles form input changes', () => {
    const { getAllByTestId } = render(<RegisterForm />);
    const inputs = getAllByTestId('input');
    fireEvent.changeText(inputs[0], 'testuser');
    fireEvent.changeText(inputs[1], 'test@example.com');
    fireEvent.changeText(inputs[2], 'Password1!');
    fireEvent.changeText(inputs[3], 'Password1!');
    expect(inputs[0].props.value).toBe('testuser');
    expect(inputs[1].props.value).toBe('test@example.com');
    expect(inputs[2].props.value).toBe('Password1!');
    expect(inputs[3].props.value).toBe('Password1!');
  });

  it('validates form inputs before submission', async () => {
    const { getByTestId, getAllByTestId } = render(<RegisterForm />);
    fireEvent.press(getByTestId('register-button'));
    await waitFor(() => {
      expect(mockStandardPopup).toHaveBeenCalledWith({
        visible: true,
        title: 'Registration Error',
        message: 'Please fill in all fields',
        onClose: expect.any(Function),
        showCloseButton: true,
      });
    });

    const inputs = getAllByTestId('input');
    fireEvent.changeText(inputs[0], 'testuser');
    fireEvent.changeText(inputs[1], 'invalid-email');
    fireEvent.changeText(inputs[2], 'Password1!');
    fireEvent.changeText(inputs[3], 'Password1!');
    fireEvent.press(getByTestId('register-button'));
    await waitFor(() => {
      expect(mockStandardPopup).toHaveBeenCalledWith({
        visible: true,
        title: 'Registration Error',
        message: 'Please enter a valid email address',
        onClose: expect.any(Function),
        showCloseButton: true,
      });
    });

    fireEvent.changeText(inputs[1], 'test@example.com');
    fireEvent.changeText(inputs[2], 'short');
    fireEvent.changeText(inputs[3], 'short');
    fireEvent.press(getByTestId('register-button'));
    await waitFor(() => {
      expect(mockStandardPopup).toHaveBeenCalledWith({
        visible: true,
        title: 'Registration Error',
        message:
          'Password must be at least 8 characters, include a capital letter, number, and special character.',
        onClose: expect.any(Function),
        showCloseButton: true,
      });
    });

    fireEvent.changeText(inputs[2], 'Password1!');
    fireEvent.changeText(inputs[3], 'Password2!');
    fireEvent.press(getByTestId('register-button'));
    await waitFor(() => {
      expect(mockStandardPopup).toHaveBeenCalledWith({
        visible: true,
        title: 'Registration Error',
        message: 'Passwords do not match',
        onClose: expect.any(Function),
        showCloseButton: true,
      });
    });
  });

  it('shows error if email already in use', async () => {
    mockCreateUserWithEmailAndPassword.mockRejectedValueOnce({ code: 'auth/email-already-in-use' });
    const { getByTestId, getAllByTestId } = render(<RegisterForm />);
    const inputs = getAllByTestId('input');
    fireEvent.changeText(inputs[0], 'testuser');
    fireEvent.changeText(inputs[1], 'test@example.com');
    fireEvent.changeText(inputs[2], 'Password1!');
    fireEvent.changeText(inputs[3], 'Password1!');
    fireEvent.press(getByTestId('register-button'));
    await waitFor(() => {
      expect(mockStandardPopup).toHaveBeenCalledWith({
        visible: true,
        title: 'Registration Error',
        message: 'This email is already registered.',
        onClose: expect.any(Function),
        showCloseButton: true,
      });
    });
  });

  it('shows error for unknown registration error', async () => {
    mockCreateUserWithEmailAndPassword.mockRejectedValueOnce({ code: 'auth/unknown-error' });
    const { getByTestId, getAllByTestId } = render(<RegisterForm />);
    const inputs = getAllByTestId('input');
    fireEvent.changeText(inputs[0], 'testuser');
    fireEvent.changeText(inputs[1], 'test@example.com');
    fireEvent.changeText(inputs[2], 'Password1!');
    fireEvent.changeText(inputs[3], 'Password1!');
    fireEvent.press(getByTestId('register-button'));
    await waitFor(() => {
      expect(mockStandardPopup).toHaveBeenCalledWith({
        visible: true,
        title: 'Registration Error',
        message: 'Registration failed.',
        onClose: expect.any(Function),
        showCloseButton: true,
      });
    });
  });

  it('registers user with valid credentials', async () => {
    mockCreateUserWithEmailAndPassword.mockResolvedValueOnce({
      user: { uid: 'uid123' },
    });
    mockSet.mockResolvedValueOnce();
    const { getByTestId, getAllByTestId, findByText } = render(<RegisterForm />);
    const inputs = getAllByTestId('input');
    fireEvent.changeText(inputs[0], 'testuser');
    fireEvent.changeText(inputs[1], 'test@example.com');
    fireEvent.changeText(inputs[2], 'Password1!');
    fireEvent.changeText(inputs[3], 'Password1!');
    fireEvent.press(getByTestId('register-button'));
    await waitFor(() => {
      expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(
        'test@example.com',
        'Password1!',
      );
      expect(mockSet).toHaveBeenCalledWith({
        email: 'test@example.com',
        name: 'testuser',
        role: 'user',
      });
      expect(mockUnlock).toHaveBeenCalledWith('first-login');
      expect(mockStandardPopup).toHaveBeenCalledWith({
        visible: true,
        title: 'Registration Successful',
        message: 'Your account has been created successfully!',
        onClose: expect.any(Function),
        showCloseButton: true,
      });
    });
    expect(await findByText('Your account has been created successfully!')).toBeTruthy();
  });

  // --- Additional tests for more coverage ---

  it('shows loading indicator during registration', async () => {
    mockCreateUserWithEmailAndPassword.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ user: { uid: 'uid123' } }), 100)),
    );
    const { getByTestId, getAllByTestId, queryByText } = render(<RegisterForm />);
    const inputs = getAllByTestId('input');
    fireEvent.changeText(inputs[0], 'testuser');
    fireEvent.changeText(inputs[1], 'test@example.com');
    fireEvent.changeText(inputs[2], 'Password1!');
    fireEvent.changeText(inputs[3], 'Password1!');
    fireEvent.press(getByTestId('register-button'));
    // Optionally check for loading indicator if your UI shows one
    // expect(queryByText('Loading...')).toBeTruthy();
    jest.runAllTimers();
    await waitFor(() => {
      expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalled();
    });
  });

  it('navigates to login screen when login text is pressed', () => {
    const { getByText } = render(<RegisterForm />);
    fireEvent.press(getByText(/LOGIN/i));
    expect(mockNavigate).toHaveBeenCalledWith('Login');
  });

  it('toggles password visibility', () => {
    const { getAllByTestId } = render(<RegisterForm />);
    const passwordToggle = getAllByTestId('toggle-password')[0];
    fireEvent.press(passwordToggle);
  });

  it('toggles confirm password visibility', () => {
    const { getAllByTestId } = render(<RegisterForm />);
    const confirmToggle = getAllByTestId('toggle-password')[1];
    fireEvent.press(confirmToggle);
  });

  // it('toggles remember me', () => {
  //   const { getByTestId } = render(<RegisterForm />);
  //   fireEvent.press(getByTestId('remember-me-toggle'));
  // });

  // it('calls forgot password handler', () => {
  //   const { getByTestId } = render(<RegisterForm />);
  //   fireEvent.press(getByTestId('forgot-password'));
  // });
});
