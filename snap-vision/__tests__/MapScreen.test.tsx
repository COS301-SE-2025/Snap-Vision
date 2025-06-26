import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MapActionsPanel from '../src/components/organisms/MapActionsPanel';
import { ThemeProvider } from '../src/theme/ThemeContext'; // Import ThemeProvider
import MapWebView from '../src/components/organisms/MapWebView';

describe('MapActionsPanel', () => {
  const renderWithProviders = (ui: React.ReactNode) => {
    return render(<ThemeProvider>{ui}</ThemeProvider>); // Wrap with ThemeProvider
  };

  it('calls onShare when share button is pressed', () => {
    const mockOnShare = jest.fn();
    const { getByText } = renderWithProviders(
      <MapActionsPanel
        currentLocation={true}
        onShare={mockOnShare}
        onReport={jest.fn()}
        shareTooltip={true}
        reportTooltip={true}
        onShareIn={jest.fn()}
        onShareOut={jest.fn()}
        onReportIn={jest.fn()}
        onReportOut={jest.fn()}
        color="white"
      />
    );
    fireEvent.press(getByText('Share Location')); // Match tooltip text
    expect(mockOnShare).toHaveBeenCalled();
  });

  it('calls onReport when report button is pressed', () => {
    const mockOnReport = jest.fn();
    const { getByText } = renderWithProviders(
      <MapActionsPanel
        currentLocation={true}
        onShare={jest.fn()}
        onReport={mockOnReport}
        shareTooltip={true}
        reportTooltip={true}
        onShareIn={jest.fn()}
        onShareOut={jest.fn()}
        onReportIn={jest.fn()}
        onReportOut={jest.fn()}
        color="white"
      />
    );
    fireEvent.press(getByText('Report Crowds')); // Match tooltip text
    expect(mockOnReport).toHaveBeenCalled();
  });
});