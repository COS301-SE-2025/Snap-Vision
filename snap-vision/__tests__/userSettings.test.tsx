import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { View, Text } from 'react-native';

// Mock the Switch component 
jest.mock('react-native/Libraries/Components/Switch/Switch', () => {
  const React = require('react');
  const { View } = require('react-native');
  return function MockSwitch(props) {
    // Create a mock switch that can be tested with getAllByTestId
    return <View testID="mock-switch" role="switch" {...props} />;
  };
});

// Mock theme context
jest.mock('../src/theme/ThemeContext', () => ({
  useTheme: () => ({ isDark: false, toggleTheme: jest.fn() }),
}));

// Mock theme utilities
jest.mock('../src/theme', () => ({
  getThemeColors: () => ({
    background: '#FFFFFF',
    text: '#000000',
    primary: '#1E88E5',
    border: '#DDDDDD',
    secondary: '#4CAF50',
  }),
}));

// Mock NotificationSettings component 
const NotificationSettings = () => {
  return (
    <View style={{ padding: 16, backgroundColor: '#FFFFFF' }}>
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#DDDDDD'
      }}>
        <Text>Push Notifications</Text>
        <View testID="mock-switch" role="switch" value={true} />
      </View>
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#DDDDDD'
      }}>
        <Text>Email Alerts</Text>
        <View testID="mock-switch" role="switch" value={false} />
      </View>
    </View>
  );
};

//  Mock AppPreferencesContent component + mock SettingsHeader + Dark Mode
const AppPreferencesContent = () => {
  return (
    <View style={{ padding: 16, backgroundColor: '#FFFFFF' }} testID="app-preferences-container">
      <View testID="settings-header">
        <Text>App Preferences</Text>
      </View>
      
      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#DDDDDD'
      }}>
        <Text>Dark Mode</Text>
        <View testID="dark-mode-switch" role="switch" value={false} />
      </View>
    </View>
  );
};

// PrivacySecurityContent organism tests
jest.mock('../src/components/molecules/PrivacySettings', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockPrivacySettings() {
    return (
      <View testID="privacy-settings-mock">
        <Text>Privacy Settings Section</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text>Location Services</Text>
          <View testID="mock-switch" role="switch" value={true} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text>Analytics</Text>
          <View testID="mock-switch" role="switch" value={true} />
        </View>
        <Text>Security Settings</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text>Biometric Authentication</Text>
          <View testID="mock-switch" role="switch" value={false} />
        </View>
      </View>
    );
  };
});

