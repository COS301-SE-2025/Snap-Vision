import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MapActionsPanel from '../src/components/organisms/MapActionsPanel';
import { ThemeProvider } from '../src/theme/ThemeContext'; // Import ThemeProvider
import MapWebView from '../src/components/organisms/MapWebView';
jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    WebView: React.forwardRef((props, ref) => <View {...props} ref={ref} testID="mock-webview" />),
  };
});

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

describe('MapWebView', () => {
  it('renders correctly', () => {
    const { getByTestId } = render(<MapWebView />);
    expect(getByTestId('mock-webview')).toBeTruthy(); // Match the correct testID
  });

  it('handles messages correctly', () => {
    const mockOnMessage = jest.fn();
    const { getByTestId } = render(<MapWebView onMessage={mockOnMessage} />);
    const webView = getByTestId('mock-webview'); // Match the correct testID
    webView.props.onMessage({ nativeEvent: { data: 'test message' } });
    expect(mockOnMessage).toHaveBeenCalledWith({ nativeEvent: { data: 'test message' } });
  });
});