import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';

// Setup mock functions
const mockNavigate = jest.fn();
const mockResetToLogin = jest.fn();
const mockSignOut = jest.fn(() => Promise.resolve());

// Spy on Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

// --- Firebase Mocks ---
jest.mock('@react-native-firebase/auth', () => {
  return jest.fn().mockImplementation(() => ({
    signOut: mockSignOut,
    currentUser: { uid: 'test-uid', email: 'tony@example.com' },
    useEmulator: jest.fn(),
  }));
});

// Import auth after mocking
import auth from '@react-native-firebase/auth';

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

// Native Components Mocks
jest.mock('react-native/Libraries/Components/SafeAreaView/SafeAreaView', () => {
  const React = require('react');
  const { View } = require('react-native');
  function MockSafeAreaView(props) {
    return <View {...props} />;
  }
  return MockSafeAreaView;
});

jest.mock('react-native/Libraries/Components/StatusBar/StatusBar', () => {
  const React = require('react');
  const { View } = require('react-native');
  function MockStatusBar(props) {
    return <View {...props} />;
  }
  return MockStatusBar;
});

jest.mock('react-native/Libraries/Components/ScrollView/ScrollView', () => {
  const React = require('react');
  const { View } = require('react-native');
  function MockScrollView(props) {
    return <View {...props}>{props.children}</View>;
  }
  return MockScrollView;
});

// Theme and Navigation Mocks
jest.mock('../../src/navigation/RootNavigation', () => ({
  resetToLogin: mockResetToLogin,
}));

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

// UI Component Mocks
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

// Real Component Import
import AccountSettingsContent from '../../src/components/organisms/AccountSettingsContent';

// Inject real component into screen
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
      expect(Alert.alert).toHaveBeenCalledWith(
        'Logged Out',
        'You have been logged out successfully.',
      );
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
      expect(Alert.alert).toHaveBeenCalledWith('An error occurred while logging out.');
    });
  });
});
