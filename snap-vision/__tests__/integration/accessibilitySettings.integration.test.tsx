import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import AccessibilitySettingsContent from '../../src/components/organisms/AccessibilitySettingsContent';
import { AccessibilityProvider } from '../../src/context/AccessibilityContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

//mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock StandardPopup component
const mockStandardPopup = jest.fn();
jest.mock('../../src/components/atoms/StandardPopup', () => {
  return jest.fn(({ visible, title, message, onConfirm, confirmText, showCancel }) => {
    const { View, Text, TouchableOpacity } = require('react-native');

    // Call the mock function to track calls
    mockStandardPopup({ visible, title, message, onConfirm, confirmText, showCancel });

    // Return a proper React component
    if (!visible) return null;
    return (
      <View testID="standard-popup">
        <Text testID="popup-title">{title}</Text>
        <Text testID="popup-message">{message}</Text>
        <TouchableOpacity onPress={onConfirm} testID="popup-confirm">
          <Text>{confirmText}</Text>
        </TouchableOpacity>
      </View>
    );
  });
});

jest.mock('../../src/theme', () => ({
  getThemeColors: jest.fn(() => ({
    background: '#ffffff',
    text: '#000000',
    primary: '#007AFF',
    secondary: '#666666',
  })),
}));

jest.mock('../../src/components/molecules/SettingsToggleItem', () => {
  const React = require('react');
  const { TouchableOpacity, Text, View } = require('react-native');

  return function MockSettingsToggleItem({
    icon,
    label,
    description,
    value,
    onToggle,
    testID,
  }: any) {
    return (
      <View testID={testID || 'settings-toggle-item'}>
        <Text testID="toggle-label">{label}</Text>
        <Text testID="toggle-description">{description}</Text>
        <TouchableOpacity testID="toggle-button" onPress={() => onToggle(!value)}>
          <Text testID="toggle-value">{value ? 'ON' : 'OFF'}</Text>
        </TouchableOpacity>
      </View>
    );
  };
});

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

const TestComponent = ({ isDark = false }: { isDark?: boolean }) => (
  <AccessibilityProvider>
    <AccessibilitySettingsContent isDark={isDark} navigation={{}} />
  </AccessibilityProvider>
);

describe('AccessibilitySettingsContent Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAsyncStorage.getItem.mockResolvedValue(null);
    mockAsyncStorage.setItem.mockResolvedValue();
    mockStandardPopup.mockClear();
  });

  it('should load saved haptic feedback preference from storage', async () => {
    // Mock stored preference as enabled
    mockAsyncStorage.getItem.mockResolvedValue('true');

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.queryByText('Loading settings...')).toBeNull();
    });

    expect(screen.getByTestId('toggle-value')).toHaveTextContent('ON');
  });

  it('should handle AsyncStorage errors gracefully', async () => {
    // Mock AsyncStorage to throw error
    mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.queryByText('Loading settings...')).toBeNull();
    });

    expect(screen.getByText('Touch & Vibration')).toBeTruthy();
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should show error when AsyncStorage write fails', async () => {
    mockAsyncStorage.getItem.mockResolvedValue('false');
    mockAsyncStorage.setItem.mockRejectedValue(new Error('Write failed'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.queryByText('Loading settings...')).toBeNull();
    });

    const toggleButton = screen.getByTestId('toggle-button');
    fireEvent.press(toggleButton);

    await waitFor(() => {
      expect(mockStandardPopup).toHaveBeenCalledWith({
        visible: true,
        title: 'Error',
        message: 'Failed to save haptic feedback setting. Please try again.',
        onConfirm: expect.any(Function),
        confirmText: 'OK',
        showCancel: false,
      });
    });
  });

  it('should integrate properly with navigation prop', async () => {
    const mockNavigation = {
      navigate: jest.fn(),
      goBack: jest.fn(),
    };

    mockAsyncStorage.getItem.mockResolvedValue('false');

    render(
      <AccessibilityProvider>
        <AccessibilitySettingsContent isDark={false} navigation={mockNavigation} />
      </AccessibilityProvider>,
    );

    await waitFor(() => {
      expect(screen.queryByText('Loading settings...')).toBeNull();
    });

    expect(screen.getByText('Touch & Vibration')).toBeTruthy();
  });
});
