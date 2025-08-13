import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import AdminScreenContent from '../src/components/organisms/EditorContent';

// Mock the AppButton component with proper TypeScript typing
jest.mock('../src/components/atoms/AppButton', () => {
  const { Text, TouchableOpacity } = jest.requireActual('react-native');
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

describe('AdminScreenContent', () => {
  const mockColors = {
    background: '#ffffff',
    primary: '#007AFF',
  };

  const mockHandlers = {
    onLoadFloorplans: jest.fn(),
    onEditFloorplans: jest.fn(),
    onSettings: jest.fn(),
    onFloorplanEditor: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('renders the editor title and dashboard text with correct styles', () => {
    const { getByText } = render(
      <AdminScreenContent colors={mockColors} {...mockHandlers} />
    );

    const editorText = getByText('Editor');
    const dashboardText = getByText('DASHBOARD');

    // Verify text content
    expect(editorText).toBeTruthy();
    expect(dashboardText).toBeTruthy();

    // Verify styles
    expect(editorText.props.style).toMatchObject({
      fontSize: 56,
      fontFamily: 'PermanentMarkerRegular',
      color: mockColors.primary,
      textAlign: 'center',
      marginBottom: 40,
      transform: [{ rotate: '-3deg' }],
    });

    expect(dashboardText.props.style).toMatchObject({
      fontSize: 52,
      fontFamily: 'PermanentMarkerRegular',
      color: mockColors.primary,
      textAlign: 'center',
      marginBottom: 40,
      transform: [{ rotate: '-3deg' }],
    });
  });

  it('renders action buttons with correct props', () => {
    const { getByTestId } = render(
      <AdminScreenContent colors={mockColors} {...mockHandlers} />
    );

    const loadButton = getByTestId('button-Load-Floorplans');
    const editButton = getByTestId('button-Edit-Floorplans');

    expect(loadButton).toBeTruthy();
    expect(editButton).toBeTruthy();
    expect(loadButton.props.accessibilityLabel).toBe('Load Floorplans');
    expect(editButton.props.accessibilityLabel).toBe('Edit Floorplans');
  });

  it('calls the correct handlers when buttons are pressed', () => {
    const { getByTestId } = render(
      <AdminScreenContent colors={mockColors} {...mockHandlers} />
    );

    fireEvent.press(getByTestId('button-Load-Floorplans'));
    expect(mockHandlers.onLoadFloorplans).toHaveBeenCalledTimes(1);

    fireEvent.press(getByTestId('button-Edit-Floorplans'));
    expect(mockHandlers.onEditFloorplans).toHaveBeenCalledTimes(1);
  });

  it('applies the correct background color from props', () => {
    const customColors = {
      ...mockColors,
      background: '#123456'
    };
    
    const { getByTestId } = render(
      <AdminScreenContent colors={customColors} {...mockHandlers} />
    );

    const container = getByTestId('editor-container');
    expect(container.props.style).toContainEqual(
      expect.objectContaining({ backgroundColor: '#123456' })
    );
  });

  it('does not render the Settings button when not in use', () => {
    const { queryByTestId } = render(
      <AdminScreenContent colors={mockColors} {...mockHandlers} />
    );
    expect(queryByTestId('button-Settings')).toBeNull();
  });

  it('matches the button container styles', () => {
    const { getByTestId } = render(
      <AdminScreenContent colors={mockColors} {...mockHandlers} />
    );

    const buttonContainer = getByTestId('button-container');
    expect(buttonContainer.props.style).toEqual({
      width: '100%',
      maxWidth: 300,
    });
  });

  it('renders with minimal required props', () => {
    const minimalProps = {
      colors: mockColors,
      onLoadFloorplans: jest.fn(),
      onEditFloorplans: jest.fn(),
    };
    
    const { getByText } = render(
      <AdminScreenContent {...minimalProps} />
    );
    expect(getByText('Editor')).toBeTruthy();
  });
it('renders action buttons with correct props', () => {
    const { getByTestId } = render(
      <AdminScreenContent colors={mockColors} {...mockHandlers} />
    );

    const loadButton = getByTestId('button-Load-Floorplans');
    const editButton = getByTestId('button-Edit-Floorplans');

    expect(loadButton).toBeTruthy();
    expect(editButton).toBeTruthy();
    expect(loadButton.props.accessibilityLabel).toBe('Load Floorplans');
    expect(editButton.props.accessibilityLabel).toBe('Edit Floorplans');
  });

  it('calls the correct handlers when buttons are pressed', () => {
    const { getByTestId } = render(
      <AdminScreenContent colors={mockColors} {...mockHandlers} />
    );

    fireEvent.press(getByTestId('button-Load-Floorplans'));
    expect(mockHandlers.onLoadFloorplans).toHaveBeenCalledTimes(1);

    fireEvent.press(getByTestId('button-Edit-Floorplans'));
    expect(mockHandlers.onEditFloorplans).toHaveBeenCalledTimes(1);
  });

});