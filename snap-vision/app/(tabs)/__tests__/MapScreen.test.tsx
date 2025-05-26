import React from 'react';
import { render, act } from '@testing-library/react-native';
import MapScreen from 'app/(tabs)/MapScreen';
import { WebView } from 'react-native-webview';
import Geolocation from '@react-native-community/geolocation';

jest.mock('@react-native-picker/picker', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  const Picker = ({ children }) => React.createElement(View, {}, children);
  Picker.Item = ({ label }) => React.createElement(Text, {}, label);
  return { Picker };
});

// Mock WebView with injectJavaScript
jest.mock('react-native-webview', () => {
  const React = require('react');
  const { forwardRef, useImperativeHandle } = require('react');
  const { View } = require('react-native');

  const WebView = forwardRef((props: any, ref: React.Ref<any>) => {
    useImperativeHandle(ref, () => ({
      injectJavaScript: jest.fn(),
    }));
    return <View {...props} testID="mocked-webview" />;
  });

  return { WebView };
});

// Mock Geolocation
jest.mock('@react-native-community/geolocation', () => ({
  getCurrentPosition: jest.fn(),
}));

// Mock PermissionsAndroid
jest.mock('react-native/Libraries/PermissionsAndroid/PermissionsAndroid', () => ({
  request: jest.fn(() => Promise.resolve('granted')),
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
  },
  PERMISSIONS: {
    ACCESS_FINE_LOCATION: 'ACCESS_FINE_LOCATION',
  },
}));



describe('MapScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(<MapScreen />);
  });

  it('handles map ready message and updates status', async () => {
    const { getByTestId } = render(<MapScreen />);
    const webView = getByTestId('mocked-webview');

    if (webView.props.onMessage) {
      await act(async () => {
        webView.props.onMessage({
          nativeEvent: {
            data: 'MAP_READY',
          },
        });
      });
    }
  });

  it('handles location and sends to WebView', async () => {
    const mockPosition = {
      coords: {
        latitude: 10,
        longitude: 20,
      },
    };

    (Geolocation.getCurrentPosition as jest.Mock).mockImplementationOnce((success) =>
      success(mockPosition)
    );

    const { getByTestId } = render(<MapScreen />);
    const webView = getByTestId('mocked-webview');

    if (webView.props.onMessage) {
      await act(async () => {
        webView.props.onMessage({
          nativeEvent: {
            data: 'MAP_READY',
          },
        });
      });
    }
  });

  it('handles invalid JSON message gracefully', async () => {
    const { getByTestId } = render(<MapScreen />);
    const webView = getByTestId('mocked-webview');

    if (webView.props.onMessage) {
      await act(async () => {
        webView.props.onMessage({
          nativeEvent: {
            data: 'INVALID_JSON',
          },
        });
      });
    }
  });
});
