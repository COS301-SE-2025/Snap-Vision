import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import NavigationPanel from '../src/components/organisms/NavigationPanel';
import { ThemeProviderWrapper } from './test-utils/ThemeProviderWrapper';

// Mock dependencies
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const MockMaterialCommunityIcons = ({ name, size, color }: any) =>
    React.createElement(
      Text,
      {
        testID: `icon-${name}`,
        style: { fontSize: size, color },
      },
      name,
    );
  MockMaterialCommunityIcons.displayName = 'MockMaterialCommunityIcons';
  return MockMaterialCommunityIcons;
});

jest.mock('../src/components/molecules/TextToSpeech', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const MockTextToSpeech = ({ text }: any) =>
    React.createElement(Text, { testID: 'text-to-speech' }, text);
  MockTextToSpeech.displayName = 'MockTextToSpeech';
  return MockTextToSpeech;
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
      const { getByText } = render(
        <ThemeProviderWrapper>
          <NavigationPanel {...defaultProps} />
        </ThemeProviderWrapper>,
      );

      expect(getByText('Test Destination')).toBeTruthy();
      expect(getByText('1.0km left')).toBeTruthy();
      expect(getByText('15 min')).toBeTruthy();
    });

    it('renders minimized view when isMinimized is true', () => {
      const { getByText, queryByText } = render(
        <ThemeProviderWrapper>
          <NavigationPanel {...defaultProps} isMinimized={true} />
        </ThemeProviderWrapper>,
      );

      expect(getByText('Test Destination • 1.0km left • 15 min • 0%')).toBeTruthy();
      expect(queryByText('Turn left at the next intersection')).toBeNull();
    });

    it('renders loading state when isLoading is true', () => {
      const { getByText } = render(
        <ThemeProviderWrapper>
          <NavigationPanel {...defaultProps} isLoading={true} />
        </ThemeProviderWrapper>,
      );

      expect(getByText('Loading')).toBeTruthy();
    });
  });

  describe('Navigation Controls', () => {
    it('calls onStartNavigation when Start button is pressed', () => {
      const { getByText } = render(
        <ThemeProviderWrapper>
          <NavigationPanel {...defaultProps} />
        </ThemeProviderWrapper>,
      );

      fireEvent.press(getByText('Start'));
      expect(defaultProps.onStartNavigation).toHaveBeenCalled();
    });

    it('calls onStopNavigation when Stop button is pressed during navigation', () => {
      const { getByText } = render(
        <ThemeProviderWrapper>
          <NavigationPanel {...defaultProps} isNavigating={true} />
        </ThemeProviderWrapper>,
      );

      fireEvent.press(getByText('stop'));
      expect(defaultProps.onStopNavigation).toHaveBeenCalled();
    });

    it('calls onCancelRoute when Cancel button is pressed', () => {
      const { getByText } = render(
        <ThemeProviderWrapper>
          <NavigationPanel {...defaultProps} />
        </ThemeProviderWrapper>,
      );

      fireEvent.press(getByText('close'));
      expect(defaultProps.onCancelRoute).toHaveBeenCalled();
    });
  });

  describe('AR Controls', () => {
    it('hides AR button when destinationCoords is not provided', () => {
      const { queryByTestId } = render(
        <ThemeProviderWrapper>
          <NavigationPanel {...defaultProps} destinationCoords={null} />
        </ThemeProviderWrapper>,
      );

      expect(queryByTestId('icon-camera-outline')).toBeNull();
    });
  });

  describe('Minimized View Controls', () => {
    it('calls onToggleMinimize when minimized content is pressed', () => {
      const { getByText } = render(
        <ThemeProviderWrapper>
          <NavigationPanel {...defaultProps} isMinimized={true} />
        </ThemeProviderWrapper>,
      );

      fireEvent.press(getByText('Test Destination • 1.0km left • 15 min • 0%'));
      expect(defaultProps.onToggleMinimize).toHaveBeenCalled();
    });



    it('calls onStopNavigation when minimized stop button is pressed', () => {
      const { getAllByTestId } = render(
        <ThemeProviderWrapper>
          <NavigationPanel {...defaultProps} isMinimized={true} isNavigating={true} />
        </ThemeProviderWrapper>,
      );

      // Find all mini buttons and press the second one (stop)
      const miniButtons = getAllByTestId('icon-stop');
      expect(miniButtons.length).toBeGreaterThan(0);
      fireEvent.press(miniButtons[0]);
      expect(defaultProps.onStopNavigation).toHaveBeenCalled();
    });

    it('calls onToggleAR when minimized AR button is pressed', () => {
      const mockOnToggleAR = jest.fn();
      const { getAllByTestId } = render(
        <ThemeProviderWrapper>
          <NavigationPanel {...defaultProps} isMinimized={true} isNavigating={true} onToggleAR={mockOnToggleAR} />
        </ThemeProviderWrapper>,
      );

      // Find all mini buttons and press the AR button (camera-outline)
      const miniButtons = getAllByTestId('icon-camera-outline');
      expect(miniButtons.length).toBeGreaterThan(0);
      fireEvent.press(miniButtons[0]);
      expect(mockOnToggleAR).toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('renders loading state correctly when isLoading is true (duplicate check coverage)', () => {
      const { getByText } = render(
        <ThemeProviderWrapper>
          <NavigationPanel {...defaultProps} isLoading={true} />
        </ThemeProviderWrapper>,
      );

      expect(getByText('Loading')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles zero distance gracefully', () => {
      const { getByText } = render(
        <ThemeProviderWrapper>
          <NavigationPanel {...defaultProps} distance={0} />
        </ThemeProviderWrapper>,
      );

      expect(getByText('0m left')).toBeTruthy();
    });

    it('handles null time gracefully', () => {
      const { queryByText } = render(
        <ThemeProviderWrapper>
          <NavigationPanel {...defaultProps} time={null} />
        </ThemeProviderWrapper>,
      );

      expect(queryByText('min')).toBeNull();
    });

    it('handles very large distances correctly', () => {
      const { getByText } = render(
        <ThemeProviderWrapper>
          <NavigationPanel {...defaultProps} distance={15000} />
        </ThemeProviderWrapper>,
      );

      expect(getByText('15.0km left')).toBeTruthy();
    });

    it('renders "< 1 min" when time is less than 1', () => {
      const { getByText } = render(
        <ThemeProviderWrapper>
          <NavigationPanel {...defaultProps} time={0.5} />
        </ThemeProviderWrapper>,
      );

      expect(getByText('< 1 min')).toBeTruthy();
    });
  });

  describe('Toggle Tests', () => {
    it(' duplicate loading state (lines 60-65)', () => {
      const { getAllByText } = render(
        <ThemeProviderWrapper>
          <NavigationPanel {...defaultProps} isLoading={true} />
        </ThemeProviderWrapper>,
      );

      // Should only render one "Loading" text despite duplicate check
      const loadingElements = getAllByText('Loading');
      expect(loadingElements).toHaveLength(1);
    });

    it(' onToggleMinimize in minimized view (line 99)', () => {
      const mockOnToggleMinimize = jest.fn();
      const { getByText } = render(
        <ThemeProviderWrapper>
          <NavigationPanel
            {...defaultProps}
            isMinimized={true}
            onToggleMinimize={mockOnToggleMinimize}
          />
        </ThemeProviderWrapper>,
      );

      // Find and press the minimized content
      const minimizedContent = getByText('Test Destination • 1.0km left • 15 min • 0%');
      fireEvent.press(minimizedContent);
      expect(mockOnToggleMinimize).toHaveBeenCalledTimes(1);
    });

    it(' onToggleAR in minimized controls (line 116)', () => {
      const mockOnToggleAR = jest.fn();
      const { getAllByTestId } = render(
        <ThemeProviderWrapper>
          <NavigationPanel {...defaultProps} isMinimized={true} isNavigating={true} onToggleAR={mockOnToggleAR} />
        </ThemeProviderWrapper>,
      );

      // Find all camera-outline icons and press the one in minimized controls
      const cameraIcons = getAllByTestId('icon-camera-outline');
      expect(cameraIcons.length).toBeGreaterThan(0);

      // Press the last camera icon (which should be in minimized controls)
      fireEvent.press(cameraIcons[cameraIcons.length - 1]);
      expect(mockOnToggleAR).toHaveBeenCalledTimes(1);
    });

    it(' edge case when onToggleAR is undefined in minimized view', () => {
      const { queryAllByTestId } = render(
        <ThemeProviderWrapper>
          <NavigationPanel {...defaultProps} isMinimized={true} onToggleAR={undefined} />
        </ThemeProviderWrapper>,
      );

      // Should not render AR button when onToggleAR is undefined
      const cameraIcons = queryAllByTestId('icon-camera-outline');
      expect(cameraIcons.length).toBe(0);
    });

    it(' edge case when onToggleMinimize is undefined', () => {
      const { queryByTestId } = render(
        <ThemeProviderWrapper>
          <NavigationPanel {...defaultProps} onToggleMinimize={undefined} />
        </ThemeProviderWrapper>,
      );

      // Should not render minimize button when onToggleMinimize is undefined
      expect(queryByTestId('icon-chevron-down')).toBeNull();
    });

    it(' edge case when destinationCoords is null', () => {
      const { queryByText } = render(
        <ThemeProviderWrapper>
          <NavigationPanel {...defaultProps} destinationCoords={null} />
        </ThemeProviderWrapper>,
      );

      // Should not render AR button text
      expect(queryByText('AR')).toBeNull();
    });

    it(' edge case when isNavigating is false', () => {
      const { queryByTestId } = render(
        <ThemeProviderWrapper>
          <NavigationPanel {...defaultProps} isNavigating={false} />
        </ThemeProviderWrapper>,
      );

      // Should not render voice button when not navigating
      expect(queryByTestId('icon-volume-high')).toBeNull();
    });

    it(' formatDistance with null input', () => {
      const { queryByText } = render(
        <ThemeProviderWrapper>
          <NavigationPanel {...defaultProps} distance={null} />
        </ThemeProviderWrapper>,
      );

      // Should not render distance text when distance is null
      expect(queryByText('km left')).toBeNull();
      expect(queryByText('m left')).toBeNull();
    });

    it(' formatTime with null input', () => {
      const { queryByText } = render(
        <ThemeProviderWrapper>
          <NavigationPanel {...defaultProps} time={null} />
        </ThemeProviderWrapper>,
      );

      // Should not render time text when time is null
      expect(queryByText('min')).toBeNull();
    });
  });

  describe('NavigationPanel primary button rendering', () => {
    const baseProps = {
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
      currentInstruction: '',
      onSpeakingChange: jest.fn(),
      showAR: false,
      onToggleAR: jest.fn(),
      destinationCoords: [1, 2] as [number, number],
      isMinimized: false,
      onToggleMinimize: jest.fn(),
    };

    it('renders Start button and icon when not navigating and not loading', () => {
      const { getByText } = render(
        <ThemeProviderWrapper>
          <NavigationPanel {...baseProps} />
        </ThemeProviderWrapper>,
      );
      expect(getByText('Start')).toBeTruthy();
    });

    it('renders Loading button and icon when loading', () => {
      const { getByText } = render(
        <ThemeProviderWrapper>
          <NavigationPanel {...baseProps} isLoading={true} />
        </ThemeProviderWrapper>,
      );
      expect(getByText('Loading')).toBeTruthy();
    });

    it('renders Stop button and icon when navigating', () => {
      const { getByText } = render(
        <ThemeProviderWrapper>
          <NavigationPanel {...baseProps} isNavigating={true} />
        </ThemeProviderWrapper>,
      );
      expect(getByText('stop')).toBeTruthy();
    });

    it('renders Icon "loading" when loading and AR toggle is available', () => {
      const { getByTestId } = render(
        <ThemeProviderWrapper>
          <NavigationPanel {...baseProps} isLoading={true} isNavigating={true} showAR={true} />
        </ThemeProviderWrapper>,
      );
      expect(getByTestId('icon-loading')).toBeTruthy();
    });

    it('renders Icon "stop" when navigating and AR toggle is available', () => {
      const { getByTestId } = render(
        <ThemeProviderWrapper>
          <NavigationPanel {...baseProps} isNavigating={true} showAR={true} />
        </ThemeProviderWrapper>,
      );
      expect(getByTestId('icon-stop')).toBeTruthy();
    });
  });
});
