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

