import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import DestinationSearch from '../src/components/molecules/DestinationSearch';
import { ThemeProvider } from '../src/theme/ThemeContext';

const renderWithTheme = (ui: React.ReactElement) =>
  render(<ThemeProvider>{ui}</ThemeProvider>);

describe('DestinationSearch', () => {
  it('renders search input correctly', () => {
    const { getByPlaceholderText } = renderWithTheme(
      <DestinationSearch
        value=""
        onChange={() => {}}
        onSearch={() => {}}
        suggestions={[]}
        onSelectSuggestion={() => {}}
      />
    );
    expect(getByPlaceholderText('Search destination...')).toBeTruthy();
  });

  it('calls onChange when typing', () => {
    const onChange = jest.fn();
    const { getByPlaceholderText } = renderWithTheme(
      <DestinationSearch
        value=""
        onChange={onChange}
        onSearch={() => {}}
        suggestions={[]}
        onSelectSuggestion={() => {}}
      />
    );
    fireEvent.changeText(getByPlaceholderText('Search destination...'), 'Library');
    expect(onChange).toHaveBeenCalledWith('Library');
  });

  it('shows suggestions when available', () => {
    const suggestions = [
      { id: '1', name: 'Library', centroid: { longitude: -122.08, latitude: 37.42 } }
    ];
    const { getByText } = renderWithTheme(
      <DestinationSearch
        value="Lib"
        onChange={() => {}}
        onSearch={() => {}}
        suggestions={suggestions}
        onSelectSuggestion={() => {}}
      />
    );
    expect(getByText('Library')).toBeTruthy();
  });

  it('calls onSelectSuggestion when a suggestion is pressed', () => {
    const onSelect = jest.fn();
    const suggestions = [
      { id: '1', name: 'Library', centroid: { longitude: -122.08, latitude: 37.42 } }
    ];
    const { getByText } = renderWithTheme(
      <DestinationSearch
        value="Lib"
        onChange={() => {}}
        onSearch={() => {}}
        suggestions={suggestions}
        onSelectSuggestion={onSelect}
      />
    );
    fireEvent.press(getByText('Library'));
    expect(onSelect).toHaveBeenCalledWith(suggestions[0]);
  });
});