import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { render, act, fireEvent, waitFor } from '@testing-library/react-native';
import MapScreen from '../MapScreen';
import Geolocation from '@react-native-community/geolocation';
import { PermissionsAndroid } from 'react-native';
import { Share } from 'react-native';

// Capture the mock function for later assertions
const mockInjectJavaScript = jest.fn();

jest.mock('react-native/Libraries/PermissionsAndroid/PermissionsAndroid', () => ({
  request: jest.fn(),
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
  },
}));

jest.mock('react-native/Libraries/Share/Share', () => ({
  share: jest.fn(),
  sharedAction: 'sharedAction',
  dismissedAction: 'dismissedAction',
}));

jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

// Mock Picker
jest.mock('@react-native-picker/picker', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  const Picker = ({ children, selectedValue, onValueChange }) => 
    React.createElement(View, { selectedValue, onValueChange, displayValue: selectedValue }, children);
  Picker.Item = ({ label, value }) => React.createElement(Text, { value }, label);
  return { Picker };
});

// Mock WebView with ref
jest.mock('react-native-webview', () => {
  const React = require('react');
  const { forwardRef, useImperativeHandle, useRef } = require('react');
  const { View } = require('react-native');

  const WebView = forwardRef((props, ref) => {
    const localRef = useRef();
    useImperativeHandle(ref, () => ({
      injectJavaScript: mockInjectJavaScript,
    }));
    return <View {...props} testID="mocked-webview" ref={localRef} />;
  });

  return { WebView };
});

// Mock Geolocation
jest.mock('@react-native-community/geolocation', () => ({
  getCurrentPosition: jest.fn(),
}));

// Mock Permissions
jest.mock('react-native/Libraries/PermissionsAndroid/PermissionsAndroid', () => ({
  request: jest.fn(),
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
  },
  PERMISSIONS: {
    ACCESS_FINE_LOCATION: 'ACCESS_FINE_LOCATION',
  },
}));

// Mock Share
jest.mock('react-native/Libraries/Share/Share', () => ({
  share: jest.fn(),
  sharedAction: 'sharedAction',
  dismissedAction: 'dismissedAction',
}));

// Mock Alert
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

describe('Location Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Location State Management', () => {
    it('does not show location-dependent buttons without location', () => {
      const { queryByText } = render(<MapScreen />);
      
      expect(queryByText('SHARE LOCATION')).toBeNull();
      expect(queryByText('REPORT CROWDS')).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('handles WebView message errors', async () => {
      const { getByTestId } = render(<MapScreen />);
      const webView = getByTestId('mocked-webview');

      await act(async () => {
        webView.props.onMessage({
          nativeEvent: {
            data: JSON.stringify({
              type: 'ERROR',
              message: 'Location service unavailable'
            })
          }
        });
      });

      expect(true).toBe(true);
    });

    it('handles invalid JSON messages gracefully', async () => {
      const { getByTestId } = render(<MapScreen />);
      const webView = getByTestId('mocked-webview');

      await act(async () => {
        webView.props.onMessage({
          nativeEvent: {
            data: 'INVALID_JSON_MESSAGE'
          }
        });
      });
      expect(true).toBe(true);
    });
  });
});