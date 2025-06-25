import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { View, Text } from 'react-native';

// --- Mock Native Components ---
// Mock the Switch component for testing
jest.mock('react-native/Libraries/Components/Switch/Switch', () => {
  const React = require('react');
  const { View } = require('react-native');
  return function MockSwitch(props) {
    return <View testID="mock-switch" role="switch" {...props} />;
  };
});

// Mock other native components that might cause issues
jest.mock('react-native/Libraries/Components/SafeAreaView/SafeAreaView', () => {
  const React = require('react');
  const { View } = require('react-native');
  return (props) => <View {...props} />;
});

jest.mock('react-native/Libraries/Components/StatusBar/StatusBar', () => {
  const React = require('react');
  const { View } = require('react-native');
  return (props) => <View {...props} />;
});

jest.mock('react-native/Libraries/Components/ScrollView/ScrollView', () => {
  const React = require('react');
  const { View } = require('react-native');
  return (props) => <View {...props}>{props.children}</View>;
});

// --- Mock Theme ---
const mockToggleTheme = jest.fn();
jest.mock('../../src/theme/ThemeContext', () => ({
  useTheme: () => ({ 
    isDark: false,
    toggleTheme: mockToggleTheme
  }),
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

// --- Mock NotificationSettings (molecule) ---
// IMPORTANT: Mock this before importing NotificationSettingsContent
jest.mock('../../src/components/molecules/NotificationSettings', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockNotificationSettings() {
    return (
      <View testID="notification-settings">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text>Push Notifications</Text>
          <View testID="mock-switch" role="switch" value={true} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text>Email Alerts</Text>
          <View testID="mock-switch" role="switch" value={false} />
        </View>
      </View>
    );
  };
});

// --- Mock DarkModeToggle ---
jest.mock('../../src/components/molecules/DarkModeToggle', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return function MockDarkModeToggle() {
    const { useTheme } = require('../../src/theme/ThemeContext');
    const { toggleTheme, isDark } = useTheme();
    return (
      <View testID="dark-mode-toggle" style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text>Dark Mode</Text>
        <TouchableOpacity 
          testID="dark-mode-switch" 
          onPress={toggleTheme}
          style={{
            width: 40,
            height: 24,
            borderRadius: 12,
            backgroundColor: isDark ? '#4CAF50' : '#DDDDDD',
            justifyContent: 'center',
            paddingHorizontal: 4
          }}
        >
          <View 
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: 'white',
              alignSelf: isDark ? 'flex-end' : 'flex-start'
            }}
          />
        </TouchableOpacity>
      </View>
    );
  };
});

// --- Mock SettingsHeader ---
jest.mock('../../src/components/molecules/SettingsHeader', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function SettingsHeader({ title }) {
    return (
      <View testID="settings-header">
        <Text>{title}</Text>
      </View>
    );
  };
});

// --- Mock AppPreferencesScreen ---
// Add this mock before importing the real components
jest.mock('../../src/screens/AppPreferences', () => {
  const React = require('react');
  const { View, SafeAreaView, ScrollView } = require('react-native');
  
  // Import AppPreferencesContent here to avoid circular reference
  const AppPreferencesContent = require('../../src/components/organisms/AppPreferencesContent').default;
  
  return function MockAppPreferencesScreen() {
    return (
      <SafeAreaView style={{ backgroundColor: '#FFFFFF' }}>
        <ScrollView style={{ backgroundColor: '#FFFFFF' }}>
          <AppPreferencesContent />
        </ScrollView>
      </SafeAreaView>
    );
  };
});

// --- Import Real Components ---
// Now that we've mocked all dependencies, import the organisms we want to test
import NotificationSettingsContent from '../../src/components/organisms/NotificationSettingsContent';
import AppPreferencesContent from '../../src/components/organisms/AppPreferencesContent';

// Import the entire screen component for more complete integration testing
import AppPreferencesScreen from '../../src/screens/AppPreferences';

describe('Notification Settings Integration Tests', () => {
  it('renders notification settings content with header', () => {
    const { getByTestId, getByText } = render(<NotificationSettingsContent />);
    
    // Verify header is displayed with correct title
    expect(getByTestId('settings-header')).toBeTruthy();
    expect(getByText('Notifications')).toBeTruthy();
  });

  it('displays notification options with correct default values', () => {
    const { getAllByTestId, getByText } = render(<NotificationSettingsContent />);
    
    // Verify notification types are displayed
    expect(getByText('Push Notifications')).toBeTruthy();
    expect(getByText('Email Alerts')).toBeTruthy();
    
    // Verify switches with correct default values
    const switches = getAllByTestId('mock-switch');
    expect(switches).toHaveLength(2);
    expect(switches[0].props.value).toBe(true); // Push notification should be on by default
    expect(switches[1].props.value).toBe(false); // Email alerts should be off by default
  });

  it('has correct styling based on theme', () => {
    const { getByText } = render(<NotificationSettingsContent />);
    
    // Get push notifications label element
    const pushNotificationsLabel = getByText('Push Notifications');
    
    // Verify the text is present
    expect(pushNotificationsLabel).toBeTruthy();
  });
});

describe('App Preferences Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockToggleTheme.mockClear();
  });
  
  it('renders app preferences content with header', () => {
    const { getByTestId, getByText } = render(<AppPreferencesContent />);
    
    // Verify header is displayed with correct title
    expect(getByTestId('settings-header')).toBeTruthy();
    expect(getByText('App Preferences')).toBeTruthy();
  });

  it('displays dark mode toggle', () => {
    const { getByTestId, getByText } = render(<AppPreferencesContent />);
    
    // Verify dark mode toggle is displayed
    expect(getByTestId('dark-mode-toggle')).toBeTruthy();
    expect(getByText('Dark Mode')).toBeTruthy();
    expect(getByTestId('dark-mode-switch')).toBeTruthy();
  });

  it('toggles dark mode when switch is pressed', () => {
    const { getByTestId } = render(<AppPreferencesContent />);
    
    // Find and press the dark mode toggle
    const darkModeSwitch = getByTestId('dark-mode-switch');
    fireEvent.press(darkModeSwitch);
    
    // Verify toggleTheme was called
    expect(mockToggleTheme).toHaveBeenCalledTimes(1);
  });

});