import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import AdminContent from '../src/components/organisms/AdminContent';

// Mock AppButton component
jest.mock('../src/components/atoms/AppButton', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  const AppButtonComponent = ({ title, onPress, style }: any) =>
    React.createElement(
      TouchableOpacity,
      { onPress, style, testID: `button-${title.replace(/\s+/g, '-').toLowerCase()}` },
      React.createElement(Text, null, title),
    );
  AppButtonComponent.displayName = 'MockedAppButton';
  return AppButtonComponent;
});

describe('AdminContent', () => {
  const mockColors = {
    background: '#ffffff',
    primary: '#007AFF',
    text: '#000000',
  };

  const defaultProps = {
    colors: mockColors,
    onLoadFloorplans: jest.fn(),
    onEditFloorplans: jest.fn(),
    onSettings: jest.fn(),
    onManageUsers: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with all required props', () => {
    const { getByText } = render(<AdminContent {...defaultProps} />);

    expect(getByText('ADMIN')).toBeTruthy();
    expect(getByText('DASHBOARD')).toBeTruthy();
    expect(getByText('Load Floorplans')).toBeTruthy();
    expect(getByText('Edit Floorplans')).toBeTruthy();
    expect(getByText('Manage Users')).toBeTruthy();
  });

  it('applies the correct primary color to text elements', () => {
    const customColors = { ...mockColors, primary: '#ff0000' };
    const { getByText } = render(<AdminContent {...defaultProps} colors={customColors} />);

    const adminText = getByText('ADMIN');
    const dashboardText = getByText('DASHBOARD');

    expect(adminText.props.style.color).toBe('#ff0000');
    expect(dashboardText.props.style.color).toBe('#ff0000');
  });

  it('calls onLoadFloorplans when Load Floorplans button is pressed', () => {
    const { getByTestId } = render(<AdminContent {...defaultProps} />);

    fireEvent.press(getByTestId('button-load-floorplans'));
    expect(defaultProps.onLoadFloorplans).toHaveBeenCalledTimes(1);
  });

  it('calls onEditFloorplans when Edit Floorplans button is pressed', () => {
    const { getByTestId } = render(<AdminContent {...defaultProps} />);

    fireEvent.press(getByTestId('button-edit-floorplans'));
    expect(defaultProps.onEditFloorplans).toHaveBeenCalledTimes(1);
  });

  it('calls onManageUsers when Manage Users button is pressed', () => {
    const { getByTestId } = render(<AdminContent {...defaultProps} />);

    fireEvent.press(getByTestId('button-manage-users'));
    expect(defaultProps.onManageUsers).toHaveBeenCalledTimes(1);
  });

  it('renders with optional onFloorplanEditor prop', () => {
    const mockOnFloorplanEditor = jest.fn();
    const propsWithOptional = {
      ...defaultProps,
      onFloorplanEditor: mockOnFloorplanEditor,
    };

    const { getByText } = render(<AdminContent {...propsWithOptional} />);

    // Component should still render normally
    expect(getByText('ADMIN')).toBeTruthy();
    expect(getByText('DASHBOARD')).toBeTruthy();
  });

  it('renders without optional onFloorplanEditor prop', () => {
    const { getByText } = render(<AdminContent {...defaultProps} />);

    // Component should render normally without the optional prop
    expect(getByText('ADMIN')).toBeTruthy();
    expect(getByText('DASHBOARD')).toBeTruthy();
  });

  it('has correct text styling for ADMIN title', () => {
    const { getByText } = render(<AdminContent {...defaultProps} />);

    const adminText = getByText('ADMIN');
    expect(adminText.props.style).toMatchObject({
      fontSize: 56,
      fontFamily: 'ChicleRegular',
      color: mockColors.primary,
      textAlign: 'center',
      marginBottom: 40,
      transform: [{ rotate: '-3deg' }],
    });
  });

  it('has correct text styling for DASHBOARD title', () => {
    const { getByText } = render(<AdminContent {...defaultProps} />);

    const dashboardText = getByText('DASHBOARD');
    expect(dashboardText.props.style).toMatchObject({
      fontSize: 52,
      fontFamily: 'ChicleRegular',
      color: mockColors.primary,
      textAlign: 'center',
      marginBottom: 40,
      transform: [{ rotate: '-3deg' }],
    });
  });

  it('handles multiple rapid button presses correctly', () => {
    const { getByTestId } = render(<AdminContent {...defaultProps} />);

    const loadButton = getByTestId('button-load-floorplans');

    // Press the button multiple times rapidly
    fireEvent.press(loadButton);
    fireEvent.press(loadButton);
    fireEvent.press(loadButton);

    expect(defaultProps.onLoadFloorplans).toHaveBeenCalledTimes(3);
  });

  it('handles different color object structures', () => {
    const minimalColors = {
      background: '#000000',
      primary: '#ffffff',
    };

    const { getByText } = render(<AdminContent {...defaultProps} colors={minimalColors} />);

    expect(getByText('ADMIN')).toBeTruthy();
    expect(getByText('DASHBOARD')).toBeTruthy();
  });

  // it('renders all buttons in correct order', () => {
  //   const { getAllByTestId } = render(<AdminContent {...defaultProps} />);

  //   const buttons = getAllByTestId(/^button-/);
  //   expect(buttons).toHaveLength(3);

  //   expect(buttons[0]).toHaveProperty('props.testID', 'button-load-floorplans');
  //   expect(buttons[1]).toHaveProperty('props.testID', 'button-edit-floorplans');
  //   expect(buttons[2]).toHaveProperty('props.testID', 'button-manage-users');
  // });
});
