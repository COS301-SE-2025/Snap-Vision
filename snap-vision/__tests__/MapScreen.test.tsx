import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MapActionsPanel from '../src/components/organisms/MapActionsPanel';
import { ThemeProvider } from '../src/theme/ThemeContext';
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
    return render(<ThemeProvider>{ui}</ThemeProvider>);
  };

  it('renders correctly when currentLocation is true', () => {
    const { getByText } = renderWithProviders(
      <MapActionsPanel
        currentLocation={true}
        onShare={jest.fn()}
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
    expect(getByText('Share Location')).toBeTruthy();
    expect(getByText('Report Crowds')).toBeTruthy();
  });

  it('does not render when currentLocation is false', () => {
    const { queryByText } = renderWithProviders(
      <MapActionsPanel
        currentLocation={false}
        onShare={jest.fn()}
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
    expect(queryByText('Share Location')).toBeNull();
    expect(queryByText('Report Crowds')).toBeNull();
  });

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
    fireEvent.press(getByText('Share Location'));
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
    fireEvent.press(getByText('Report Crowds'));
    expect(mockOnReport).toHaveBeenCalled();
  });

  it('calls onShareIn when share button is pressed in', () => {
    const mockOnShareIn = jest.fn();
    const { getByText } = renderWithProviders(
      <MapActionsPanel
        currentLocation={true}
        onShare={jest.fn()}
        onReport={jest.fn()}
        shareTooltip={true}
        reportTooltip={true}
        onShareIn={mockOnShareIn}
        onShareOut={jest.fn()}
        onReportIn={jest.fn()}
        onReportOut={jest.fn()}
        color="white"
      />
    );
    fireEvent(getByText('Share Location'), 'pressIn');
    expect(mockOnShareIn).toHaveBeenCalled();
  });

  it('calls onShareOut when share button is pressed out', () => {
    const mockOnShareOut = jest.fn();
    const { getByText } = renderWithProviders(
      <MapActionsPanel
        currentLocation={true}
        onShare={jest.fn()}
        onReport={jest.fn()}
        shareTooltip={true}
        reportTooltip={true}
        onShareIn={jest.fn()}
        onShareOut={mockOnShareOut}
        onReportIn={jest.fn()}
        onReportOut={jest.fn()}
        color="white"
      />
    );
    fireEvent(getByText('Share Location'), 'pressOut');
    expect(mockOnShareOut).toHaveBeenCalled();
  });

  it('calls onReportIn when report button is pressed in', () => {
    const mockOnReportIn = jest.fn();
    const { getByText } = renderWithProviders(
      <MapActionsPanel
        currentLocation={true}
        onShare={jest.fn()}
        onReport={jest.fn()}
        shareTooltip={true}
        reportTooltip={true}
        onShareIn={jest.fn()}
        onShareOut={jest.fn()}
        onReportIn={mockOnReportIn}
        onReportOut={jest.fn()}
        color="white"
      />
    );
    fireEvent(getByText('Report Crowds'), 'pressIn');
    expect(mockOnReportIn).toHaveBeenCalled();
  });

  it('calls onReportOut when report button is pressed out', () => {
    const mockOnReportOut = jest.fn();
    const { getByText } = renderWithProviders(
      <MapActionsPanel
        currentLocation={true}
        onShare={jest.fn()}
        onReport={jest.fn()}
        shareTooltip={true}
        reportTooltip={true}
        onShareIn={jest.fn()}
        onShareOut={jest.fn()}
        onReportIn={jest.fn()}
        onReportOut={mockOnReportOut}
        color="white"
      />
    );
    fireEvent(getByText('Report Crowds'), 'pressOut');
    expect(mockOnReportOut).toHaveBeenCalled();
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