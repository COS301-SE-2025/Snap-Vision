import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import NavigationPanel from '../src/components/organisms/NavigationPanel';
import { ThemeProviderWrapper } from './test-utils/ThemeProviderWrapper';

// Mock dependencies
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const { Text } = require('react-native');
  return ({ name, size, color }: any) => (
    <Text testID={`icon-${name}`} style={{ fontSize: size, color }}>
      {name}
    </Text>
  );
});

jest.mock('../src/components/molecules/TextToSpeech', () => {
  const { Text } = require('react-native');
  return ({ text, onSpeakingChange }: any) => (
    <Text testID="text-to-speech">{text}</Text>
  );
});

const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('was not wrapped in act') ||
        args[0].includes('Warning: React'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

describe('NavigationPanel', () => {
  const defaultProps = {
    isNavigating: false,
    isLoading: false,
    onStartNavigation: jest.fn(),
    onStopNavigation: jest.fn(),
    onCancelRoute: jest.fn(),
    progress: 0,
    distance: 1000,
    distanceWalked: 0,
    originalRouteDistance: 1000,
    time: 15,
    destination: 'Test Destination',
    isVoiceEnabled: true,
    onToggleVoice: jest.fn(),
    currentInstruction: 'Turn left at the next intersection',
    onSpeakingChange: jest.fn(),
    showAR: false,
    onToggleAR: jest.fn(),
    destinationCoords: [28.233, -25.755] as [number, number],
    isMinimized: false,
    onToggleMinimize: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders correctly with default props', () => {
      const { getByText, getByTestId } = render(
        <ThemeProviderWrapper>
          <NavigationPanel {...defaultProps} />
        </ThemeProviderWrapper>
      );

      expect(getByText('Test Destination')).toBeTruthy();
      expect(getByText('1.0km left')).toBeTruthy();
      expect(getByText('15 min')).toBeTruthy();
      expect(getByText('Turn left at the next intersection')).toBeTruthy();
    });

    it('renders minimized view when isMinimized is true', () => {
      const { getByText, queryByText } = render(
        <ThemeProviderWrapper>
          <NavigationPanel {...defaultProps} isMinimized={true} />
        </ThemeProviderWrapper>
      );

      expect(getByText('Test Destination • 1.0km left • 15 min • 0%')).toBeTruthy();
      expect(queryByText('Turn left at the next intersection')).toBeNull();
    });

    it('renders loading state when isLoading is true', () => {
      const { getByText } = render(
        <ThemeProviderWrapper>
          <NavigationPanel {...defaultProps} isLoading={true} />
        </ThemeProviderWrapper>
      );

      expect(getByText('Loading')).toBeTruthy();
    });
  });

  describe('Navigation Controls', () => {
    it('calls onStartNavigation when Start button is pressed', () => {
      const { getByText } = render(
        <ThemeProviderWrapper>
          <NavigationPanel {...defaultProps} />
        </ThemeProviderWrapper>
      );

      fireEvent.press(getByText('Start'));
      expect(defaultProps.onStartNavigation).toHaveBeenCalled();
    });

    it('calls onStopNavigation when Stop button is pressed during navigation', () => {
      const { getByText } = render(
        <ThemeProviderWrapper>
          <NavigationPanel {...defaultProps} isNavigating={true} />
        </ThemeProviderWrapper>
      );

      fireEvent.press(getByText('Stop'));
      expect(defaultProps.onStopNavigation).toHaveBeenCalled();
    });

    it('calls onCancelRoute when Cancel button is pressed', () => {
      const { getByText } = render(
        <ThemeProviderWrapper>
          <NavigationPanel {...defaultProps} />
        </ThemeProviderWrapper>
      );

      fireEvent.press(getByText('✕'));
      expect(defaultProps.onCancelRoute).toHaveBeenCalled();
    });
  });

  describe('AR Controls', () => {
    it('hides AR button when destinationCoords is not provided', () => {
      const { queryByTestId } = render(
        <ThemeProviderWrapper>
          <NavigationPanel {...defaultProps} destinationCoords={null} />
        </ThemeProviderWrapper>
      );

      expect(queryByTestId('icon-camera-outline')).toBeNull();
    });
  });

