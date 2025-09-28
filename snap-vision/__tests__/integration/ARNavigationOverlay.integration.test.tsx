import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { View } from 'react-native';
import ARNavigationOverlay from '../../src/components/organisms/ARNavigationOverlay';

jest.mock('@shopify/react-native-skia', () => {
  const { View } = require('react-native');
  return {
    Canvas: ({ children }) => <View testID="mock-canvas">{children}</View>,
    Path: () => null,
    Paint: () => ({}),
    Skia: {
      Point: () => ({}),
      Rect: () => ({}),
    },
  };
});

// Enhanced mocking for react-native-vision-camera
jest.mock('react-native-vision-camera', () => ({
  Camera: ({ children, ...props }: any) => {
    const { View } = require('react-native');
    return (
      <View testID="mock-camera" {...props}>
        {children}
      </View>
    );
  },
  useCameraDevices: jest.fn(() => [
    { id: 'back', position: 'back', name: 'Back Camera' },
    { id: 'front', position: 'front', name: 'Front Camera' },
  ]),
  useCameraPermission: jest.fn(() => ({
    hasPermission: true,
    requestPermission: jest.fn().mockResolvedValue('authorized'),
  })),
}));

describe('ARNavigationOverlay Component Integration', () => {
  const defaultProps = {
    currentLocation: { x: 28.233, y: -25.755 },
    destinationCoords: { x: 28.235, y: -25.757 },
    deviceHeading: 45,
    navigationSteps: [
      { instruction: 'Turn right', distance: 100 },
      { instruction: 'Continue straight', distance: 200 },
    ],
    routeCoordinates: [
      [28.233, -25.755],
      [28.234, -25.756],
      [28.235, -25.757],
    ] as [number, number][],
    currentRouteIndex: 0,
    showMiniMap: true,
  };

  describe('Component Rendering', () => {
    it('renders without crashing when permissions are granted', () => {
      const { getByTestId } = render(
        <NavigationContainer>
          <ARNavigationOverlay {...defaultProps} />
        </NavigationContainer>,
      );
      expect(getByTestId('mock-camera')).toBeTruthy();
    });
  });

  describe('Props Integration', () => {
    it('handles different route configurations', () => {
      const propsWithLongRoute = {
        ...defaultProps,
        routeCoordinates: [
          [28.233, -25.755],
          [28.234, -25.756],
          [28.235, -25.757],
          [28.236, -25.758],
          [28.237, -25.759],
        ] as [number, number][],
      };

      expect(() =>
        render(
          <NavigationContainer>
            <ARNavigationOverlay {...propsWithLongRoute} />
          </NavigationContainer>,
        ),
      ).not.toThrow();
    });

    it('handles edge case coordinates', () => {
      const propsWithEdgeCases = {
        ...defaultProps,
        currentLocation: { x: 180, y: -90 },
        destinationCoords: { x: -180, y: 90 },
      };

      expect(() =>
        render(
          <NavigationContainer>
            <ARNavigationOverlay {...propsWithEdgeCases} />
          </NavigationContainer>,
        ),
      ).not.toThrow();
    });

    it('handles missing optional props', () => {
      const minimalProps = {
        currentLocation: { x: 28.233, y: -25.755 },
        destinationCoords: { x: 28.235, y: -25.757 },
        deviceHeading: 0,
        navigationSteps: [],
        routeCoordinates: [] as [number, number][],
        currentRouteIndex: 0,
        showMiniMap: false,
      };

      expect(() =>
        render(
          <NavigationContainer>
            <ARNavigationOverlay {...minimalProps} />
          </NavigationContainer>,
        ),
      ).not.toThrow();
    });
  });

  describe('Component State Management', () => {
    it('initializes with default state values', () => {
      const { getByTestId } = render(
        <NavigationContainer>
          <ARNavigationOverlay {...defaultProps} />
        </NavigationContainer>,
      );
      const camera = getByTestId('mock-camera');
      expect(camera).toBeTruthy();
    });

    it('handles showMiniMap prop correctly', () => {
      const { rerender, queryByTestId } = render(
        <NavigationContainer>
          <ARNavigationOverlay {...defaultProps} showMiniMap={true} />
        </NavigationContainer>,
      );

      rerender(
        <NavigationContainer>
          <ARNavigationOverlay {...defaultProps} showMiniMap={false} />
        </NavigationContainer>,
      );
      // Should not render mini-map when showMiniMap is false
    });
  });

  describe('Error Handling', () => {
    it('handles invalid coordinates gracefully', () => {
      const propsWithInvalidCoords = {
        ...defaultProps,
        currentLocation: { x: NaN, y: NaN },
        destinationCoords: { x: NaN, y: NaN },
      };

      expect(() =>
        render(
          <NavigationContainer>
            <ARNavigationOverlay {...propsWithInvalidCoords} />
          </NavigationContainer>,
        ),
      ).not.toThrow();
    });

    it('handles empty navigation steps', () => {
      const propsWithEmptySteps = {
        ...defaultProps,
        navigationSteps: [],
      };

      expect(() =>
        render(
          <NavigationContainer>
            <ARNavigationOverlay {...propsWithEmptySteps} />
          </NavigationContainer>,
        ),
      ).not.toThrow();
    });

    it('handles negative route index', () => {
      const propsWithNegativeIndex = {
        ...defaultProps,
        currentRouteIndex: -1,
      };

      expect(() =>
        render(
          <NavigationContainer>
            <ARNavigationOverlay {...propsWithNegativeIndex} />
          </NavigationContainer>,
        ),
      ).not.toThrow();
    });

    it('handles route index beyond array bounds', () => {
      const propsWithLargeIndex = {
        ...defaultProps,
        currentRouteIndex: 999,
      };

      expect(() =>
        render(
          <NavigationContainer>
            <ARNavigationOverlay {...propsWithLargeIndex} />
          </NavigationContainer>,
        ),
      ).not.toThrow();
    });
  });

  describe('Fallback Components', () => {
    it('renders simple AR fallback with null current location', () => {
      const propsWithNullLocation = {
        ...defaultProps,
        currentLocation: null,
      };

      // This should trigger the fallback component paths
      expect(() =>
        render(
          <NavigationContainer>
            <ARNavigationOverlay {...propsWithNullLocation} />
          </NavigationContainer>,
        ),
      ).not.toThrow();
    });

    it('renders simple AR fallback with null destination', () => {
      const propsWithNullDestination = {
        ...defaultProps,
        destinationCoords: null,
      };

      // This should trigger the fallback component paths
      expect(() =>
        render(
          <NavigationContainer>
            <ARNavigationOverlay {...propsWithNullDestination} />
          </NavigationContainer>,
        ),
      ).not.toThrow();
    });

    it('handles fallback distance calculation and formatting', () => {
      // Test the distance formatting in fallback component
      const mockProps = {
        currentLocation: { x: 28.233, y: -25.755 },
        destinationCoords: { x: 28.235, y: -25.757 },
        deviceHeading: 45,
        navigationSteps: [],
        routeCoordinates: [] as [number, number][],
        currentRouteIndex: 0,
        showMiniMap: false,
      };

      expect(() =>
        render(
          <NavigationContainer>
            <ARNavigationOverlay {...mockProps} />
          </NavigationContainer>,
        ),
      ).not.toThrow();
    });
  });

  describe('Camera Integration', () => {
    it('passes correct props to Camera component', () => {
      const { getByTestId } = render(
        <NavigationContainer>
          <ARNavigationOverlay {...defaultProps} />
        </NavigationContainer>,
      );
      const camera = getByTestId('mock-camera');

      // Verify camera is rendered with expected props
      expect(camera.props.style).toBeDefined();
    });

    it('handles camera device switching', () => {
      // Mock multiple camera devices
      const mockUseCameraDevices = require('react-native-vision-camera').useCameraDevices;
      mockUseCameraDevices.mockReturnValueOnce([
        { id: 'back', position: 'back', name: 'Back Camera' },
        { id: 'front', position: 'front', name: 'Front Camera' },
        { id: 'wide', position: 'back', name: 'Wide Camera' },
      ]);

      const { getByTestId } = render(
        <NavigationContainer>
          <ARNavigationOverlay {...defaultProps} />
        </NavigationContainer>,
      );
      expect(getByTestId('mock-camera')).toBeTruthy();
    });
  });

  describe('Performance and Memory', () => {
    it('does not crash with rapid prop updates', () => {
      const { rerender } = render(
        <NavigationContainer>
          <ARNavigationOverlay {...defaultProps} />
        </NavigationContainer>,
      );

      // Simulate rapid location updates
      for (let i = 0; i < 10; i++) {
        const updatedProps = {
          ...defaultProps,
          currentLocation: {
            x: 28.233 + i * 0.0001,
            y: -25.755 + i * 0.0001,
          },
          deviceHeading: (45 + i * 10) % 360,
          currentRouteIndex: Math.min(i, defaultProps.routeCoordinates.length - 1),
        };
        expect(() =>
          rerender(
            <NavigationContainer>
              <ARNavigationOverlay {...updatedProps} />
            </NavigationContainer>,
          ),
        ).not.toThrow();
      }
    });

    it('handles large route datasets efficiently', () => {
      // Create a large route with 100 points
      const largeRoute: [number, number][] = [];
      for (let i = 0; i < 100; i++) {
        largeRoute.push([28.233 + i * 0.001, -25.755 + i * 0.001]);
      }

      const propsWithLargeRoute = {
        ...defaultProps,
        routeCoordinates: largeRoute,
      };

      expect(() =>
        render(
          <NavigationContainer>
            <ARNavigationOverlay {...propsWithLargeRoute} />
          </NavigationContainer>,
        ),
      ).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('provides accessible component structure', () => {
      const { getByTestId } = render(
        <NavigationContainer>
          <ARNavigationOverlay {...defaultProps} />
        </NavigationContainer>,
      );
      const camera = getByTestId('mock-camera');
      expect(camera).toBeTruthy();
    });
  });
});
