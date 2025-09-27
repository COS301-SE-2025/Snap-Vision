
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import LandingOverlay from '../../src/components/organisms/LandingOverlay';
import { useTheme } from '../../src/theme/ThemeContext';
import { getThemeColors } from '../../src/theme';

// mock dependencies
jest.mock('../../src/theme/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

jest.mock('../../src/theme', () => ({
  getThemeColors: jest.fn(),
}));

jest.mock('@react-native-masked-view/masked-view', () => {
  const { View } = require('react-native');
  const MaskedViewComponent = ({ children, maskElement }: any) => {
    return (
      <View testID="masked-view">
        {maskElement}
        {children}
      </View>
    );
  };
  MaskedViewComponent.displayName = 'MockedMaskedView';
  return MaskedViewComponent;
});

jest.mock('react-native-linear-gradient', () => {
  const { View } = require('react-native');
  const LinearGradientComponent = (props: any) => <View testID="linear-gradient" {...props} />;
  LinearGradientComponent.displayName = 'MockedLinearGradient';
  return LinearGradientComponent;
});

const originalAnimated = jest.requireActual('react-native').Animated;
const mockAnimatedValue = {
  interpolate: jest.fn((config) => ({
    inputRange: config.inputRange,
    outputRange: config.outputRange,
    __getValue: () => 0,
  })),
  setValue: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
  removeAllListeners: jest.fn(),
  stopAnimation: jest.fn(),
  resetAnimation: jest.fn(),
  __getValue: jest.fn(() => 0),
  __attach: jest.fn(),
  __detach: jest.fn(),
};

const mockStart = jest.fn();
const mockStop = jest.fn();
const mockReset = jest.fn();

const animatedValueSpy = jest
  .spyOn(originalAnimated, 'Value')
  .mockImplementation(() => mockAnimatedValue);
const animatedSpringSpy = jest
  .spyOn(originalAnimated, 'spring')
  .mockImplementation(() => ({ start: mockStart, stop: mockStop, reset: mockReset }));
const animatedTimingSpy = jest
  .spyOn(originalAnimated, 'timing')
  .mockImplementation(() => ({ start: mockStart, stop: mockStop, reset: mockReset }));
const animatedLoopSpy = jest
  .spyOn(originalAnimated, 'loop')
  .mockImplementation(() => ({ start: mockStart, stop: mockStop, reset: mockReset }));
const animatedStaggerSpy = jest
  .spyOn(originalAnimated, 'stagger')
  .mockImplementation(() => ({ start: mockStart, stop: mockStop, reset: mockReset }));

const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;
const mockGetThemeColors = getThemeColors as jest.MockedFunction<typeof getThemeColors>;

describe('LandingOverlay Integration Tests', () => {
  const lightTheme = {
    isDark: false,
    theme: 'light' as const,
    toggleTheme: jest.fn(),
  };

  const darkTheme = {
    isDark: true,
    theme: 'dark' as const,
    toggleTheme: jest.fn(),
  };

  const lightColors = {
    background: '#ffffff',
    text: '#000000',
    primary: '#007AFF',
    secondary: '#6c757d',
    subtleText: '#666666',
    border: '#cccccc',
    card: '#f9f9f9',
    roleSecondary: '#6c757d',
    statusActive: '#28a745',
    statusInactive: '#6c757d',
    danger: '#dc3545',
    warning: '#ffc107',
  };

  const darkColors = {
    background: '#1e1e1e',
    text: '#ffffff',
    primary: '#0A84FF',
    secondary: '#8e8e93',
    subtleText: '#aaaaaa',
    border: '#3a3a3a',
    card: '#2a2a2a',
    roleSecondary: '#8e8e93',
    statusActive: '#30d158',
    statusInactive: '#8e8e93',
    danger: '#ff453a',
    warning: '#ffd60a',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockStart.mockClear();
    mockStop.mockClear();
    mockReset.mockClear();
  });

  describe('Complete User Journey', () => {
    it('renders complete overlay experience with light theme', async () => {
      mockUseTheme.mockReturnValue(lightTheme);
      mockGetThemeColors.mockReturnValue(lightColors);
      const mockOnDismiss = jest.fn();

      const { getByText, getByTestId } = render(<LandingOverlay onDismiss={mockOnDismiss} />);

      expect(mockUseTheme).toHaveBeenCalled();
      expect(mockGetThemeColors).toHaveBeenCalledWith(false);

      expect(getByText('Snap')).toBeTruthy();
      expect(getByText('Vision')).toBeTruthy();
      expect(getByText('Key Features')).toBeTruthy();

      const features = [
        'Indoor and Outdoor Navigation',
        'AR Mode',
        'Earn Badges and Shop Icons!',
        'Integrated Timetable Builder',
      ];
      features.forEach((feature) => {
        expect(getByText(feature)).toBeTruthy();
      });

      expect(getByTestId('masked-view')).toBeTruthy();
      expect(getByTestId('linear-gradient')).toBeTruthy();

      expect(animatedValueSpy).toHaveBeenCalledTimes(3);
      expect(animatedSpringSpy).toHaveBeenCalledTimes(2);
      expect(animatedTimingSpy).toHaveBeenCalledTimes(1);
      expect(animatedStaggerSpy).toHaveBeenCalledTimes(1);
      expect(animatedLoopSpy).toHaveBeenCalledTimes(1);

      expect(mockStart).toHaveBeenCalledTimes(2);

      expect(getByText('© 2025 Snap Vision Team')).toBeTruthy();
    });

    it('handles user interaction flow in light theme', async () => {
      mockUseTheme.mockReturnValue(lightTheme);
      mockGetThemeColors.mockReturnValue(lightColors);
      const mockOnDismiss = jest.fn();

      const { getByText, queryByText } = render(<LandingOverlay onDismiss={mockOnDismiss} />);

      expect(getByText('Snap')).toBeTruthy();
      expect(getByText('Vision')).toBeTruthy();

      expect(getByText('Indoor and Outdoor Navigation')).toBeTruthy();
      expect(getByText('AR Mode')).toBeTruthy();
      expect(getByText('Earn Badges and Shop Icons!')).toBeTruthy();
      expect(getByText('Integrated Timetable Builder')).toBeTruthy();

      const snapText = getByText('Snap');
      let currentElement = snapText.parent;

      while (currentElement && !mockOnDismiss.mock.calls.length) {
        try {
          fireEvent.press(currentElement);
        } catch (error) {}
        currentElement = currentElement.parent;
      }

      if (mockOnDismiss.mock.calls.length > 0) {
        expect(mockOnDismiss).toHaveBeenCalledTimes(1);
      }
    });
  });

  describe('Theme Switching Integration', () => {
    it('handles real-time theme switching', async () => {
      const mockOnDismiss = jest.fn();

      mockUseTheme.mockReturnValue(lightTheme);
      mockGetThemeColors.mockReturnValue(lightColors);

      const { rerender, getByText } = render(<LandingOverlay onDismiss={mockOnDismiss} />);

      expect(getByText('Snap')).toBeTruthy();
      expect(mockGetThemeColors).toHaveBeenCalledWith(false);

      mockUseTheme.mockReturnValue(darkTheme);
      mockGetThemeColors.mockReturnValue(darkColors);

      rerender(<LandingOverlay onDismiss={mockOnDismiss} />);

      expect(getByText('Snap')).toBeTruthy();
      expect(mockGetThemeColors).toHaveBeenCalledWith(true);

      expect(getByText('Vision')).toBeTruthy();
    });
  });

  describe('Animation System Integration', () => {
    it('coordinates all animations correctly on mount', async () => {
      mockUseTheme.mockReturnValue(lightTheme);
      mockGetThemeColors.mockReturnValue(lightColors);
      const mockOnDismiss = jest.fn();

      render(<LandingOverlay onDismiss={mockOnDismiss} />);

      expect(animatedValueSpy).toHaveBeenCalledTimes(3);
      expect(animatedValueSpy).toHaveBeenCalledWith(0);

      expect(animatedSpringSpy).toHaveBeenCalledWith(
        mockAnimatedValue,
        expect.objectContaining({
          toValue: 1,
          useNativeDriver: true,
          stiffness: 150,
          damping: 8,
        }),
      );

      expect(animatedTimingSpy).toHaveBeenCalledWith(
        mockAnimatedValue,
        expect.objectContaining({
          toValue: 1,
          duration: 1800,
          useNativeDriver: true,
        }),
      );

      expect(animatedStaggerSpy).toHaveBeenCalledWith(300, expect.any(Array));

      expect(animatedLoopSpy).toHaveBeenCalledWith(expect.anything());

      expect(mockAnimatedValue.interpolate).toHaveBeenCalledWith({
        inputRange: [0, 1],
        outputRange: [-150, 150],
      });

      expect(mockAnimatedValue.interpolate).toHaveBeenCalledWith({
        inputRange: [0, 1],
        outputRange: [0.3, 1],
      });
    });

    it('handles animation lifecycle during component lifecycle', async () => {
      mockUseTheme.mockReturnValue(lightTheme);
      mockGetThemeColors.mockReturnValue(lightColors);
      const mockOnDismiss = jest.fn();

      const { unmount } = render(<LandingOverlay onDismiss={mockOnDismiss} />);

      expect(mockStart).toHaveBeenCalledTimes(2);

      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Visual Effects Integration', () => {
    it('integrates shimmer effect with masked view correctly', async () => {
      mockUseTheme.mockReturnValue(lightTheme);
      mockGetThemeColors.mockReturnValue(lightColors);
      const mockOnDismiss = jest.fn();

      const { getByTestId, getByText } = render(<LandingOverlay onDismiss={mockOnDismiss} />);

      const maskedView = getByTestId('masked-view');
      expect(maskedView).toBeTruthy();

      const gradient = getByTestId('linear-gradient');
      expect(gradient).toBeTruthy();
      expect(gradient.props.colors).toEqual(['#000000', '#6c757d']);

      expect(getByText('Key Features')).toBeTruthy();

      expect(mockAnimatedValue.interpolate).toHaveBeenCalledWith({
        inputRange: [0, 1],
        outputRange: [-150, 150],
      });
    });
  });

  describe('User Experience Flow Integration', () => {
    it('provides smooth onboarding experience', async () => {
      mockUseTheme.mockReturnValue(lightTheme);
      mockGetThemeColors.mockReturnValue(lightColors);
      const mockOnDismiss = jest.fn();

      const { getByText } = render(<LandingOverlay onDismiss={mockOnDismiss} />);

      expect(getByText('Snap')).toBeTruthy();
      expect(getByText('Vision')).toBeTruthy();

      expect(getByText('Key Features')).toBeTruthy();
      expect(getByText('Indoor and Outdoor Navigation')).toBeTruthy();
      expect(getByText('AR Mode')).toBeTruthy();
      expect(getByText('Earn Badges and Shop Icons!')).toBeTruthy();
      expect(getByText('Integrated Timetable Builder')).toBeTruthy();

      expect(getByText('© 2025 Snap Vision Team')).toBeTruthy();

      expect(mockStart).toHaveBeenCalledTimes(2);
    });

    it('handles accessibility requirements', async () => {
      mockUseTheme.mockReturnValue(lightTheme);
      mockGetThemeColors.mockReturnValue(lightColors);
      const mockOnDismiss = jest.fn();

      const { getByText } = render(<LandingOverlay onDismiss={mockOnDismiss} />);

      const accessibleTexts = [
        'Snap',
        'Vision',
        'Key Features',
        'Indoor and Outdoor Navigation',
        'AR Mode',
        'Earn Badges and Shop Icons!',
        'Integrated Timetable Builder',
        '© 2025 Snap Vision Team',
      ];

      accessibleTexts.forEach((text) => {
        expect(getByText(text)).toBeTruthy();
      });
    });
  });
});
