import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { View } from 'react-native';
import DestinationSearch from '../src/components/molecules/DestinationSearch';
import MapActionsPanel from '../src/components/organisms/MapActionsPanel';
import TextIcon from '../src/components/atoms/TextIcon';
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

  it('clears suggestions when input is empty', () => {
    const suggestions = [
      { id: '1', name: 'Library', centroid: { longitude: -122.08, latitude: 37.42 } }
    ];
    const { getByPlaceholderText, queryByText } = renderWithTheme(
      <DestinationSearch
        value="Lib"
        onChange={() => {}}
        onSearch={() => {}}
        suggestions={suggestions}
        onSelectSuggestion={() => {}}
      />
    );
    
    fireEvent.changeText(getByPlaceholderText('Search destination...'), '');
    expect(queryByText('Library')).toBeNull();
  });

  it('calls onSearch when search button is pressed', () => {
    const onSearch = jest.fn();
    const { getByTestId } = renderWithTheme(
      <DestinationSearch
        value="Library"
        onChange={() => {}}
        onSearch={onSearch}
        suggestions={[]}
        onSelectSuggestion={() => {}}
      />
    );
    
    fireEvent.press(getByTestId('search-button'));
    expect(onSearch).toHaveBeenCalled();
  });

  it('filters suggestions case-insensitively', () => {
    const suggestions = [
      { id: '1', name: 'Library', centroid: { longitude: -122.08, latitude: 37.42 } },
      { id: '2', name: 'Cafeteria', centroid: { longitude: -122.07, latitude: 37.43 } }
    ];
    const { getByPlaceholderText, getByText, queryByText } = renderWithTheme(
      <DestinationSearch
        value="lib"
        onChange={() => {}}
        onSearch={() => {}}
        suggestions={suggestions}
        onSelectSuggestion={() => {}}
      />
    );
    
    expect(getByText('Library')).toBeTruthy();
    expect(queryByText('Cafeteria')).toBeNull();
  });

  it('shows "No results" when no suggestions match', () => {
    const suggestions = [
      { id: '1', name: 'Library', centroid: { longitude: -122.08, latitude: 37.42 } }
    ];
    const { getByPlaceholderText, getByText } = renderWithTheme(
      <DestinationSearch
        value="Park"
        onChange={() => {}}
        onSearch={() => {}}
        suggestions={suggestions}
        onSelectSuggestion={() => {}}
      />
    );
    
    expect(getByText('No results found')).toBeTruthy();
  });

  it('handles long press on suggestions', () => {
    const onLongPress = jest.fn();
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
        onSuggestionLongPress={onLongPress}
      />
    );
    
    fireEvent(getByText('Library'), 'longPress');
    expect(onLongPress).toHaveBeenCalledWith(suggestions[0]);
  });

  it('displays loading indicator when loading prop is true', () => {
    const { getByTestId } = renderWithTheme(
      <DestinationSearch
        value="Lib"
        onChange={() => {}}
        onSearch={() => {}}
        suggestions={[]}
        onSelectSuggestion={() => {}}
        loading={true}
      />
    );
    
    expect(getByTestId('loading-indicator')).toBeTruthy();
  });

  it('applies custom placeholder text', () => {
    const { getByPlaceholderText } = renderWithTheme(
      <DestinationSearch
        value=""
        onChange={() => {}}
        onSearch={() => {}}
        suggestions={[]}
        onSelectSuggestion={() => {}}
        placeholder="Enter destination"
      />
    );
    
    expect(getByPlaceholderText('Enter destination')).toBeTruthy();
  });

  it('handles keyboard submit', () => {
    const onSearch = jest.fn();
    const { getByPlaceholderText } = renderWithTheme(
      <DestinationSearch
        value="Library"
        onChange={() => {}}
        onSearch={onSearch}
        suggestions={[]}
        onSelectSuggestion={() => {}}
      />
    );
    
    fireEvent(getByPlaceholderText('Search destination...'), 'submitEditing');
    expect(onSearch).toHaveBeenCalled();
  });
});


describe('MapActionsPanel', () => {
  it('renders nothing when no current location', () => {
    const { queryByText } = renderWithTheme(
      <MapActionsPanel
        currentLocation={false}
        onShare={() => {}}
        onReport={() => {}}
        shareTooltip={false}
        reportTooltip={false}
        onShareIn={() => {}}
        onShareOut={() => {}}
        onReportIn={() => {}}
        onReportOut={() => {}}
        color="#000"
      />
    );
    expect(queryByText('📍')).toBeNull();
    expect(queryByText('⚠️')).toBeNull();
  });

  it('renders location and warning icons when has current location', () => {
    const { getByText } = renderWithTheme(
      <MapActionsPanel
        currentLocation={true}
        onShare={() => {}}
        onReport={() => {}}
        shareTooltip={false}
        reportTooltip={false}
        onShareIn={() => {}}
        onShareOut={() => {}}
        onReportIn={() => {}}
        onReportOut={() => {}}
        color="#000"
      />
    );
    expect(getByText('📍')).toBeTruthy();
    expect(getByText('⚠️')).toBeTruthy();
  });

  it('calls onShare when location icon is pressed', () => {
    const onShare = jest.fn();
    const { getByText } = renderWithTheme(
      <MapActionsPanel
        currentLocation={true}
        onShare={onShare}
        onReport={() => {}}
        shareTooltip={false}
        reportTooltip={false}
        onShareIn={() => {}}
        onShareOut={() => {}}
        onReportIn={() => {}}
        onReportOut={() => {}}
        color="#000"
      />
    );
    fireEvent.press(getByText('📍'));
    expect(onShare).toHaveBeenCalled();
  });

  it('calls onReport when warning icon is pressed', () => {
    const onReport = jest.fn();
    const { getByText } = renderWithTheme(
      <MapActionsPanel
        currentLocation={true}
        onShare={() => {}}
        onReport={onReport}
        shareTooltip={false}
        reportTooltip={false}
        onShareIn={() => {}}
        onShareOut={() => {}}
        onReportIn={() => {}}
        onReportOut={() => {}}
        color="#000"
      />
    );
    fireEvent.press(getByText('⚠️'));
    expect(onReport).toHaveBeenCalled();
  });

  it('shows tooltips when enabled', () => {
    const { getByText } = renderWithTheme(
      <MapActionsPanel
        currentLocation={true}
        onShare={() => {}}
        onReport={() => {}}
        shareTooltip={true}
        reportTooltip={true}
        onShareIn={() => {}}
        onShareOut={() => {}}
        onReportIn={() => {}}
        onReportOut={() => {}}
        color="#000"
      />
    );
    expect(getByText('Share Location')).toBeTruthy();
    expect(getByText('Report Crowds')).toBeTruthy();
  });
});

