import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react-native';
import AccessibilitySettingsContent from '../src/components/organisms/AccessibilitySettingsContent';
import { useAccessibility } from '../src/context/AccessibilityContext';
import { getThemeColors } from '../src/theme';
import { useTheme } from '../src/theme/ThemeContext';

//mock dependencies
jest.mock('../src/context/AccessibilityContext', () => ({
  useAccessibility: jest.fn(),
}));

jest.mock('../src/theme', () => ({
  getThemeColors: jest.fn(),
}));

jest.mock('../src/theme/ThemeContext', () => ({
  useTheme: jest.fn(),
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
    const testIdPrefix = label.toLowerCase().replace(/\s+/g, '-');
    return (
      <View testID={testID || `${testIdPrefix}-toggle-item`}>
        <Text testID={`${testIdPrefix}-toggle-label`}>{label}</Text>
        <Text testID={`${testIdPrefix}-toggle-description`}>{description}</Text>
        <TouchableOpacity testID={`${testIdPrefix}-toggle-button`} onPress={() => onToggle(!value)}>
          <Text testID={`${testIdPrefix}-toggle-value`}>{value ? 'ON' : 'OFF'}</Text>
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
const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

describe('AccessibilitySettingsContent Unit Tests', () => {
  const mockSetHapticFeedbackEnabled = jest.fn();
  const mockSetAccessibilityModeEnabled = jest.fn();
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

    mockUseTheme.mockReturnValue({
      theme: 'light',
      isDark: false,
      toggleTheme: jest.fn(),
      setTheme: jest.fn(),
      isLoading: false,
    });

    mockGetThemeColors.mockReturnValue(mockColors);

    mockUseAccessibility.mockReturnValue({
      isHapticFeedbackEnabled: false,
      setHapticFeedbackEnabled: mockSetHapticFeedbackEnabled,
      isAccessibilityModeEnabled: false,
      setAccessibilityModeEnabled: mockSetAccessibilityModeEnabled,
      loading: false,
    });
  });

  it('should render SettingsHeader with correct title', () => {
    render(<AccessibilitySettingsContent />);

    expect(screen.getByTestId('settings-header')).toBeTruthy();
    expect(screen.getByTestId('header-title')).toHaveTextContent('Accessibility Settings');
  });

  it('should render loading state when loading is true', () => {
    mockUseAccessibility.mockReturnValue({
      isHapticFeedbackEnabled: false,
      setHapticFeedbackEnabled: mockSetHapticFeedbackEnabled,
      isAccessibilityModeEnabled: false,
      setAccessibilityModeEnabled: mockSetAccessibilityModeEnabled,
      loading: true,
    });
    render(<AccessibilitySettingsContent />);

    expect(screen.getByText('Loading settings...')).toBeTruthy();
    expect(screen.queryByText('Touch & Vibration')).toBeNull();
    expect(screen.getByTestId('settings-header')).toBeTruthy();
  });

  it('should render accessibility settings when not loading', () => {
    render(<AccessibilitySettingsContent />);

    expect(screen.getByText('Touch & Vibration')).toBeTruthy();
    expect(screen.getByText('Haptic Feedback')).toBeTruthy();
    expect(
      screen.getByText('Enable vibration feedback for navigation events and interactions'),
    ).toBeTruthy();
  });

  it('should display haptic feedback as OFF when disabled', () => {
    mockUseAccessibility.mockReturnValue({
      isHapticFeedbackEnabled: false,
      setHapticFeedbackEnabled: mockSetHapticFeedbackEnabled,
      isAccessibilityModeEnabled: false,
      setAccessibilityModeEnabled: mockSetAccessibilityModeEnabled,
      loading: false,
    });

    render(<AccessibilitySettingsContent />);

    expect(screen.getByTestId('haptic-feedback-toggle-value')).toHaveTextContent('OFF');
  });

  it('should display haptic feedback as ON when enabled', () => {
    mockUseAccessibility.mockReturnValue({
      isHapticFeedbackEnabled: true,
      setHapticFeedbackEnabled: mockSetHapticFeedbackEnabled,
      isAccessibilityModeEnabled: false,
      setAccessibilityModeEnabled: mockSetAccessibilityModeEnabled,
      loading: false,
    });

    render(<AccessibilitySettingsContent />);

    expect(screen.getByTestId('haptic-feedback-toggle-value')).toHaveTextContent('ON');
  });

  it('should handle successful haptic feedback toggle from OFF to ON', async () => {
    mockSetHapticFeedbackEnabled.mockResolvedValue(undefined);

    render(<AccessibilitySettingsContent />);

    const toggleButton = screen.getByTestId('haptic-feedback-toggle-button');
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
      isAccessibilityModeEnabled: false,
      setAccessibilityModeEnabled: mockSetAccessibilityModeEnabled,
      loading: false,
    });

    mockSetHapticFeedbackEnabled.mockResolvedValue(undefined);

    render(<AccessibilitySettingsContent />);

    const toggleButton = screen.getByTestId('haptic-feedback-toggle-button');
    fireEvent.press(toggleButton);

    await waitFor(() => {
      expect(mockSetHapticFeedbackEnabled).toHaveBeenCalledWith(false);
    });

    expect(screen.queryByTestId('standard-popup')).toBeNull();
  });

  it('should show error popup when haptic feedback toggle fails', async () => {
    const mockError = new Error('Network error');
    mockSetHapticFeedbackEnabled.mockRejectedValue(mockError);

    render(<AccessibilitySettingsContent />);

    const toggleButton = screen.getByTestId('haptic-feedback-toggle-button');
    fireEvent.press(toggleButton);

    await waitFor(() => {
      expect(mockSetHapticFeedbackEnabled).toHaveBeenCalledWith(true);
    });

    expect(screen.getByTestId('standard-popup')).toBeTruthy();
    expect(screen.getByTestId('popup-title')).toHaveTextContent('Error');
    expect(screen.getByTestId('popup-message')).toHaveTextContent(
      'Failed to save accessibility setting. Please try again.',
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

    render(<AccessibilitySettingsContent />);

    expect(mockGetThemeColors).toHaveBeenCalledWith('light');
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

    mockUseTheme.mockReturnValue({
      theme: 'dark',
      isDark: true,
      toggleTheme: jest.fn(),
      setTheme: jest.fn(),
      isLoading: false,
    });
    mockGetThemeColors.mockReturnValue(darkColors);

    render(<AccessibilitySettingsContent />);

    expect(mockGetThemeColors).toHaveBeenCalledWith('dark');
  });

  it('should pass correct props to SettingsToggleItem', () => {
    mockUseAccessibility.mockReturnValue({
      isHapticFeedbackEnabled: true,
      setHapticFeedbackEnabled: mockSetHapticFeedbackEnabled,
      isAccessibilityModeEnabled: false,
      setAccessibilityModeEnabled: mockSetAccessibilityModeEnabled,
      loading: false,
    });

    render(<AccessibilitySettingsContent />);

    // Verify haptic feedback props
    expect(screen.getByText('Haptic Feedback')).toBeTruthy();
    expect(
      screen.getByText('Enable vibration feedback for navigation events and interactions'),
    ).toBeTruthy();
    expect(screen.getByTestId('haptic-feedback-toggle-value')).toHaveTextContent('ON');

    // Verify accessibility mode props
    expect(screen.getByText('Accessibility Mode')).toBeTruthy();
    expect(
      screen.getByText('Prioritize elevators over stairs for indoor navigation routes'),
    ).toBeTruthy();
    expect(screen.getByTestId('accessibility-mode-toggle-value')).toHaveTextContent('OFF');
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

    render(<AccessibilitySettingsContent />);

    const toggleButton = screen.getByTestId('haptic-feedback-toggle-button');

    fireEvent.press(toggleButton);
    fireEvent.press(toggleButton);

    await waitFor(() => {
      expect(mockSetHapticFeedbackEnabled).toHaveBeenCalledTimes(2);
    });

    expect(screen.getByTestId('standard-popup')).toBeTruthy();
    expect(screen.getByTestId('popup-title')).toHaveTextContent('Error');
    expect(screen.getByTestId('popup-message')).toHaveTextContent(
      'Failed to save accessibility setting. Please try again.',
    );
  });

  it('should maintain component state during theme changes', () => {
    const { rerender } = render(<AccessibilitySettingsContent />);

    expect(mockGetThemeColors).toHaveBeenCalledWith('light');

    mockUseTheme.mockReturnValue({
      theme: 'dark',
      isDark: true,
      toggleTheme: jest.fn(),
      setTheme: jest.fn(),
      isLoading: false,
    });
    rerender(<AccessibilitySettingsContent />);

    expect(mockGetThemeColors).toHaveBeenCalledWith('dark');
    expect(screen.getByText('Touch & Vibration')).toBeTruthy();
  });

  it('should handle undefined accessibility context gracefully', () => {
    mockUseAccessibility.mockReturnValue({
      isHapticFeedbackEnabled: undefined as any,
      setHapticFeedbackEnabled: mockSetHapticFeedbackEnabled,
      isAccessibilityModeEnabled: undefined as any,
      setAccessibilityModeEnabled: mockSetAccessibilityModeEnabled,
      loading: false,
    });

    render(<AccessibilitySettingsContent />);

    expect(screen.getByText('Touch & Vibration')).toBeTruthy();
  });

  it('should close error popup when OK button is pressed', async () => {
    const mockError = new Error('Network error');
    mockSetHapticFeedbackEnabled.mockRejectedValue(mockError);

    render(<AccessibilitySettingsContent />);

    // Trigger the error by attempting to toggle haptic feedback
    const toggleButton = screen.getByTestId('haptic-feedback-toggle-button');
    fireEvent.press(toggleButton);

    // Wait for the error popup to appear
    await waitFor(() => {
      expect(screen.getByTestId('standard-popup')).toBeTruthy();
    });

    // Verify the popup is visible
    expect(screen.getByTestId('popup-title')).toHaveTextContent('Error');
    expect(screen.getByTestId('popup-message')).toHaveTextContent(
      'Failed to save accessibility setting. Please try again.',
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
