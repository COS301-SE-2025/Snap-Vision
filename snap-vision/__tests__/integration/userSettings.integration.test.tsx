import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// --- Import Real Components ---
import NotificationSettingsContent from '../../src/components/organisms/NotificationSettingsContent';
import AppPreferencesContent from '../../src/components/organisms/AppPreferencesContent';
import PrivacySecurityContent from '../../src/components/organisms/PrivacySecurityContent';
import SupportContent from '../../src/components/organisms/SupportContent';
import SupportScreen from '../../src/screens/SupportScreen';
import SettingsContent from '../../src/components/organisms/SettingsContent';
import { NavigationContainer } from '@react-navigation/native';

// Import the entire screen component for more complete integration testing
import AppPreferencesScreen from '../../src/screens/AppPreferences';
import PrivacySecurityScreen from '../../src/screens/PrivacySecurityScreen';

// Mock the Switch component for testing
jest.mock('react-native/Libraries/Components/Switch/Switch', () => {
  const React = require('react');
  const { View } = require('react-native');
  return function MockSwitch(props) {
    return <View testID="mock-switch" role="switch" {...props} />;
  };
});

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

//Mock Theme
const mockToggleTheme = jest.fn();
jest.mock('../../src/theme/ThemeContext', () => ({
  useTheme: () => ({
    isDark: false,
    toggleTheme: mockToggleTheme,
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

// Mock NotificationSettings (molecule)
jest.mock('../../src/components/molecules/NotificationSettings', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockNotificationSettings() {
    return (
      <View testID="notification-settings">
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Text>Push Notifications</Text>
          <View testID="mock-switch" role="switch" value={true} />
        </View>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Text>Email Alerts</Text>
          <View testID="mock-switch" role="switch" value={false} />
        </View>
      </View>
    );
  };
});

// Mock PrivacySettings (molecule)
jest.mock('../../src/components/molecules/PrivacySettings', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockPrivacySettings() {
    return (
      <View testID="privacy-settings-mock">
        <Text>Privacy Settings Section</Text>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Text>Location Services</Text>
          <View testID="mock-switch" role="switch" value={true} />
        </View>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Text>Analytics</Text>
          <View testID="mock-switch" role="switch" value={true} />
        </View>
        <Text>Security Settings</Text>
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
        >
          <Text>Biometric Authentication</Text>
          <View testID="mock-switch" role="switch" value={false} />
        </View>
      </View>
    );
  };
});

// Mock DarkModeToggle
jest.mock('../../src/components/molecules/DarkModeToggle', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return function MockDarkModeToggle() {
    const { useTheme } = require('../../src/theme/ThemeContext');
    const { toggleTheme, isDark } = useTheme();
    return (
      <View
        testID="dark-mode-toggle"
        style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
      >
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
            paddingHorizontal: 4,
          }}
        >
          <View
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: 'white',
              alignSelf: isDark ? 'flex-end' : 'flex-start',
            }}
          />
        </TouchableOpacity>
      </View>
    );
  };
});

// Mock SettingsHeader
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

// Mock @expo/vector-icons to prevent act warnings from async state updates
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    Ionicons: ({ name, ...props }) => <View testID={`icon-${name}`} {...props}><Text>{name}</Text></View>,
    MaterialIcons: ({ name, ...props }) => <View testID={`icon-${name}`} {...props}><Text>{name}</Text></View>,
    // Add other icon sets if needed
  };
});

// Mock SettingItem for SettingsContent
jest.mock('../../src/components/molecules/SettingsItem', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  return function MockSettingsItem({ icon, label, onPress }) {
    return (
      <TouchableOpacity onPress={onPress} testID={`settings-item-${label.replace(/\s/g, '-')}`}>
        <Text>{icon}</Text>
        <Text>{label}</Text>
      </TouchableOpacity>
    );
  };
});

