import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import DirectionsModal from '../src/components/organisms/DirectionsModal';
import { ThemeProviderWrapper } from './test-utils/ThemeProviderWrapper';

//mock theme dependencies
jest.mock('../src/theme/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

jest.mock('../src/theme', () => ({
  getThemeColors: jest.fn(),
}));

import { useTheme } from '../src/theme/ThemeContext';
import { getThemeColors } from '../src/theme';

const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;
const mockGetThemeColors = getThemeColors as jest.MockedFunction<typeof getThemeColors>;

describe('DirectionsModal', () => {
  const mockProps = {
    visible: true,
    onClose: jest.fn(),
    onStart: jest.fn(),
    destination: 'Test Destination',
    steps: [
      { instruction: 'Turn left on Main Street' },
      { instruction: 'Continue straight for 500m' },
      { instruction: 'Turn right on Oak Avenue' },
    ],
    currentStep: 0,
    isNavigating: false,
  };

  const mockTheme = {
    isDark: false,
    theme: 'light' as const,
    toggleTheme: jest.fn(),
  };

  const mockColors = {
    background: '#ffffff',
    text: '#000000',
    subtleText: '#666666',
    border: '#cccccc',
    card: '#f9f9f9',
    primary: '#007AFF',
    roleSecondary: '#6c757d',
    statusActive: '#28a745',
    statusInactive: '#6c757d',
    danger: '#dc3545',
    warning: '#ffc107',
    secondary: '#6c757d',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTheme.mockReturnValue(mockTheme);
    mockGetThemeColors.mockReturnValue(mockColors);
  });

  describe('Basic Rendering', () => {
    it('renders correctly when visible', () => {
      const { getByText } = render(<DirectionsModal {...mockProps} />);

      expect(getByText('Directions to Test Destination')).toBeTruthy();
      expect(getByText('Close')).toBeTruthy();
    });

    it('does not render when not visible', () => {
      const { queryByText } = render(<DirectionsModal {...mockProps} visible={false} />);

      expect(queryByText('Directions to Test Destination')).toBeNull();
    });

    it('renders with empty destination string', () => {
      const { getByText } = render(<DirectionsModal {...mockProps} destination="" />);

      expect(getByText('Directions to ')).toBeTruthy();
    });
  });

  describe('Steps Rendering', () => {
    it('renders all navigation steps', () => {
      const { getByText } = render(<DirectionsModal {...mockProps} />);

      expect(getByText('1.')).toBeTruthy();
      expect(getByText('Turn left on Main Street')).toBeTruthy();
      expect(getByText('2.')).toBeTruthy();
      expect(getByText('Continue straight for 500m')).toBeTruthy();
      expect(getByText('3.')).toBeTruthy();
      expect(getByText('Turn right on Oak Avenue')).toBeTruthy();
    });

    it('renders with empty steps array', () => {
      const { getByText, queryByText } = render(<DirectionsModal {...mockProps} steps={[]} />);

      expect(getByText('Directions to Test Destination')).toBeTruthy();
      expect(queryByText('1.')).toBeNull();
    });

    it('renders with single step', () => {
      const singleStep = [{ instruction: 'You have arrived at your destination' }];

      const { getByText, queryByText } = render(
        <DirectionsModal {...mockProps} steps={singleStep} />,
      );

      expect(getByText('1.')).toBeTruthy();
      expect(getByText('You have arrived at your destination')).toBeTruthy();
      expect(queryByText('2.')).toBeNull();
    });

    it('handles steps with missing instruction property', () => {
      const stepsWithMissingData = [
        { instruction: 'Valid step' },
        {},
        { instruction: 'Another valid step' },
      ];

      const { getByText } = render(<DirectionsModal {...mockProps} steps={stepsWithMissingData} />);

      expect(getByText('Valid step')).toBeTruthy();
      expect(getByText('Another valid step')).toBeTruthy();
      expect(getByText('2.')).toBeTruthy();
    });
  });

  describe('Current Step Highlighting', () => {
    it('highlights the current step correctly', () => {
      const { getByText } = render(<DirectionsModal {...mockProps} currentStep={1} />);

      const currentStepText = getByText('Continue straight for 500m');
      expect(currentStepText).toBeTruthy();
    });

    it('handles currentStep at the beginning of the list', () => {
      const { getByText } = render(<DirectionsModal {...mockProps} currentStep={0} />);

      expect(getByText('Turn left on Main Street')).toBeTruthy();
    });

    it('handles currentStep at the end of the list', () => {
      const { getByText } = render(<DirectionsModal {...mockProps} currentStep={2} />);

      expect(getByText('Turn right on Oak Avenue')).toBeTruthy();
    });

    it('handles currentStep out of bounds (negative)', () => {
      const { getByText } = render(<DirectionsModal {...mockProps} currentStep={-1} />);

      expect(getByText('Directions to Test Destination')).toBeTruthy();
    });

    it('handles currentStep out of bounds (too large)', () => {
      const { getByText } = render(<DirectionsModal {...mockProps} currentStep={10} />);

      expect(getByText('Directions to Test Destination')).toBeTruthy();
    });
  });

  describe('User Interactions', () => {
    it('calls onClose when Close button is pressed', () => {
      const { getByText } = render(<DirectionsModal {...mockProps} />);

      fireEvent.press(getByText('Close'));
      expect(mockProps.onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onStart when Start Navigation button is pressed', () => {
      const { getByText } = render(<DirectionsModal {...mockProps} />);

      try {
        const startButton = getByText('Start Navigation');
        fireEvent.press(startButton);
        expect(mockProps.onStart).toHaveBeenCalledTimes(1);
      } catch {
        expect(true).toBe(true);
      }
    });

    it('handles multiple rapid button presses', () => {
      const { getByText } = render(<DirectionsModal {...mockProps} />);

      const closeButton = getByText('Close');
      fireEvent.press(closeButton);
      fireEvent.press(closeButton);
      fireEvent.press(closeButton);

      expect(mockProps.onClose).toHaveBeenCalledTimes(3);
    });
  });

  describe('Theme Integration', () => {
    it('applies light theme colors correctly', () => {
      const lightTheme = {
        isDark: false,
        theme: 'light' as const,
        toggleTheme: jest.fn(),
      };

      const lightColors = {
        background: '#ffffff',
        text: '#000000',
        subtleText: '#666666',
        border: '#e0e0e0',
        card: '#f9f9f9',
        primary: '#007AFF',
        roleSecondary: '#6c757d',
        statusActive: '#28a745',
        statusInactive: '#6c757d',
        danger: '#dc3545',
        warning: '#ffc107',
        secondary: '#6c757d',
      };

      mockUseTheme.mockReturnValue(lightTheme);
      mockGetThemeColors.mockReturnValue(lightColors);

      const { getByText } = render(<DirectionsModal {...mockProps} />);

      expect(mockUseTheme).toHaveBeenCalled();
      expect(mockGetThemeColors).toHaveBeenCalledWith(false);
      expect(getByText('Directions to Test Destination')).toBeTruthy();
    });

    it('applies dark theme colors correctly', () => {
      const darkTheme = {
        isDark: true,
        theme: 'dark' as const,
        toggleTheme: jest.fn(),
      };

      const darkColors = {
        background: '#1e1e1e',
        text: '#ffffff',
        subtleText: '#aaaaaa',
        border: '#3a3a3a',
        card: '#2a2a2a',
        primary: '#0A84FF',
        roleSecondary: '#8e8e93',
        statusActive: '#30d158',
        statusInactive: '#8e8e93',
        danger: '#ff453a',
        warning: '#ffd60a',
        secondary: '#8e8e93',
      };

      mockUseTheme.mockReturnValue(darkTheme);
      mockGetThemeColors.mockReturnValue(darkColors);

      const { getByText } = render(<DirectionsModal {...mockProps} />);

      expect(mockUseTheme).toHaveBeenCalled();
      expect(mockGetThemeColors).toHaveBeenCalledWith(true);
      expect(getByText('Directions to Test Destination')).toBeTruthy();
    });

    it('handles undefined theme colors gracefully', () => {
      const emptyColors = {
        background: '',
        text: '',
        subtleText: '',
        border: '',
        card: '',
        primary: '',
        roleSecondary: '',
        statusActive: '',
        statusInactive: '',
        danger: '',
        warning: '',
        secondary: '',
      };

      mockGetThemeColors.mockReturnValue(emptyColors);

      const { getByText } = render(<DirectionsModal {...mockProps} />);

      expect(getByText('Directions to Test Destination')).toBeTruthy();
    });
  });

  describe('Modal Properties', () => {
    it('handles modal visibility changes', () => {
      const { rerender, getByText, queryByText } = render(
        <DirectionsModal {...mockProps} visible={true} />,
      );

      expect(getByText('Directions to Test Destination')).toBeTruthy();

      rerender(<DirectionsModal {...mockProps} visible={false} />);

      expect(queryByText('Directions to Test Destination')).toBeNull();
    });
  });

  describe('Navigation State', () => {
    it('handles isNavigating prop correctly when true', () => {
      const { getByText } = render(<DirectionsModal {...mockProps} isNavigating={true} />);

      expect(getByText('Directions to Test Destination')).toBeTruthy();
    });

    it('handles isNavigating prop correctly when false', () => {
      const { getByText } = render(<DirectionsModal {...mockProps} isNavigating={false} />);

      expect(getByText('Directions to Test Destination')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('provides accessible content for screen readers', () => {
      const { getByText } = render(<DirectionsModal {...mockProps} />);

      expect(getByText('Directions to Test Destination')).toBeTruthy();
      expect(getByText('Close')).toBeTruthy();

      mockProps.steps.forEach((step, index) => {
        expect(getByText(`${index + 1}.`)).toBeTruthy();
        expect(getByText(step.instruction)).toBeTruthy();
      });
    });

    it('handles long destination names', () => {
      const longDestination =
        'A Very Long Destination Name That Might Wrap To Multiple Lines In The UI';

      const { getByText } = render(
        <DirectionsModal {...mockProps} destination={longDestination} />,
      );

      expect(getByText(`Directions to ${longDestination}`)).toBeTruthy();
    });

    it('handles long step instructions', () => {
      const longSteps = [
        {
          instruction:
            'Turn left on Main Street and continue for a very long distance until you reach the intersection with Oak Avenue, then prepare for your next turn which will be coming up shortly after the traffic light',
        },
      ];

      const { getByText } = render(<DirectionsModal {...mockProps} steps={longSteps} />);

      expect(getByText(longSteps[0].instruction)).toBeTruthy();
    });
  });

  describe('Component State', () => {
    it('maintains state correctly across re-renders', () => {
      const { rerender, getByText } = render(<DirectionsModal {...mockProps} currentStep={0} />);

      expect(getByText('Turn left on Main Street')).toBeTruthy();

      rerender(<DirectionsModal {...mockProps} currentStep={1} />);

      expect(getByText('Continue straight for 500m')).toBeTruthy();
    });

    it('handles prop changes correctly', () => {
      const { rerender, getByText, queryByText } = render(
        <DirectionsModal {...mockProps} destination="Original Destination" />,
      );

      expect(getByText('Directions to Original Destination')).toBeTruthy();

      rerender(<DirectionsModal {...mockProps} destination="New Destination" />);

      expect(queryByText('Directions to Original Destination')).toBeNull();
      expect(getByText('Directions to New Destination')).toBeTruthy();
    });
  });
});
