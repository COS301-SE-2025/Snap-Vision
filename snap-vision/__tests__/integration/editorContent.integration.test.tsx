import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import AdminScreenContent from '../../src/components/organisms/EditorContent';
import { ThemeProviderWrapper } from '../test-utils/ThemeProviderWrapper';
import { useNavigation } from '@react-navigation/native';



// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  dispatch: jest.fn(),
  setOptions: jest.fn(),
  isFocused: jest.fn(() => true),
  canGoBack: jest.fn(() => false),
  getId: jest.fn(),
  getParent: jest.fn(),
  getState: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
}));

// Mock child components with proper TypeScript typing
jest.mock('../../src/components/atoms/AppButton', () => {
  const { Text, TouchableOpacity } = require('react-native');
  const MockAppButton = ({
    title,
    onPress,
    testID,
  }: {
    title: string;
    onPress: () => void;
    testID?: string;
  }) => (
    <TouchableOpacity testID={testID} onPress={onPress} accessibilityLabel={title}>
      <Text>{title}</Text>
    </TouchableOpacity>
  );
  MockAppButton.displayName = 'MockAppButton';
  return MockAppButton;
});

describe('EditorContent Integration Tests', () => {
  const mockColors = {
    background: '#ffffff',
    primary: '#007AFF',
  };

  const mockHandlers = {
    onLoadFloorplans: jest.fn(),
    onEditFloorplans: jest.fn(),
    onFloorplanEditor: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
  });

  describe('Component Integration & Rendering', () => {
    it('renders all components with correct text and styles', () => {
      const { getByText, getByTestId } = render(
        <ThemeProviderWrapper>
          <AdminScreenContent colors={mockColors} {...mockHandlers} />
        </ThemeProviderWrapper>,
      );

      // Verify main container
      const container = getByTestId('editor-container');
      expect(container.props.style).toContainEqual(
        expect.objectContaining({ backgroundColor: mockColors.background }),
      );

      // Verify text elements
      const editorText = getByText('Editor');
      const dashboardText = getByText('DASHBOARD');

      expect(editorText.props.style).toMatchObject({
        fontSize: 72,
        fontFamily: 'ChicleRegular',
        color: mockColors.primary,
      });

      expect(dashboardText.props.style).toMatchObject({
        fontSize: 72,
        fontFamily: 'ChicleRegular',
        color: mockColors.primary,
      });

      // Verify button container
      const buttonContainer = getByTestId('button-container');
      expect(buttonContainer.props.style).toEqual({
        width: '100%',
        maxWidth: 300,
      });
    });

    it('renders all action buttons with correct props', () => {
      const { getByTestId, getByText } = render(
        <ThemeProviderWrapper>
          <AdminScreenContent colors={mockColors} {...mockHandlers} />
        </ThemeProviderWrapper>,
      );

      const loadButton = getByTestId('button-Load-Floorplans');
      const editButton = getByTestId('button-Edit-Floorplans');

      expect(loadButton).toBeTruthy();
      expect(editButton).toBeTruthy();
      expect(getByText('Load Floorplans')).toBeTruthy();
      expect(getByText('Edit Floorplans')).toBeTruthy();
    });
  });

  describe('Button Action Integration', () => {
    it('calls the correct handlers when buttons are pressed', () => {
      const { getByTestId } = render(
        <ThemeProviderWrapper>
          <AdminScreenContent colors={mockColors} {...mockHandlers} />
        </ThemeProviderWrapper>,
      );

      fireEvent.press(getByTestId('button-Load-Floorplans'));
      expect(mockHandlers.onLoadFloorplans).toHaveBeenCalledTimes(1);

      fireEvent.press(getByTestId('button-Edit-Floorplans'));
      expect(mockHandlers.onEditFloorplans).toHaveBeenCalledTimes(1);
    });

    it('integrates with navigation when buttons are pressed', () => {
      // If your buttons should navigate somewhere, you can test that here
      // For example, if you modify the component to use navigation:
      // fireEvent.press(getByTestId('some-button'));
      // expect(mockNavigation.navigate).toHaveBeenCalledWith('SomeScreen');
    });
  });

  describe('Theme Integration', () => {
    it('applies dark theme correctly', () => {
      const darkColors = {
        background: '#121212',
        primary: '#BB86FC',
      };

      const { getByTestId, getByText } = render(
        <ThemeProviderWrapper>
          <AdminScreenContent colors={darkColors} {...mockHandlers} />
        </ThemeProviderWrapper>,
      );

      const container = getByTestId('editor-container');
      expect(container.props.style).toContainEqual(
        expect.objectContaining({ backgroundColor: darkColors.background }),
      );

      const editorText = getByText('Editor');
      expect(editorText.props.style).toMatchObject({
        color: darkColors.primary,
      });
    });

    it('applies light theme correctly', () => {
      const lightColors = {
        background: '#f5f5f5',
        primary: '#6200EE',
      };

      const { getByTestId, getByText } = render(
        <ThemeProviderWrapper>
          <AdminScreenContent colors={lightColors} {...mockHandlers} />
        </ThemeProviderWrapper>,
      );

      const container = getByTestId('editor-container');
      expect(container.props.style).toContainEqual(
        expect.objectContaining({ backgroundColor: lightColors.background }),
      );

      const dashboardText = getByText('DASHBOARD');
      expect(dashboardText.props.style).toMatchObject({
        color: lightColors.primary,
      });
    });
  });

  describe('Optional Props Handling', () => {
    it('renders correctly without optional props', () => {
      const { getByTestId } = render(
        <ThemeProviderWrapper>
          <AdminScreenContent
            colors={mockColors}
            onLoadFloorplans={mockHandlers.onLoadFloorplans}
            onEditFloorplans={mockHandlers.onEditFloorplans}
          />
        </ThemeProviderWrapper>,
      );

      expect(getByTestId('editor-container')).toBeTruthy();
    });

    it('handles optional onFloorplanEditor prop when provided', () => {
      const { getByTestId } = render(
        <ThemeProviderWrapper>
          <AdminScreenContent
            colors={mockColors}
            onLoadFloorplans={mockHandlers.onLoadFloorplans}
            onEditFloorplans={mockHandlers.onEditFloorplans}
            onFloorplanEditor={mockHandlers.onFloorplanEditor}
          />
        </ThemeProviderWrapper>,
      );

      // If you have a button that uses onFloorplanEditor, you could test it here
    });
  });

  describe('Accessibility Integration', () => {
    it('has proper accessibility labels for interactive elements', () => {
      const { getByLabelText } = render(
        <ThemeProviderWrapper>
          <AdminScreenContent colors={mockColors} {...mockHandlers} />
        </ThemeProviderWrapper>,
      );

      expect(getByLabelText('Load Floorplans')).toBeTruthy();
      expect(getByLabelText('Edit Floorplans')).toBeTruthy();
    });

    it('has proper testIDs for testing', () => {
      const { getByTestId } = render(
        <ThemeProviderWrapper>
          <AdminScreenContent colors={mockColors} {...mockHandlers} />
        </ThemeProviderWrapper>,
      );

      expect(getByTestId('editor-container')).toBeTruthy();
      expect(getByTestId('button-container')).toBeTruthy();
      expect(getByTestId('button-Load-Floorplans')).toBeTruthy();
      expect(getByTestId('button-Edit-Floorplans')).toBeTruthy();
    });
  });

  describe('Layout Integration', () => {
    it('maintains proper layout structure', () => {
      const { getByTestId } = render(
        <ThemeProviderWrapper>
          <AdminScreenContent colors={mockColors} {...mockHandlers} />
        </ThemeProviderWrapper>,
      );

      const container = getByTestId('editor-container');
      expect(container.props.style).toContainEqual(
        expect.objectContaining({
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
        }),
      );

      const buttonContainer = getByTestId('button-container');
      expect(buttonContainer.props.style).toEqual({
        width: '100%',
        maxWidth: 300,
      });
    });
  });

  describe('Complete Workflow', () => {
    it('executes complete admin workflow', () => {
      const { getByTestId } = render(
        <ThemeProviderWrapper>
          <AdminScreenContent colors={mockColors} {...mockHandlers} />
        </ThemeProviderWrapper>,
      );

      // Simulate admin loading floorplans
      fireEvent.press(getByTestId('button-Load-Floorplans'));
      expect(mockHandlers.onLoadFloorplans).toHaveBeenCalledTimes(1);

      // Simulate admin editing floorplans
      fireEvent.press(getByTestId('button-Edit-Floorplans'));
      expect(mockHandlers.onEditFloorplans).toHaveBeenCalledTimes(1);
    });
  });
});
