import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

// Setup mock functions
const mockNavigate = jest.fn();
const mockResetToLogin = jest.fn();
const mockSignOut = jest.fn(() => Promise.resolve());

import Toast from 'react-native-toast-message';

// --- Toast Mock ---
const mockToastShow = jest.fn();
jest.mock('react-native-toast-message', () => ({
  show: (...args) => mockToastShow(...args),
}));

// Mock StandardPopup component
const mockStandardPopup = jest.fn();
jest.mock('../../src/components/atoms/StandardPopup', () => {
  return jest.fn(({ visible, title, message, onConfirm, onCancel, confirmText, cancelText, showCancel }) => {
    const { View, Text, TouchableOpacity } = require('react-native');
    
    // Call the mock function to track calls
    mockStandardPopup({ visible, title, message, onConfirm, onCancel, confirmText, cancelText, showCancel });
    
    // Return a proper React component
    if (!visible) return null;
    return (
      <View testID="standard-popup">
        <Text testID="popup-title">{title}</Text>
        <Text testID="popup-message">{message}</Text>
        <TouchableOpacity onPress={onConfirm} testID="popup-confirm">
          <Text>{confirmText}</Text>
        </TouchableOpacity>
        {showCancel && (
          <TouchableOpacity onPress={onCancel} testID="popup-cancel">
            <Text>{cancelText}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  });
});

// --- Navigation Mock ---
jest.mock('../../src/navigation/RootNavigation', () => ({
  resetToAuthResolver: jest.fn(),
  resetToLogin: mockResetToLogin,
}));

import { resetToAuthResolver } from '../../src/navigation/RootNavigation';

// --- Firebase Auth Mock ---
jest.mock('@react-native-firebase/auth', () => {
  return jest.fn().mockImplementation(() => ({
    signOut: mockSignOut,
    currentUser: { uid: 'test-uid', email: 'tony@example.com' },
    useEmulator: jest.fn(),
    onAuthStateChanged: jest.fn((callback) => {
      callback({ uid: 'test-uid', email: 'tony@example.com' });
      return jest.fn();
    }),
  }));
});

import auth from '@react-native-firebase/auth';

// --- Firebase Firestore Mock ---
jest.mock('@react-native-firebase/firestore', () => {
  return jest.fn().mockImplementation(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(() =>
          Promise.resolve({
            exists: true,
            data: () => ({
              name: 'Tony Stark',
              email: 'tony@example.com',
              profilePicture: 'https://example.com/profile.jpg',
            }),
          }),
        ),
        update: jest.fn(() => Promise.resolve()),
      })),
      where: jest.fn(() => ({
        get: jest.fn(() =>
          Promise.resolve({
            empty: false,
            docs: [
              {
                id: 'user-doc-id',
                data: () => ({
                  name: 'Tony Stark',
                  email: 'tony@example.com',
                  role: 'user',
                }),
              },
            ],
          }),
        ),
      })),
    })),
    useEmulator: jest.fn(),
  }));
});

// --- Native Component Mocks ---
jest.mock('react-native/Libraries/Components/SafeAreaView/SafeAreaView', () => {
  const React = require('react');
  const { View } = require('react-native');

  const MockSafeAreaView = (props) => <View {...props} />;
  MockSafeAreaView.displayName = 'MockSafeAreaView';

  return MockSafeAreaView;
});

jest.mock('react-native/Libraries/Components/StatusBar/StatusBar', () => {
  const React = require('react');
  const { View } = require('react-native');

  const MockStatusBar = (props) => <View {...props} />;
  MockStatusBar.displayName = 'MockStatusBar';

  return MockStatusBar;
});

jest.mock('react-native/Libraries/Components/ScrollView/ScrollView', () => {
  const React = require('react');
  const { View } = require('react-native');

  const MockScrollView = (props) => <View {...props}>{props.children}</View>;
  MockScrollView.displayName = 'MockScrollView';

  return MockScrollView;
});

// --- Theme and UI Component Mocks ---
jest.mock('../../src/theme/ThemeContext', () => ({
  useTheme: () => ({ isDark: false }),
}));

jest.mock('../../src/theme', () => ({
  getThemeColors: () => ({
    background: '#FFFFFF',
    text: '#000000',
    primary: '#1E88E5',
    secondary: '#4CAF50',
    border: '#DDDDDD',
  }),
}));

jest.mock('../../src/components/molecules/SettingsHeader', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockSettingsHeader({ title }) {
    return (
      <View testID="settings-header">
        <Text>{title}</Text>
      </View>
    );
  };
});

jest.mock('../../src/components/molecules/AccountDetails', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockAccountDetails() {
    return (
      <View testID="account-details">
        <Text>tony@example.com</Text>
        <Text>Tony Stark</Text>
        <Text>user</Text>
      </View>
    );
  };
});

jest.mock('../../src/components/molecules/LogoutButton', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  return function MockLogoutButton({ onLogout }) {
    return (
      <TouchableOpacity testID="logout-button" onPress={onLogout}>
        <Text>Log Out</Text>
      </TouchableOpacity>
    );
  };
});

// --- Real Component Setup ---
import AccountSettingsContent from '../../src/components/organisms/AccountSettingsContent';

jest.mock('../../src/screens/AccountSettings', () => {
  const React = require('react');
  const { View } = require('react-native');
  const RealContent = require('../../src/components/organisms/AccountSettingsContent').default;
  return function MockedScreen({ navigation }) {
    return (
      <View>
        <RealContent navigation={navigation} />
      </View>
    );
  };
});

import AccountSettingsScreen from '../../src/screens/AccountSettings';
const TestWrapper = ({ children }) => <>{children}</>;

describe('Account Settings Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStandardPopup.mockClear();
  });

  it('renders account details correctly', () => {
    const { getByTestId, getByText } = render(
      <TestWrapper>
        <AccountSettingsScreen navigation={{ navigate: mockNavigate }} />
      </TestWrapper>,
    );

    expect(getByTestId('settings-header')).toBeTruthy();
    expect(getByText('Account Settings')).toBeTruthy();
    expect(getByTestId('account-details')).toBeTruthy();
    expect(getByText('tony@example.com')).toBeTruthy();
    expect(getByText('Tony Stark')).toBeTruthy();
    expect(getByText('user')).toBeTruthy();
    expect(getByTestId('logout-button')).toBeTruthy();
  });

  it('handles successful logout', async () => {
    const { getByTestId } = render(
      <TestWrapper>
        <AccountSettingsScreen navigation={{ navigate: mockNavigate }} />
      </TestWrapper>,
    );

    fireEvent.press(getByTestId('logout-button'));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockToastShow).toHaveBeenCalledWith(
        expect.objectContaining({
          text1: 'Logged Out',
          text2: 'You have been logged out successfully.',
        }),
      );
      expect(resetToAuthResolver).toHaveBeenCalled();
    });
  });

  it('handles logout failure and shows error alert', async () => {
    mockSignOut.mockImplementationOnce(() => Promise.reject(new Error('Auth error')));

    const { getByTestId } = render(
      <TestWrapper>
        <AccountSettingsScreen navigation={{ navigate: mockNavigate }} />
      </TestWrapper>,
    );

    fireEvent.press(getByTestId('logout-button'));

    await waitFor(() => {
      expect(mockToastShow).toHaveBeenCalledWith(
        expect.objectContaining({
          text1: 'Logout Failed',
          text2: 'An error occurred while logging out.',
        }),
      );
    });
  });
});
