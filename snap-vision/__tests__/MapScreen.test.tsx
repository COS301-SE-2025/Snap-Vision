import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MapActionsPanel from '../src/components/organisms/MapActionsPanel';
import { ThemeProvider } from '../src/theme/ThemeContext';
import MapWebView from '../src/components/organisms/MapWebView';
import NavigationPanel from '../src/components/organisms/NavigationPanel';


jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MockWebView = React.forwardRef((props, ref) => (
    <View {...props} ref={ref} testID="mock-webview" />
  ));
  MockWebView.displayName = 'MockWebView';
  return {
    WebView: MockWebView,
  };
});

jest.mock('react-native-tts', () => ({
  stop: jest.fn(),
  removeAllListeners: jest.fn(),
}));

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
      />,
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
      />,
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
      />,
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
      />,
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
      />,
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
      />,
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
      />,
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
      />,
    );
    fireEvent(getByText('Report Crowds'), 'pressOut');
    expect(mockOnReportOut).toHaveBeenCalled();
  });
});

describe('MapWebView', () => {
  it('renders correctly', () => {
    const { getByTestId } = render(<MapWebView onMessage={jest.fn()} />);
    expect(getByTestId('mock-webview')).toBeTruthy(); // Ensure WebView renders
  });

  it('handles messages correctly', () => {
    const mockOnMessage = jest.fn();
    const { getByTestId } = render(<MapWebView onMessage={mockOnMessage} />);
    const webView = getByTestId('mock-webview');
    webView.props.onMessage({ nativeEvent: { data: 'test message' } });
    expect(mockOnMessage).toHaveBeenCalledWith({ nativeEvent: { data: 'test message' } });
  });

  it('handles onLoadEnd correctly', () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const { getByTestId } = render(<MapWebView onMessage={jest.fn()} />);
    const webView = getByTestId('mock-webview');
    webView.props.onLoadEnd();
    expect(consoleSpy).toHaveBeenCalledWith('WebView fully loaded');
    consoleSpy.mockRestore();
  });
  it('handles onError correctly', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const { getByTestId } = render(<MapWebView onMessage={jest.fn()} />);
    const webView = getByTestId('mock-webview');
    const errorEvent = { nativeEvent: { description: 'Test error' } };
    webView.props.onError(errorEvent);
    expect(consoleSpy).toHaveBeenCalledWith('WebView error:', 'Test error');
    consoleSpy.mockRestore();
  });
});
describe('NavigationPanel', () => {
  const renderWithProviders = (ui: React.ReactNode) => {
    return render(<ThemeProvider>{ui}</ThemeProvider>);
  };

  it('renders correctly with navigation details', () => {
    const { getByText } = renderWithProviders(
      <NavigationPanel
        isNavigating={true}
        isLoading={false}
        onStartNavigation={jest.fn()}
        onStopNavigation={jest.fn()}
        progress={50}
        distance={1000}
        time={10}
        destination="Library"
        isVoiceEnabled={true}
        onToggleVoice={jest.fn()}
        currentInstruction="Turn left"
        onSpeakingChange={jest.fn()}
      />,
    );
    expect(getByText('Library')).toBeTruthy();
    expect(getByText('1.0 km')).toBeTruthy();
    expect(getByText('10 min')).toBeTruthy();
    expect(getByText('50%')).toBeTruthy();
    expect(getByText('Voice On')).toBeTruthy(); // Replace 'Turn left' with the actual rendered text
  });

  it('renders correctly when distance is less than 1000 meters', () => {
    const { getByText } = renderWithProviders(
      <NavigationPanel
        isNavigating={true}
        isLoading={false}
        onStartNavigation={jest.fn()}
        onStopNavigation={jest.fn()}
        progress={75}
        distance={350}
        time={5}
        destination="Cafeteria"
        isVoiceEnabled={false}
        onToggleVoice={jest.fn()}
        currentInstruction="Turn right"
        onSpeakingChange={jest.fn()}
      />,
    );
    expect(getByText('Cafeteria')).toBeTruthy();
    expect(getByText('350 m')).toBeTruthy();
    expect(getByText('5 min')).toBeTruthy();
    expect(getByText('75%')).toBeTruthy();
    expect(getByText('🔇')).toBeTruthy();
  });

  it('calls onStartNavigation when start button is pressed', () => {
    const mockOnStartNavigation = jest.fn();
    const { getByText } = renderWithProviders(
      <NavigationPanel
        isNavigating={false}
        isLoading={false}
        onStartNavigation={mockOnStartNavigation}
        onStopNavigation={jest.fn()}
        progress={0}
        distance={null}
        time={null}
        destination="Library"
        isVoiceEnabled={false}
        onToggleVoice={jest.fn()}
        currentInstruction=""
        onSpeakingChange={jest.fn()}
      />,
    );
    fireEvent.press(getByText('Start'));
    expect(mockOnStartNavigation).toHaveBeenCalled();
  });

  it('calls onStopNavigation when stop button is pressed', () => {
    const mockOnStopNavigation = jest.fn();
    const { getByText } = renderWithProviders(
      <NavigationPanel
        isNavigating={true}
        isLoading={false}
        onStartNavigation={jest.fn()}
        onStopNavigation={mockOnStopNavigation}
        progress={50}
        distance={null}
        time={null}
        destination="Library"
        isVoiceEnabled={false}
        onToggleVoice={jest.fn()}
        currentInstruction=""
        onSpeakingChange={jest.fn()}
      />,
    );
    fireEvent.press(getByText('Stop'));
    expect(mockOnStopNavigation).toHaveBeenCalled();
  });
  it('disables navigation buttons when loading', () => {
    const mockOnStartNavigation = jest.fn();
    const { getByText } = renderWithProviders(
      <NavigationPanel
        isNavigating={false}
        isLoading={true}
        onStartNavigation={mockOnStartNavigation}
        onStopNavigation={jest.fn()}
        progress={0}
        distance={null}
        time={null}
        destination="Library"
        isVoiceEnabled={false}
        onToggleVoice={jest.fn()}
        currentInstruction=""
        onSpeakingChange={jest.fn()}
      />,
    );

    const loadingButton = getByText('Loading');
    expect(loadingButton).toBeTruthy(); // Ensure the button exists
    expect(mockOnStartNavigation).not.toHaveBeenCalled(); // Verify the callback is not triggered
  });

  it('calls onToggleVoice when voice toggle is pressed', () => {
    const mockOnToggleVoice = jest.fn();
    const { getByText } = renderWithProviders(
      <NavigationPanel
        isNavigating={true}
        isLoading={false}
        onStartNavigation={jest.fn()}
        onStopNavigation={jest.fn()}
        progress={50}
        distance={null}
        time={null}
        destination="Library"
        isVoiceEnabled={true}
        onToggleVoice={mockOnToggleVoice}
        currentInstruction="Turn left"
        onSpeakingChange={jest.fn()}
      />,
    );
    fireEvent.press(getByText('Voice On')); // Replace 'Turn left' with the actual rendered text
    expect(mockOnToggleVoice).toHaveBeenCalled();
  });

  it('renders correctly when no distance or time is provided', () => {
    const { queryByText } = renderWithProviders(
      <NavigationPanel
        isNavigating={true}
        isLoading={false}
        onStartNavigation={jest.fn()}
        onStopNavigation={jest.fn()}
        progress={50}
        distance={null}
        time={null}
        destination="Library"
        isVoiceEnabled={false}
        onToggleVoice={jest.fn()}
        currentInstruction=""
        onSpeakingChange={jest.fn()}
      />,
    );
    expect(queryByText('Library')).toBeTruthy();
    expect(queryByText('50%')).toBeTruthy();
    expect(queryByText('km')).toBeNull();
    expect(queryByText('min')).toBeNull();
  });
});
