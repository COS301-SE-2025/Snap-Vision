// snap-vision/__tests__/directions.test.tsx
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import MapScreen from '../src/screens/MapScreen';
import { ThemeProviderWrapper } from './test-utils/ThemeProviderWrapper';
import * as Permissions from 'react-native-permissions';
import { WebView } from 'react-native-webview';
import Tts from 'react-native-tts';

// Mock dependencies
jest.mock('@react-native-community/geolocation', () => ({
  getCurrentPosition: jest.fn((success) => 
    success({
      coords: {
        latitude: 37.7749,
        longitude: -122.4194
      }
    })
  )
}));

jest.mock('react-native-permissions', () => ({
  request: jest.fn(() => Promise.resolve('granted')),
  PERMISSIONS: {
    ANDROID: {
      ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION'
    }
  },
  RESULTS: {
    GRANTED: 'granted'
  }
}));

jest.mock('react-native-webview', () => {
  const { View } = require('react-native');
  return {
    WebView: jest.fn().mockImplementation(({ onMessage }) => {
      // Simulate MAP_READY message
      setTimeout(() => {
        onMessage({ nativeEvent: { data: 'MAP_READY' } });
      }, 100);
      return <View testID="mock-webview" />;
    })
  };
});

jest.mock('react-native-tts', () => ({
  stop: jest.fn(),
  speak: jest.fn(),
}));

jest.mock('@react-native-firebase/firestore', () => () => ({
  collection: jest.fn(() => ({
    get: jest.fn(() => Promise.resolve({
      docs: [
        {
          id: '1',
          data: () => ({
            name: 'Test POI',
            centroid: { longitude: -122.4194, latitude: 37.7749 }
          })
        }
      ]
    }))
  }))
}));

// Mock the API call
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      features: [{
        geometry: {
          coordinates: [[-122.4194, 37.7749], [-122.4184, 37.7739]]
        },
        properties: {
          segments: [{
            steps: [
              { instruction: 'Head north on Main St', distance: 100, duration: 60 },
              { instruction: 'Turn right on 2nd St', distance: 200, duration: 120 }
            ]
          }]
        }
      }]
    })
  })
);

describe('Directions Feature', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should request location permission and get current location', async () => {
    const { getByTestId } = render(
      <ThemeProviderWrapper>
        <MapScreen />
      </ThemeProviderWrapper>
    );

    await waitFor(() => {
      expect(Permissions.request).toHaveBeenCalledWith(
        Permissions.PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION
      );
    });
  });

  it('should handle destination search and route fetching', async () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <ThemeProviderWrapper>
        <MapScreen />
      </ThemeProviderWrapper>
    );

    // Wait for WebView to be ready
    await waitFor(() => expect(WebView).toHaveBeenCalled());

    // Enter destination and search
    const searchInput = getByPlaceholderText('Search destination...');
    fireEvent.changeText(searchInput, 'Test POI');
    
    // Select POI from suggestions
    await waitFor(() => {
      const poiSuggestion = getByText('Test POI');
      fireEvent.press(poiSuggestion);
    });

    // Trigger search
    fireEvent(searchInput, 'submitEditing');

    await waitFor(() => {
      expect(fetch).toHaveBeenCalled();
      expect(WebView).toHaveBeenCalledWith(
        expect.objectContaining({
          ref: expect.any(Object),
        }),
        expect.anything()
      );
    });
  });

  it('should display directions modal with steps', async () => {
    const { getByPlaceholderText, getByText, queryByText } = render(
      <ThemeProviderWrapper>
        <MapScreen />
      </ThemeProviderWrapper>
    );

    // Wait for WebView to be ready
    await waitFor(() => expect(WebView).toHaveBeenCalled());

    // Enter destination and search
    const searchInput = getByPlaceholderText('Search destination...');
    fireEvent.changeText(searchInput, 'Test POI');
    
    // Select POI from suggestions
    await waitFor(() => {
      const poiSuggestion = getByText('Test POI');
      fireEvent.press(poiSuggestion);
    });

    // Trigger search
    fireEvent(searchInput, 'submitEditing');

    // Check if directions modal is shown with steps
    await waitFor(() => {
      expect(getByText('Head north on Main St')).toBeTruthy();
      expect(getByText('Turn right on 2nd St')).toBeTruthy();
    });
  });

  it('should start navigation with voice guidance', async () => {
    const { getByPlaceholderText, getByText, getByTestId } = render(
      <ThemeProviderWrapper>
        <MapScreen />
      </ThemeProviderWrapper>
    );

    // Wait for WebView to be ready
    await waitFor(() => expect(WebView).toHaveBeenCalled());

    // Enter destination and search
    const searchInput = getByPlaceholderText('Search destination...');
    fireEvent.changeText(searchInput, 'Test POI');
    
    // Select POI from suggestions
    await waitFor(() => {
      const poiSuggestion = getByText('Test POI');
      fireEvent.press(poiSuggestion);
    });

    // Trigger search
    fireEvent(searchInput, 'submitEditing');

    // Start navigation
    await waitFor(() => {
      const startButton = getByText('Start Navigation');
      fireEvent.press(startButton);
    });

    // Check if TTS was called with the first instruction
    await waitFor(() => {
      expect(Tts.speak).toHaveBeenCalledWith('Head north on Main St');
    });
  });

  it('should toggle voice guidance on/off', async () => {
    const { getByTestId } = render(
      <ThemeProviderWrapper>
        <MapScreen />
      </ThemeProviderWrapper>
    );

    // Wait for WebView to be ready
    await waitFor(() => expect(WebView).toHaveBeenCalled());

    // Find and press the voice toggle button
    const voiceToggle = getByTestId('voice-toggle-button');
    fireEvent.press(voiceToggle);

    await waitFor(() => {
      expect(Tts.stop).toHaveBeenCalled();
    });
  });

  it('should handle navigation step changes', async () => {
    const { getByPlaceholderText, getByText, getByTestId } = render(
      <ThemeProviderWrapper>
        <MapScreen />
      </ThemeProviderWrapper>
    );

    // Wait for WebView to be ready
    await waitFor(() => expect(WebView).toHaveBeenCalled());

    // Enter destination and search
    const searchInput = getByPlaceholderText('Search destination...');
    fireEvent.changeText(searchInput, 'Test POI');
    
    // Select POI from suggestions
    await waitFor(() => {
      const poiSuggestion = getByText('Test POI');
      fireEvent.press(poiSuggestion);
    });

    // Trigger search
    fireEvent(searchInput, 'submitEditing');

    // Start navigation
    await waitFor(() => {
      const startButton = getByText('Start Navigation');
      fireEvent.press(startButton);
    });

    // Simulate moving to next step
    act(() => {
      // This would normally be triggered by location changes in real usage
      // For test, we'll directly update the state
      const webViewInstance = WebView.mock.instances[0];
      webViewInstance.props.onMessage({
        nativeEvent: {
          data: JSON.stringify({
            type: 'NAVIGATION_UPDATE',
            currentStep: 1
          })
        }
      });
    });

    await waitFor(() => {
      expect(Tts.speak).toHaveBeenCalledWith('Turn right on 2nd St');
    });
  });
});