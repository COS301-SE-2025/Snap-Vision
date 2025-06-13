// src/__tests__/directions.test.tsx
import React from 'react';
import { View } from 'react-native';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import MapScreen from '../screens/MapScreen';
import { ThemeProviderWrapper } from './test-utils/ThemeProviderWrapper';
import fetchMock from 'jest-fetch-mock';
import Geolocation from '@react-native-community/geolocation';
import Tts from 'react-native-tts';

// Mock ThemeContext
jest.mock('../theme/ThemeContext', () => ({
  useTheme: () => ({
    isDark: false,
    theme: 'light',
    toggleTheme: jest.fn()
  }),
  ThemeProvider: ({ children }) => <>{children}</>
}));

// Mock Firebase Firestore more thoroughly
jest.mock('@react-native-firebase/firestore', () => () => ({
  collection: jest.fn().mockReturnThis(),
  get: jest.fn(() => Promise.resolve({
    docs: [
      { 
        id: 'poi1', 
        data: () => ({ 
          name: 'Library', 
          centroid: { latitude: 37.42, longitude: -122.08 } 
        })
      }
    ]
  })),
  where: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  startAfter: jest.fn().mockReturnThis(),
  doc: jest.fn().mockReturnThis(),
  set: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  onSnapshot: jest.fn(),
}));

// Mock WebView
const mockInjectJavaScript = jest.fn();
jest.mock('react-native-webview', () => {
  const React = require('react');
  const { forwardRef, useImperativeHandle } = React;
  return {
    WebView: forwardRef((props, ref) => {
      useImperativeHandle(ref, () => ({
        injectJavaScript: mockInjectJavaScript,
      }));
      return <View {...props} testID="mocked-webview" />;
    })
  };
});

// Mock Geolocation
jest.mock('@react-native-community/geolocation', () => ({
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
}));

// Mock TTS
jest.mock('react-native-tts', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  getInitStatus: jest.fn(() => Promise.resolve()),
  setDefaultRate: jest.fn(),
  setDefaultPitch: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}));

// Mock PermissionsAndroid
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.PermissionsAndroid = {
    request: jest.fn(() => Promise.resolve(RN.PermissionsAndroid.RESULTS.GRANTED)),
    PERMISSIONS: {
      ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION'
    },
    RESULTS: {
      GRANTED: 'granted'
    }
  };
  return RN;
});

fetchMock.enableMocks();

describe('Directions Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock.resetMocks();
    
    Geolocation.getCurrentPosition.mockImplementation((success) => 
      success({ coords: { latitude: 37.42, longitude: -122.08 } })
    );
    
    Tts.speak.mockResolvedValue(undefined);
    Tts.stop.mockResolvedValue(undefined);
    Tts.getInitStatus.mockResolvedValue(undefined);
  });

  it('should fetch and display route when destination is selected', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({
      features: [{
        geometry: { coordinates: [[-122.08, 37.42], [-122.09, 37.43]] },
        properties: {
          segments: [{
            steps: [
              { instruction: 'Head north', distance: 100 },
              { instruction: 'Turn right', distance: 50 }
            ],
            distance: 150,
            duration: 120
          }]
        }
      }]
    }));

    const { getByPlaceholderText, getByText, queryByText } = render(
      <ThemeProviderWrapper>
        <MapScreen />
      </ThemeProviderWrapper>
    );
    
    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    fireEvent.changeText(getByPlaceholderText('Search destination...'), 'Library');
    await waitFor(() => expect(getByText('Library')).toBeTruthy());
    fireEvent.press(getByText('Library'));
    fireEvent.press(getByText('Search'));
    
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('api/directions?start=-122.08,37.42&end=-122.08,37.42')
      );
      expect(mockInjectJavaScript).toHaveBeenCalledWith(expect.stringContaining('window.drawRoute'));
    });
  });