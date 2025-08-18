import React from 'react';
import { render, fireEvent, waitFor, screen } from '@testing-library/react-native';
import RegisterForm from '../src/components/organisms/RegisterForm';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProviderWrapper } from './test-utils/ThemeProviderWrapper';
import { BadgeProvider } from '../src/context/BadgeContext';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve(null)),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve(null)),
  clear: jest.fn(() => Promise.resolve(null)),
}));

// Mock StandardPopup component
jest.mock('../src/components/atoms/StandardPopup', () => {
  return jest.fn(({ visible, title, message, onClose, showCloseButton }) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    if (!visible) return null;

    // Determine testID based on title
    let testID = 'standard-popup';
    if (title === 'Registration Error') {
      testID = 'error-popup';
    } else if (title === 'Registration Successful') {
      testID = 'success-popup';
    }

    return (
      <View testID={testID}>
        <Text testID="popup-title">{title}</Text>
        <Text testID="popup-message">{message}</Text>
        {showCloseButton && (
          <TouchableOpacity onPress={onClose} testID="popup-close-button">
            <Text>Close</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  });
});

const mockCreateUser = jest.fn();

jest.mock('@react-native-firebase/auth', () => {
  return jest.fn(() => ({
    createUserWithEmailAndPassword: mockCreateUser,
    onAuthStateChanged: jest.fn((callback) => {
      callback(null);
      return jest.fn();
    }),
  }));
});

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('react-native-vector-icons/FontAwesome', () => 'Icon');
jest.mock('react-native-vector-icons/FontAwesome5', () => 'Icon');

jest.mock('expo-font', () => ({
  esModule: true,
  loadAsync: jest.fn().mockResolvedValue(true),
  isLoaded: jest.fn().mockReturnValue(true),
  Font: {
    loadAsync: jest.fn().mockResolvedValue(true),
    isLoaded: jest.fn().mockReturnValue(true),
  },
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MockedMaterialCommunityIcons',
  Ionicons: 'MockedIonicons',
  FontAwesome: 'MockedFontAwesome',
  FontAwesome5: 'MockedFontAwesome5',
  createIconSet: () => 'MockedIcon',
}));

jest.mock('@react-native-firebase/firestore', () => () => ({
  collection: jest.fn(() => ({
    doc: jest.fn(() => ({
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    })),
    onSnapshot: jest.fn(),
  })),
}));

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: jest.fn(),
      replace: jest.fn(), // <-- Add this line
    }),
  };
});

describe('RegisterForm', () => {
  const setup = () =>
    render(
      <BadgeProvider>
        <ThemeProviderWrapper>
          <NavigationContainer>
            <RegisterForm />
          </NavigationContainer>
        </ThemeProviderWrapper>
      </BadgeProvider>,
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all input fields and buttons', () => {
    const { getByPlaceholderText, getByTestId } = setup();

    expect(getByTestId('register-button')).toBeTruthy();
    expect(getByPlaceholderText('Enter your name')).toBeTruthy();
    expect(getByPlaceholderText('Enter your email')).toBeTruthy();
    expect(getByPlaceholderText('Enter your password')).toBeTruthy();
    expect(getByPlaceholderText('Confirm your password')).toBeTruthy();
  });

  it('shows popup if fields are empty', () => {
    const { getByTestId } = setup();
    fireEvent.press(getByTestId('register-button'));

    expect(screen.getByTestId('error-popup')).toBeTruthy();
    expect(screen.getByTestId('popup-title')).toHaveTextContent('Registration Error');
    expect(screen.getByTestId('popup-message')).toHaveTextContent('Please fill in all fields');
  });

  it('shows popup for invalid email format', () => {
    const { getByPlaceholderText, getByTestId } = setup();

    fireEvent.changeText(getByPlaceholderText('Enter your name'), 'John');
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'invalid-email');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'Strong@123');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'Strong@123');

    fireEvent.press(getByTestId('register-button'));

    expect(screen.getByTestId('error-popup')).toBeTruthy();
    expect(screen.getByTestId('popup-title')).toHaveTextContent('Registration Error');
    expect(screen.getByTestId('popup-message')).toHaveTextContent(
      'Please enter a valid email address',
    );
  });

  it('shows popup for weak password', () => {
    const { getByPlaceholderText, getByTestId } = setup();

    fireEvent.changeText(getByPlaceholderText('Enter your name'), 'John');
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'john@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'weak');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'weak');

    fireEvent.press(getByTestId('register-button'));

    expect(screen.getByTestId('error-popup')).toBeTruthy();
    expect(screen.getByTestId('popup-title')).toHaveTextContent('Registration Error');
    expect(screen.getByTestId('popup-message')).toHaveTextContent(
      /Password must be at least 8 characters/,
    );
  });

  it('shows popup if passwords do not match', () => {
    const { getByPlaceholderText, getByTestId } = setup();

    fireEvent.changeText(getByPlaceholderText('Enter your name'), 'John');
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'john@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'Strong@123');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'Mismatch123');

    fireEvent.press(getByTestId('register-button'));

    expect(screen.getByTestId('error-popup')).toBeTruthy();
    expect(screen.getByTestId('popup-title')).toHaveTextContent('Registration Error');
    expect(screen.getByTestId('popup-message')).toHaveTextContent('Passwords do not match');
  });

  it('calls Firebase auth and shows success popup', async () => {
    mockCreateUser.mockResolvedValueOnce({ user: { uid: 'test123' } });

    const { getByPlaceholderText, getByTestId } = setup();

    fireEvent.changeText(getByPlaceholderText('Enter your name'), 'John');
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'john@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'Strong@123');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'Strong@123');

    fireEvent.press(getByTestId('register-button'));

    await waitFor(() => {
      expect(mockCreateUser).toHaveBeenCalledWith('john@example.com', 'Strong@123');
    });

    expect(screen.getByTestId('success-popup')).toBeTruthy();
    expect(screen.getByTestId('popup-title')).toHaveTextContent('Registration Successful');
    expect(screen.getByTestId('popup-message')).toHaveTextContent(
      'Your account has been created successfully!',
    );
  });

  it('shows Firebase error if email already in use', async () => {
    mockCreateUser.mockRejectedValueOnce({ code: 'auth/email-already-in-use' });

    const { getByPlaceholderText, getByTestId } = setup();

    fireEvent.changeText(getByPlaceholderText('Enter your name'), 'John');
    fireEvent.changeText(getByPlaceholderText('Enter your email'), 'john@example.com');
    fireEvent.changeText(getByPlaceholderText('Enter your password'), 'Strong@123');
    fireEvent.changeText(getByPlaceholderText('Confirm your password'), 'Strong@123');

    fireEvent.press(getByTestId('register-button'));

    await waitFor(() => {
      expect(screen.getByTestId('error-popup')).toBeTruthy();
      expect(screen.getByTestId('popup-title')).toHaveTextContent('Registration Error');
      expect(screen.getByTestId('popup-message')).toHaveTextContent(
        'This email is already registered.',
      );
    });
  });
});
