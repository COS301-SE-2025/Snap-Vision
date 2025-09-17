import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import AccessibilitySettingsContent from '../src/components/organisms/AccessibilitySettingsContent';
import { useAccessibility } from '../src/context/AccessibilityContext';
import { getThemeColors } from '../src/theme';

//mock dependencies
jest.mock('../src/context/AccessibilityContext', () => ({
  useAccessibility: jest.fn(),
}));

jest.mock('../src/theme', () => ({
  getThemeColors: jest.fn(),
}));

jest.mock('../src/theme', () => ({
  getThemeColors: jest.fn(),
}));

// Add this mock for SettingsHeader
jest.mock('../src/components/molecules/SettingsHeader', () => {
  const React = require('react');
  const { View, Text } = require('react-native');

  function MockedSettingsHeader({ title }: { title: string }) {
    return (
      <View testID="settings-header">
        <Text testID="header-title">{title}</Text>
      </View>
    );
  }

  return MockedSettingsHeader;
});

jest.mock('../src/components/molecules/SettingsToggleItem', () => {
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
// Mock StandardPopup
jest.mock('../src/components/atoms/StandardPopup', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');

  return function MockStandardPopup({ visible, title, message, onConfirm, confirmText }: any) {
    if (!visible) return null;

    return (
      <View testID="standard-popup">
        <Text testID="popup-title">{title}</Text>
        <Text testID="popup-message">{message}</Text>
        <TouchableOpacity testID="popup-confirm" onPress={onConfirm}>
          <Text>{confirmText}</Text>
        </TouchableOpacity>
      </View>
    );
  };
});

const mockUseAccessibility = useAccessibility as jest.MockedFunction<typeof useAccessibility>;
const mockGetThemeColors = getThemeColors as jest.MockedFunction<typeof getThemeColors>;

describe('AccessibilitySettingsContent Unit Tests', () => {
  const mockSetHapticFeedbackEnabled = jest.fn();
  const mockColors = {
    background: '#ffffff',
    text: '#000000',
    subtleText: '#666666',
    border: '#e0e0e0',
    card: '#f8f8f8',
    primary: '#007AFF',
    roleSecondary: '#8e8e93',
    statusActive: '#34c759',
    statusInactive: '#8e8e93',
    danger: '#ff3b30',
    warning: '#ff9500',
    secondary: '#666666',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockGetThemeColors.mockReturnValue(mockColors);

    mockUseAccessibility.mockReturnValue({
      isHapticFeedbackEnabled: false,
      setHapticFeedbackEnabled: mockSetHapticFeedbackEnabled,
      loading: false,
    });
  });

  it('should render SettingsHeader with correct title', () => {
    render(<AccessibilitySettingsContent isDark={false} />);

    expect(screen.getByTestId('settings-header')).toBeTruthy();
    expect(screen.getByTestId('header-title')).toHaveTextContent('Accessibility Settings');
  });

  it('should render loading state when loading is true', () => {
    mockUseAccessibility.mockReturnValue({
      isHapticFeedbackEnabled: false,
      setHapticFeedbackEnabled: mockSetHapticFeedbackEnabled,
      loading: true,
    });
    render(<AccessibilitySettingsContent isDark={false} />);

    expect(screen.getByText('Loading settings...')).toBeTruthy();
    expect(screen.queryByText('Touch & Vibration')).toBeNull();
    expect(screen.getByTestId('settings-header')).toBeTruthy();
  });

  it('should render accessibility settings when not loading', () => {
    render(<AccessibilitySettingsContent isDark={false} />);

    expect(screen.getByText('Touch & Vibration')).toBeTruthy();
    expect(screen.getByTestId('toggle-label')).toBeTruthy();
    expect(screen.getByText('Haptic Feedback')).toBeTruthy();
    expect(
      screen.getByText('Enable vibration feedback for navigation events and interactions'),
    ).toBeTruthy();
    expect(screen.getByText(/Haptic feedback provides tactile confirmation/)).toBeTruthy();
  });

  it('should display haptic feedback as OFF when disabled', () => {
    mockUseAccessibility.mockReturnValue({
      isHapticFeedbackEnabled: false,
      setHapticFeedbackEnabled: mockSetHapticFeedbackEnabled,
      loading: false,
    });

    render(<AccessibilitySettingsContent isDark={false} />);

    expect(screen.getByTestId('toggle-value')).toHaveTextContent('OFF');
  });

  it('should display haptic feedback as ON when enabled', () => {
    mockUseAccessibility.mockReturnValue({
      isHapticFeedbackEnabled: true,
      setHapticFeedbackEnabled: mockSetHapticFeedbackEnabled,
      loading: false,
    });

    render(<AccessibilitySettingsContent isDark={false} />);

    expect(screen.getByTestId('toggle-value')).toHaveTextContent('ON');
  });

  it('should handle successful haptic feedback toggle from OFF to ON', async () => {
    mockSetHapticFeedbackEnabled.mockResolvedValue(undefined);

    render(<AccessibilitySettingsContent isDark={false} />);

    const toggleButton = screen.getByTestId('toggle-button');
    fireEvent.press(toggleButton);

    await waitFor(() => {
      expect(mockSetHapticFeedbackEnabled).toHaveBeenCalledWith(true);
    });

    expect(screen.queryByTestId('standard-popup')).toBeNull();
  });

  it('should handle successful haptic feedback toggle from ON to OFF', async () => {
    mockUseAccessibility.mockReturnValue({
      isHapticFeedbackEnabled: true, // Start with ON
      setHapticFeedbackEnabled: mockSetHapticFeedbackEnabled,
      loading: false,
    });

    mockSetHapticFeedbackEnabled.mockResolvedValue(undefined);

    render(<AccessibilitySettingsContent isDark={false} />);

    const toggleButton = screen.getByTestId('toggle-button');
    fireEvent.press(toggleButton);

    await waitFor(() => {
      expect(mockSetHapticFeedbackEnabled).toHaveBeenCalledWith(false);
    });

    expect(screen.queryByTestId('standard-popup')).toBeNull();
  });

  it('should show error popup when haptic feedback toggle fails', async () => {
    const mockError = new Error('Network error');
    mockSetHapticFeedbackEnabled.mockRejectedValue(mockError);

    render(<AccessibilitySettingsContent isDark={false} />);

    const toggleButton = screen.getByTestId('toggle-button');
    fireEvent.press(toggleButton);

    await waitFor(() => {
      expect(mockSetHapticFeedbackEnabled).toHaveBeenCalledWith(true);
    });

    expect(screen.getByTestId('standard-popup')).toBeTruthy();
    expect(screen.getByTestId('popup-title')).toHaveTextContent('Error');
    expect(screen.getByTestId('popup-message')).toHaveTextContent(
      'Failed to save haptic feedback setting. Please try again.',
    );
  });

  it('should apply light theme colors correctly', () => {
    const lightColors = {
      background: '#ffffff',
      text: '#000000',
      subtleText: '#666666',
      border: '#e0e0e0',
      card: '#f8f8f8',
      primary: '#007AFF',
      roleSecondary: '#8e8e93',
      statusActive: '#34c759',
      statusInactive: '#8e8e93',
      danger: '#ff3b30',
      warning: '#ff9500',
      secondary: '#666666',
    };

    mockGetThemeColors.mockReturnValue(lightColors);

    render(<AccessibilitySettingsContent isDark={false} />);

    expect(mockGetThemeColors).toHaveBeenCalledWith(false);
  });

  it('should apply dark theme colors correctly', () => {
    const darkColors = {
      background: '#000000',
      text: '#ffffff',
      subtleText: '#999999',
      border: '#333333',
      card: '#1c1c1e',
      primary: '#0A84FF',
      roleSecondary: '#8e8e93',
      statusActive: '#30d158',
      statusInactive: '#8e8e93',
      danger: '#ff453a',
      warning: '#ff9f0a',
      secondary: '#999999',
    };

    mockGetThemeColors.mockReturnValue(darkColors);

    render(<AccessibilitySettingsContent isDark={true} />);

    expect(mockGetThemeColors).toHaveBeenCalledWith(true);
  });

  it('should pass correct props to SettingsToggleItem', () => {
    mockUseAccessibility.mockReturnValue({
      isHapticFeedbackEnabled: true,
      setHapticFeedbackEnabled: mockSetHapticFeedbackEnabled,
      loading: false,
    });

    render(<AccessibilitySettingsContent isDark={false} />);

    // Verify all props are passed correctly
    expect(screen.getByText('Haptic Feedback')).toBeTruthy();
    expect(
      screen.getByText('Enable vibration feedback for navigation events and interactions'),
    ).toBeTruthy();
    expect(screen.getByTestId('toggle-value')).toHaveTextContent('ON');
  });

  it('should render info section with correct text', () => {
    render(<AccessibilitySettingsContent isDark={false} />);

    const infoText = screen.getByText(
      /Haptic feedback provides tactile confirmation of your actions and navigation events/,
    );
    expect(infoText).toBeTruthy();
  });

  it('should handle multiple rapid toggle attempts', async () => {
    let callCount = 0;
    mockSetHapticFeedbackEnabled.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve();
      } else {
        return Promise.reject(new Error('Too many requests'));
      }
    });

    render(<AccessibilitySettingsContent isDark={false} />);

    const toggleButton = screen.getByTestId('toggle-button');

    fireEvent.press(toggleButton);
    fireEvent.press(toggleButton);

    await waitFor(() => {
      expect(mockSetHapticFeedbackEnabled).toHaveBeenCalledTimes(2);
    });

    expect(screen.getByTestId('standard-popup')).toBeTruthy();
    expect(screen.getByTestId('popup-title')).toHaveTextContent('Error');
    expect(screen.getByTestId('popup-message')).toHaveTextContent(
      'Failed to save haptic feedback setting. Please try again.',
    );
  });

  it('should maintain component state during theme changes', () => {
    const { rerender } = render(<AccessibilitySettingsContent isDark={false} />);

    expect(mockGetThemeColors).toHaveBeenCalledWith(false);

    rerender(<AccessibilitySettingsContent isDark={true} />);

    expect(mockGetThemeColors).toHaveBeenCalledWith(true);
    expect(screen.getByText('Touch & Vibration')).toBeTruthy();
  });

  it('should handle undefined accessibility context gracefully', () => {
    mockUseAccessibility.mockReturnValue({
      isHapticFeedbackEnabled: undefined as any,
      setHapticFeedbackEnabled: mockSetHapticFeedbackEnabled,
      loading: false,
    });

    render(<AccessibilitySettingsContent isDark={false} />);

    expect(screen.getByText('Touch & Vibration')).toBeTruthy();
  });

  it('should close error popup when OK button is pressed', async () => {
    const mockError = new Error('Network error');
    mockSetHapticFeedbackEnabled.mockRejectedValue(mockError);

    render(<AccessibilitySettingsContent isDark={false} />);

    // Trigger the error by attempting to toggle haptic feedback
    const toggleButton = screen.getByTestId('toggle-button');
    fireEvent.press(toggleButton);

    // Wait for the error popup to appear
    await waitFor(() => {
      expect(screen.getByTestId('standard-popup')).toBeTruthy();
    });

    // Verify the popup is visible
    expect(screen.getByTestId('popup-title')).toHaveTextContent('Error');
    expect(screen.getByTestId('popup-message')).toHaveTextContent(
      'Failed to save haptic feedback setting. Please try again.',
    );

    // Press the OK button to close the popup (this covers line 71)
    const okButton = screen.getByTestId('popup-confirm');
    fireEvent.press(okButton);

    // Verify the popup is no longer visible
    await waitFor(() => {
      expect(screen.queryByTestId('standard-popup')).toBeNull();
    });
  });
});