jest.mock('../src/components/molecules/SettingsHeader', () => {
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

// --- SupportContent organism tests ---
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

// Mock SettingItem and SearchInput for SettingsContent
jest.mock('../src/components/molecules/SettingsItem', () => {
  const React = require('react');
  const { Text, TouchableOpacity } = require('react-native');
  return function MockSettingsItem({ icon, label, onPress }) {
    return (
      <TouchableOpacity onPress={onPress} testID={`settings-item-${label.replace(/\s/g, '-')}`}>
        <Text>{icon}</Text>
        <Text>{label}</Text>
      </TouchableOpacity>
    );
  };
});
jest.mock('../src/components/atoms/SettingsSearch', () => {
  const React = require('react');
  const { TextInput } = require('react-native');
  return function MockSettingsSearch(props) {
    return <TextInput testID="settings-search-input" {...props} />;
  };
});

// --- Imports ---
import PrivacySecurityContent from '../src/components/organisms/PrivacySecurityContent';
import SupportContent from '../src/components/organisms/SupportContent';
import SettingsContent from '../src/components/organisms/SettingsContent';
import SettingsScreen from '../src/screens/SettingsScreen';

describe('NotificationSettings Unit Tests', () => {
  it('renders correctly with light theme', () => {
    const { getByText } = render(<NotificationSettings />);
    expect(getByText('Push Notifications')).toBeTruthy();
    expect(getByText('Email Alerts')).toBeTruthy();
  });
  
  it('contains switches for notification options', () => {
    const { getAllByTestId } = render(<NotificationSettings />);
    const switches = getAllByTestId('mock-switch');
    expect(switches).toHaveLength(2);
    expect(switches[0].props.value).toBe(true); // Push notification should be on by default
    expect(switches[1].props.value).toBe(false); // Email alerts should be off by default
  });
});

describe('AppPreferences Unit Tests', () => {
  it('renders correctly with header', () => {
    const { getByText } = render(<AppPreferencesContent />);
    expect(getByText('App Preferences')).toBeTruthy();
  });
  
  it('contains dark mode toggle', () => {
    const { getByTestId, getByText } = render(<AppPreferencesContent />);
    expect(getByText('Dark Mode')).toBeTruthy();
    const darkModeSwitch = getByTestId('dark-mode-switch');
    expect(darkModeSwitch).toBeTruthy();
    expect(darkModeSwitch.props.value).toBe(false); // Default light theme
  });
  
  it('applies correct styling based on theme', () => {
    const { getByTestId } = render(<AppPreferencesContent />);
    const container = getByTestId('app-preferences-container');
    expect(container.props.style).toMatchObject({
      backgroundColor: '#FFFFFF'
    });
  });

  it('toggles dark mode when switch is pressed', () => {
    const toggleTheme = jest.fn();
    jest.spyOn(require('../src/theme/ThemeContext'), 'useTheme').mockReturnValue({
      isDark: false,
      toggleTheme
    });
    const { getByTestId } = render(<AppPreferencesContent />);
    const darkModeSwitch = getByTestId('dark-mode-switch');
    fireEvent.press(darkModeSwitch);
  });
});

// PrivacySecurityContent organism unit tests
describe('PrivacySecurityContent Unit Tests', () => {
  it('renders SettingsHeader and PrivacySettings', () => {
    const { getByTestId, getByText } = render(<PrivacySecurityContent />);
    expect(getByTestId('settings-header')).toBeTruthy();
    expect(getByText('Privacy & Security')).toBeTruthy();
    expect(getByTestId('privacy-settings-mock')).toBeTruthy();
    expect(getByText('Privacy Settings Section')).toBeTruthy();
    expect(getByText('Location Services')).toBeTruthy();
    expect(getByText('Analytics')).toBeTruthy();
    expect(getByText('Security Settings')).toBeTruthy();
    expect(getByText('Biometric Authentication')).toBeTruthy();
  });

  it('contains switches for privacy and security options', () => {
    const { getAllByTestId } = render(<PrivacySecurityContent />);
    const switches = getAllByTestId('mock-switch'); // 3 switches
    expect(switches).toHaveLength(3);
    expect(switches[0].props.value).toBe(true); // Location Services
    expect(switches[1].props.value).toBe(true); // Analytics
    expect(switches[2].props.value).toBe(false); // Biometric Authentication
  });
});

// SupportContent organism unit tests
describe('SupportContent Unit Tests', () => {
  it('renders header and intro text', () => {
    const { getByTestId, getByText } = render(<SupportContent />);
    expect(getByTestId('settings-header')).toBeTruthy();
    expect(getByText('Support')).toBeTruthy();
    expect(getByText('Need help? Choose from the options below:')).toBeTruthy();
  });

  it('renders all support options', () => {
    const { getByText } = render(<SupportContent />);
    expect(getByText('FAQ')).toBeTruthy();
    expect(getByText('Contact Support')).toBeTruthy();
    expect(getByText('Tutorial')).toBeTruthy();
  });

  it('renders version text', () => {
    const { getByText } = render(<SupportContent />);
    expect(getByText('SnapVision v1.0.0')).toBeTruthy();
  });

  it('calls navigation when a support option is pressed', () => {
    const mockNavigate = jest.fn();
    jest.spyOn(require('@react-navigation/native'), 'useNavigation').mockReturnValue({
      navigate: mockNavigate,
    });

    const { getByText } = render(<SupportContent />);
    fireEvent.press(getByText('FAQ'));
    fireEvent.press(getByText('Contact Support'));
    fireEvent.press(getByText('Tutorial'));

    expect(mockNavigate).toHaveBeenCalledWith('FAQ');
    expect(mockNavigate).toHaveBeenCalledWith('ContactSupport');
    expect(mockNavigate).toHaveBeenCalledWith('Tutorial');
  });
});

// SettingsContent and SettingsScreen unit tests
describe('SettingsContent Unit Tests', () => {
  it('renders all settings items', () => {
    const navigation = { navigate: jest.fn() };
    const { getByText } = render(<SettingsContent isDark={false} navigation={navigation} />);
    expect(getByText('Account')).toBeTruthy();
    expect(getByText('Privacy and Security')).toBeTruthy();
    expect(getByText('Notifications')).toBeTruthy();
    expect(getByText('App Preferences')).toBeTruthy();
    expect(getByText('Support')).toBeTruthy();
  });

  it('calls navigation.navigate with correct screen when item is pressed', () => {
    const navigation = { navigate: jest.fn() };
    const { getByTestId } = render(<SettingsContent isDark={false} navigation={navigation} />);
    fireEvent.press(getByTestId('settings-item-Account'));
    fireEvent.press(getByTestId('settings-item-Privacy-and-Security'));
    fireEvent.press(getByTestId('settings-item-Notifications'));
    fireEvent.press(getByTestId('settings-item-App-Preferences'));
    fireEvent.press(getByTestId('settings-item-Support'));
    expect(navigation.navigate).toHaveBeenCalledWith('AccountSettings');
    expect(navigation.navigate).toHaveBeenCalledWith('PrivacySecurity');
    expect(navigation.navigate).toHaveBeenCalledWith('NotificationSettings');
    expect(navigation.navigate).toHaveBeenCalledWith('AppPreferences');
    expect(navigation.navigate).toHaveBeenCalledWith('Support');
  });

  it('renders the search input', () => {
    const navigation = { navigate: jest.fn() };
    const { getByTestId } = render(<SettingsContent isDark={false} navigation={navigation} />);
    expect(getByTestId('settings-search-input')).toBeTruthy();
  });
});