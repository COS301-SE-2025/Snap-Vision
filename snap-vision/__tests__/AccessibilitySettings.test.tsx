import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
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

jest.mock('../src/components/molecules/SettingsToggleItem', () => {
  const React = require('react');
  const { TouchableOpacity, Text, View } = require('react-native');
  
  return function MockSettingsToggleItem({ 
    icon, 
    label, 
    description, 
    value, 
    onToggle,
    testID 
  }: any) {
    return (
      <View testID={testID || 'settings-toggle-item'}>
        <Text testID="toggle-label">{label}</Text>
        <Text testID="toggle-description">{description}</Text>
        <TouchableOpacity
          testID="toggle-button"
          onPress={() => onToggle(!value)}
        >
          <Text testID="toggle-value">{value ? 'ON' : 'OFF'}</Text>
        </TouchableOpacity>
      </View>
    );
  };
});

// Mock Alert
jest.spyOn(Alert, 'alert');

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

  it('should render loading state when loading is true', () => {
    mockUseAccessibility.mockReturnValue({
      isHapticFeedbackEnabled: false,
      setHapticFeedbackEnabled: mockSetHapticFeedbackEnabled,
      loading: true, // ✅ Test loading state
    });

    render(<AccessibilitySettingsContent isDark={false} navigation={{}} />);

    expect(screen.getByText('Loading settings...')).toBeTruthy();
    expect(screen.queryByText('Touch & Vibration')).toBeNull();
  });

  it('should render accessibility settings when not loading', () => {
    render(<AccessibilitySettingsContent isDark={false} navigation={{}} />);

    expect(screen.getByText('Touch & Vibration')).toBeTruthy();
    expect(screen.getByTestId('toggle-label')).toBeTruthy();
    expect(screen.getByText('Haptic Feedback')).toBeTruthy();
    expect(screen.getByText('Enable vibration feedback for navigation events and interactions')).toBeTruthy();
    expect(screen.getByText(/Haptic feedback provides tactile confirmation/)).toBeTruthy();
  });

  it('should display haptic feedback as OFF when disabled', () => {
    mockUseAccessibility.mockReturnValue({
      isHapticFeedbackEnabled: false, // ✅ Test OFF state
      setHapticFeedbackEnabled: mockSetHapticFeedbackEnabled,
      loading: false,
    });

    render(<AccessibilitySettingsContent isDark={false} navigation={{}} />);

    expect(screen.getByTestId('toggle-value')).toHaveTextContent('OFF');
  });

  it('should display haptic feedback as ON when enabled', () => {
    mockUseAccessibility.mockReturnValue({
      isHapticFeedbackEnabled: true, // ✅ Test ON state
      setHapticFeedbackEnabled: mockSetHapticFeedbackEnabled,
      loading: false,
    });

    render(<AccessibilitySettingsContent isDark={false} navigation={{}} />);

    expect(screen.getByTestId('toggle-value')).toHaveTextContent('ON');
  });

  it('should handle successful haptic feedback toggle from OFF to ON', async () => {
    mockSetHapticFeedbackEnabled.mockResolvedValue(undefined);

    render(<AccessibilitySettingsContent isDark={false} navigation={{}} />);

    const toggleButton = screen.getByTestId('toggle-button');
    fireEvent.press(toggleButton);

    await waitFor(() => {
      expect(mockSetHapticFeedbackEnabled).toHaveBeenCalledWith(true);
    });

    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('should handle successful haptic feedback toggle from ON to OFF', async () => {
    mockUseAccessibility.mockReturnValue({
      isHapticFeedbackEnabled: true, // Start with ON
      setHapticFeedbackEnabled: mockSetHapticFeedbackEnabled,
      loading: false,
    });

    mockSetHapticFeedbackEnabled.mockResolvedValue(undefined);

    render(<AccessibilitySettingsContent isDark={false} navigation={{}} />);

    const toggleButton = screen.getByTestId('toggle-button');
    fireEvent.press(toggleButton);

    await waitFor(() => {
      expect(mockSetHapticFeedbackEnabled).toHaveBeenCalledWith(false);
    });

    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('should show error alert when haptic feedback toggle fails', async () => {
    const mockError = new Error('Network error');
    mockSetHapticFeedbackEnabled.mockRejectedValue(mockError);

    render(<AccessibilitySettingsContent isDark={false} navigation={{}} />);

    const toggleButton = screen.getByTestId('toggle-button');
    fireEvent.press(toggleButton);

    await waitFor(() => {
      expect(mockSetHapticFeedbackEnabled).toHaveBeenCalledWith(true);
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Error',
      'Failed to save haptic feedback setting. Please try again.'
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

    render(<AccessibilitySettingsContent isDark={false} navigation={{}} />);

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

    render(<AccessibilitySettingsContent isDark={true} navigation={{}} />);

    expect(mockGetThemeColors).toHaveBeenCalledWith(true);
  });

  it('should pass correct props to SettingsToggleItem', () => {
    mockUseAccessibility.mockReturnValue({
      isHapticFeedbackEnabled: true,
      setHapticFeedbackEnabled: mockSetHapticFeedbackEnabled,
      loading: false,
    });

    render(<AccessibilitySettingsContent isDark={false} navigation={{}} />);

    // Verify all props are passed correctly
    expect(screen.getByText('Haptic Feedback')).toBeTruthy();
    expect(screen.getByText('Enable vibration feedback for navigation events and interactions')).toBeTruthy();
    expect(screen.getByTestId('toggle-value')).toHaveTextContent('ON');
  });

  it('should render info section with correct text', () => {
    render(<AccessibilitySettingsContent isDark={false} navigation={{}} />);

    const infoText = screen.getByText(
      /Haptic feedback provides tactile confirmation of your actions and navigation events/
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

    render(<AccessibilitySettingsContent isDark={false} navigation={{}} />);

    const toggleButton = screen.getByTestId('toggle-button');
    
    fireEvent.press(toggleButton);
    fireEvent.press(toggleButton);

    await waitFor(() => {
      expect(mockSetHapticFeedbackEnabled).toHaveBeenCalledTimes(2);
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Error',
      'Failed to save haptic feedback setting. Please try again.'
    );
  });

  it('should maintain component state during theme changes', () => {
    const { rerender } = render(<AccessibilitySettingsContent isDark={false} navigation={{}} />);

    expect(mockGetThemeColors).toHaveBeenCalledWith(false);

    rerender(<AccessibilitySettingsContent isDark={true} navigation={{}} />);

    expect(mockGetThemeColors).toHaveBeenCalledWith(true);
    expect(screen.getByText('Touch & Vibration')).toBeTruthy();
  });

  it('should handle undefined accessibility context gracefully', () => {
    mockUseAccessibility.mockReturnValue({
      isHapticFeedbackEnabled: undefined as any,
      setHapticFeedbackEnabled: mockSetHapticFeedbackEnabled,
      loading: false,
    });

    render(<AccessibilitySettingsContent isDark={false} navigation={{}} />);

    expect(screen.getByText('Touch & Vibration')).toBeTruthy();
  });
});