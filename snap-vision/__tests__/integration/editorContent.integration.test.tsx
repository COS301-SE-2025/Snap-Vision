import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import AdminScreenContent from '../../src/components/organisms/EditorContent';
import { ThemeProviderWrapper } from '../test-utils/ThemeProviderWrapper';
import { useNavigation } from '@react-navigation/native';

// Mock console.error to suppress certain warnings
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('was not wrapped in act')) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

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
  return ({
    title,
    onPress,
    testID,
  }: {
    title: string;
    onPress: () => void;
    testID?: string;
  }) => (
    <TouchableOpacity 
      testID={testID} 
      onPress={onPress}
      accessibilityLabel={title}
    >
      <Text>{title}</Text>
    </TouchableOpacity>
  );
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
        </ThemeProviderWrapper>
      );

      // Verify main container
      const container = getByTestId('editor-container');
      expect(container.props.style).toContainEqual(
        expect.objectContaining({ backgroundColor: mockColors.background })
      );

      // Verify text elements
      const editorText = getByText('Editor');
      const dashboardText = getByText('DASHBOARD');
      
      expect(editorText.props.style).toMatchObject({
        fontSize: 56,
        fontFamily: 'PermanentMarkerRegular',
        color: mockColors.primary,
      });
      
      expect(dashboardText.props.style).toMatchObject({
        fontSize: 52,
        fontFamily: 'PermanentMarkerRegular',
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
        </ThemeProviderWrapper>
      );

      const loadButton = getByTestId('button-Load-Floorplans');
      const editButton = getByTestId('button-Edit-Floorplans');

      expect(loadButton).toBeTruthy();
      expect(editButton).toBeTruthy();
      expect(getByText('Load Floorplans')).toBeTruthy();
      expect(getByText('Edit Floorplans')).toBeTruthy();
    });
  });

  