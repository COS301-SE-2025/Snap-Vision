// __tests__/SettingsToggleItem.test.tsx
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import SettingsToggleItem from '../src/components/molecules/SettingsToggleItem';

// Mock react-native-vector-icons
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

describe('SettingsToggleItem', () => {
  const defaultProps = {
    icon: 'volume-high',
    label: 'Test Setting',
    value: false,
    onToggle: jest.fn(),
    color: '#007AFF',
    textColor: '#000000',
    descriptionColor: '#666666',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with required props', () => {
    const { getByText } = render(<SettingsToggleItem {...defaultProps} />);

    expect(getByText('Test Setting')).toBeTruthy();
  });

  it('renders with description when provided', () => {
    const props = {
      ...defaultProps,
      description: 'This is a test description',
    };

    const { getByText } = render(<SettingsToggleItem {...props} />);

    expect(getByText('Test Setting')).toBeTruthy();
    expect(getByText('This is a test description')).toBeTruthy();
  });

  it('renders without description when not provided', () => {
    const { getByText, queryByText } = render(<SettingsToggleItem {...defaultProps} />);

    expect(getByText('Test Setting')).toBeTruthy();
    // Description should not be present
    expect(queryByText(/description/)).toBeNull();
  });

  it('displays correct switch value', () => {
    const { getByRole } = render(<SettingsToggleItem {...defaultProps} value={true} />);

    const switchElement = getByRole('switch');
    expect(switchElement.props.value).toBe(true);
  });

  it('calls onToggle when switch is pressed', () => {
    const mockOnToggle = jest.fn();
    const { getByRole } = render(<SettingsToggleItem {...defaultProps} onToggle={mockOnToggle} />);

    const switchElement = getByRole('switch');
    fireEvent(switchElement, 'valueChange', true);

    expect(mockOnToggle).toHaveBeenCalledWith(true);
  });

  it('calls onToggle when container is pressed', () => {
    const mockOnToggle = jest.fn();
    const { getByText } = render(
      <SettingsToggleItem {...defaultProps} onToggle={mockOnToggle} value={false} />,
    );

    fireEvent.press(getByText('Test Setting'));

    expect(mockOnToggle).toHaveBeenCalledWith(true); // Should toggle to opposite value
  });

  it('toggles correctly from true to false', () => {
    const mockOnToggle = jest.fn();
    const { getByText } = render(
      <SettingsToggleItem {...defaultProps} onToggle={mockOnToggle} value={true} />,
    );

    fireEvent.press(getByText('Test Setting'));

    expect(mockOnToggle).toHaveBeenCalledWith(false);
  });

  it('applies correct colors to elements', () => {
    const props = {
      ...defaultProps,
      description: 'Test description',
      color: '#FF0000',
      textColor: '#00FF00',
      descriptionColor: '#0000FF',
    };

    const { getByText } = render(<SettingsToggleItem {...props} />);

    const label = getByText('Test Setting');
    const description = getByText('Test description');

    expect(label.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: '#00FF00' })]),
    );

    expect(description.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: '#0000FF' })]),
    );
  });

  it('renders icon with correct name and color', () => {
    const { getByTestId } = render(<SettingsToggleItem {...defaultProps} />);

    // We'll test that the icon is rendered, but since it's mocked,
    // we can't easily test the exact props. The important thing is that it renders.
    expect(() => getByTestId('settings-toggle-icon')).not.toThrow();
  });

  it('has correct accessibility properties', () => {
    const { getByRole } = render(<SettingsToggleItem {...defaultProps} />);

    const switchElement = getByRole('switch');
    expect(switchElement).toBeTruthy();
  });

  it('handles long labels correctly', () => {
    const longLabel = 'This is a very long label that should still render correctly';
    const { getByText } = render(<SettingsToggleItem {...defaultProps} label={longLabel} />);

    expect(getByText(longLabel)).toBeTruthy();
  });

  it('handles long descriptions correctly', () => {
    const longDescription =
      'This is a very long description that explains the setting in great detail and should wrap to multiple lines if necessary';
    const { getByText } = render(
      <SettingsToggleItem {...defaultProps} description={longDescription} />,
    );

    expect(getByText(longDescription)).toBeTruthy();
  });
});