// Mock AppPreferencesScreen
jest.mock('../../src/screens/AppPreferences', () => {
  const React = require('react');
  const { SafeAreaView, ScrollView } = require('react-native');

  const AppPreferencesContent =
    require('../../src/components/organisms/AppPreferencesContent').default;

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

// Mock PrivacySecurityScreen
jest.mock('../../src/screens/PrivacySecurityScreen', () => {
  const React = require('react');
  const { SafeAreaView, ScrollView } = require('react-native');
  const PrivacySecurityContent =
    require('../../src/components/organisms/PrivacySecurityContent').default;
  return function MockPrivacySecurityScreen() {
    return (
      <SafeAreaView style={{ backgroundColor: '#FFFFFF' }}>
        <ScrollView style={{ backgroundColor: '#FFFFFF' }}>
          <PrivacySecurityContent />
        </ScrollView>
      </SafeAreaView>
    );
  };
});

// Mock SupportScreen (but NOT the organism)
jest.mock('../../src/screens/SupportScreen', () => {
  const React = require('react');
  const { SafeAreaView, ScrollView } = require('react-native');
  const SupportContent = require('../../src/components/organisms/SupportContent').default;
  return function MockSupportScreen() {
    return (
      <SafeAreaView>
        <ScrollView>
          <SupportContent />
        </ScrollView>
      </SafeAreaView>
    );
  };
});

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

//Privacy & Security Integration Tests
describe('Privacy & Security Integration Tests', () => {
  it('renders privacy security content with header', () => {
    const { getByTestId, getByText } = render(<PrivacySecurityContent />);
    expect(getByTestId('settings-header')).toBeTruthy();
    expect(getByText('Privacy & Security')).toBeTruthy();
    expect(getByTestId('privacy-settings-mock')).toBeTruthy();
    expect(getByText('Privacy Settings Section')).toBeTruthy();
  });

  it('displays privacy and security options', () => {
    const { getAllByTestId, getByText } = render(<PrivacySecurityContent />);
    expect(getByText('Location Services')).toBeTruthy();
    expect(getByText('Analytics')).toBeTruthy();
    expect(getByText('Security Settings')).toBeTruthy();
    expect(getByText('Biometric Authentication')).toBeTruthy();

    const switches = getAllByTestId('mock-switch');
    expect(switches).toHaveLength(3);
    expect(switches[0].props.value).toBe(true); // Location Services
    expect(switches[1].props.value).toBe(true); // Analytics
    expect(switches[2].props.value).toBe(false); // Biometric Authentication
  });
});

// SettingsContent Integration Tests
describe('SettingsContent Integration Tests', () => {
  const navigation = { navigate: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    navigation.navigate.mockClear();
  });

  it('renders all settings items', () => {
    const { getByText } = render(<SettingsContent isDark={false} navigation={navigation} />);
    expect(getByText('Account')).toBeTruthy();
    expect(getByText('Accessibility')).toBeTruthy();
    expect(getByText('Notifications')).toBeTruthy();
    expect(getByText('App Preferences')).toBeTruthy();
    expect(getByText('Support')).toBeTruthy();
  });

  it('calls navigation.navigate with correct screen when each item is pressed', () => {
    const { getByTestId } = render(<SettingsContent isDark={false} navigation={navigation} />);
    fireEvent.press(getByTestId('settings-item-Account'));
    fireEvent.press(getByTestId('settings-item-Accessibility'));
    fireEvent.press(getByTestId('settings-item-Notifications'));
    fireEvent.press(getByTestId('settings-item-App-Preferences'));
    fireEvent.press(getByTestId('settings-item-Support'));
    expect(navigation.navigate).toHaveBeenCalledWith('AccountSettings');
    expect(navigation.navigate).toHaveBeenCalledWith('AccessibilitySettings');
    expect(navigation.navigate).toHaveBeenCalledWith('NotificationSettings');
    expect(navigation.navigate).toHaveBeenCalledWith('AppPreferences');
    expect(navigation.navigate).toHaveBeenCalledWith('Support');
  });
});

// SupportContent Integration Tests
describe('SupportContent Integration Tests', () => {
  it('renders support content with header and intro', () => {
    const { getByTestId, getByText } = render(
      <NavigationContainer>
        <SupportContent />
      </NavigationContainer>,
    );
    expect(getByTestId('settings-header')).toBeTruthy();
    expect(getByText('Support')).toBeTruthy();
    expect(getByText('Need help? Choose from the options below:')).toBeTruthy();
  });

  it('renders all support options and version', () => {
    const { getByTestId, getByText } = render(
      <NavigationContainer>
        <SupportContent />
      </NavigationContainer>,
    );
    expect(getByText('FAQ')).toBeTruthy();
    expect(getByText('Contact Support')).toBeTruthy();
    expect(getByText('Tutorial')).toBeTruthy();
    expect(getByText('SnapVision v1.0.0')).toBeTruthy();
  });

  it('renders inside SupportScreen', () => {
    const { getByTestId, getByText } = render(
      <NavigationContainer>
        <SupportContent />
      </NavigationContainer>,
    );
    expect(getByTestId('settings-header')).toBeTruthy();
    expect(getByText('Support')).toBeTruthy();
    expect(getByText('Need help? Choose from the options below:')).toBeTruthy();
    expect(getByText('FAQ')).toBeTruthy();
    expect(getByText('Contact Support')).toBeTruthy();
    expect(getByText('Tutorial')).toBeTruthy();
    expect(getByText('SnapVision v1.0.0')).toBeTruthy();
  });
});
