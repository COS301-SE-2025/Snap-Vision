import React from 'react';
import { render } from '@testing-library/react-native';
import { View, Text } from 'react-native';

describe('AR Navigation Guidance Logic', () => {
  // Utility functions for testing
  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (x: number) => (x * Math.PI) / 180;
    const R = 6371000; // Earth's radius in meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const toRad = (x: number) => (x * Math.PI) / 180;
    const toDeg = (x: number) => (x * 180) / Math.PI;

    const dLon = toRad(lon2 - lon1);
    const lat1Rad = toRad(lat1);
    const lat2Rad = toRad(lat2);

    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x =
      Math.cos(lat1Rad) * Math.sin(lat2Rad) -
      Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

    const bearing = normalizeAngle(toDeg(Math.atan2(y, x)));
    return bearing;
  }

  function normalizeAngle(angle: number): number {
    while (angle > 180) angle -= 360;
    while (angle < -180) angle += 360;
    return angle;
  }

  function getDirectionInstruction(relativeBearing: number): string {
    const absRelativeBearing = Math.abs(relativeBearing);

    if (absRelativeBearing < 35) return 'Continue Straight';
    if (relativeBearing >= 35 && relativeBearing < 80) return 'Turn Right';
    if (relativeBearing >= 80 && relativeBearing < 120) return 'Sharp Right';
    if (relativeBearing >= 120) return 'Turn Around';
    if (relativeBearing <= -35 && relativeBearing > -80) return 'Turn Left';
    if (relativeBearing <= -80 && relativeBearing > -120) return 'Sharp Left';
    if (relativeBearing <= -120) return 'Turn Around';
    return 'Continue';
  }

  function getDirectionEmoji(relativeBearing: number): string {
    if (Math.abs(relativeBearing) < 35) return '↑';
    if (relativeBearing >= 35 && relativeBearing < 80) return '↗';
    if (relativeBearing >= 80 && relativeBearing < 120) return '→';
    if (relativeBearing >= 120) return '↻';
    if (relativeBearing <= -35 && relativeBearing > -80) return '↖';
    if (relativeBearing <= -80 && relativeBearing > -120) return '←';
    if (relativeBearing <= -120) return '↻';
    return '↑';
  }

  describe('Bearing and Direction Calculations', () => {
    const mockLocation = { x: 28.233, y: -25.755 };
    const mockDestination = { x: 28.235, y: -25.757 };
    const deviceHeading = 45;

    it('calculates bearing between two points correctly', () => {
      const bearing = calculateBearing(
        mockLocation.y, // latitude
        mockLocation.x, // longitude
        mockDestination.y, // target latitude
        mockDestination.x, // target longitude
      );

      expect(bearing).toBeGreaterThanOrEqual(-180);
      expect(bearing).toBeLessThanOrEqual(180);
      expect(typeof bearing).toBe('number');
      expect(isFinite(bearing)).toBe(true);
    });

    it('calculates relative bearing with device heading offset', () => {
      const trueBearing = calculateBearing(
        mockLocation.y,
        mockLocation.x,
        mockDestination.y,
        mockDestination.x,
      );

      const normalizedDeviceHeading = ((deviceHeading % 360) + 360) % 360;
      const relativeBearing = normalizeAngle(trueBearing - normalizedDeviceHeading);

      expect(relativeBearing).toBeGreaterThanOrEqual(-180);
      expect(relativeBearing).toBeLessThanOrEqual(180);
    });

    it('provides correct direction instruction for straight ahead', () => {
      const relativeBearing = 0; // Straight ahead
      const instruction = getDirectionInstruction(relativeBearing);
      const emoji = getDirectionEmoji(relativeBearing);

      expect(instruction).toBe('Continue Straight');
      expect(emoji).toBe('↑');
    });

    it('provides correct direction instruction for right turn', () => {
      const relativeBearing = 60; // Right turn
      const instruction = getDirectionInstruction(relativeBearing);
      const emoji = getDirectionEmoji(relativeBearing);

      expect(instruction).toBe('Turn Right');
      expect(emoji).toBe('↗');
    });

    it('provides correct direction instruction for left turn', () => {
      const relativeBearing = -60; // Left turn
      const instruction = getDirectionInstruction(relativeBearing);
      const emoji = getDirectionEmoji(relativeBearing);

      expect(instruction).toBe('Turn Left');
      expect(emoji).toBe('↖');
    });

    it('provides correct direction instruction for sharp turns', () => {
      const sharpRight = getDirectionInstruction(100);
      const sharpLeft = getDirectionInstruction(-100);

      expect(sharpRight).toBe('Sharp Right');
      expect(sharpLeft).toBe('Sharp Left');
    });

    it('provides turn around instruction for opposite direction', () => {
      const turnAround1 = getDirectionInstruction(150);
      const turnAround2 = getDirectionInstruction(-150);

      expect(turnAround1).toBe('Turn Around');
      expect(turnAround2).toBe('Turn Around');
    });
  });

  describe('Route Navigation Logic', () => {
    const routeCoordinates: [number, number][] = [
      [28.233, -25.755],
      [28.234, -25.756],
      [28.235, -25.757],
    ];

    it('selects correct next point based on route index', () => {
      const currentRouteIndex = 0;
      const lookAheadDistance = 1;
      const nextIndex = Math.min(
        currentRouteIndex + lookAheadDistance,
        routeCoordinates.length - 1,
      );
      const nextPoint = routeCoordinates[nextIndex];

      expect(nextPoint).toEqual([28.234, -25.756]);
    });

    it('uses last point when at end of route', () => {
      const currentRouteIndex = 2; // At last point
      const lookAheadDistance = 1;
      const nextIndex = Math.min(
        currentRouteIndex + lookAheadDistance,
        routeCoordinates.length - 1,
      );
      const nextPoint = routeCoordinates[nextIndex];

      expect(nextPoint).toEqual([28.235, -25.757]);
    });

    it('handles route index beyond array bounds', () => {
      const currentRouteIndex = 10; // Beyond array
      const lookAheadDistance = 1;
      const nextIndex = Math.min(
        currentRouteIndex + lookAheadDistance,
        routeCoordinates.length - 1,
      );
      const nextPoint = routeCoordinates[nextIndex];

      expect(nextPoint).toEqual([28.235, -25.757]);
    });
  });

  describe('Distance Calculations', () => {
    it('calculates realistic distances for campus navigation', () => {
      const start = { lat: -25.7553, lon: 28.233 };
      const end = { lat: -25.756, lon: 28.234 };

      const distance = calculateDistance(start.lat, start.lon, end.lat, end.lon);

      // Should be reasonable for campus navigation (under 1km)
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(1000);
    });

    it('returns 0 for identical coordinates', () => {
      const distance = calculateDistance(-25.755, 28.233, -25.755, 28.233);
      expect(distance).toBe(0);
    });

    it('calculates short distances accurately', () => {
      // Test with coordinates ~100m apart
      const distance = calculateDistance(-25.755, 28.233, -25.754, 28.233);

      // Should be approximately 111 meters (allow tolerance)
      expect(distance).toBeGreaterThan(100);
      expect(distance).toBeLessThan(130);
    });
  });

  describe('Bearing Smoothing Logic', () => {
    it('applies weighted average to bearing history', () => {
      const bearingHistory = [10, 15, 20, 25, 30];

      let weightedSum = 0;
      let totalWeight = 0;

      bearingHistory.forEach((bearing, index) => {
        const weight = index + 1; // More recent = higher weight
        weightedSum += bearing * weight;
        totalWeight += weight;
      });

      const smoothed = weightedSum / totalWeight;

      // Should be weighted toward more recent values
      expect(smoothed).toBeGreaterThan(20); // More than simple average (20)
      expect(smoothed).toBeLessThan(30);
    });

    it('limits bearing history to maximum length', () => {
      let bearingHistory: number[] = [];
      const maxHistoryLength = 5;

      // Add more readings than max length
      for (let i = 0; i < 8; i++) {
        bearingHistory = [...bearingHistory, i * 10].slice(-maxHistoryLength);
      }

      expect(bearingHistory.length).toBe(maxHistoryLength);
      expect(bearingHistory).toEqual([30, 40, 50, 60, 70]);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles extreme coordinate values gracefully', () => {
      expect(() => calculateDistance(89, 179, 90, -179)).not.toThrow();
      expect(() => calculateBearing(89, 179, 90, -179)).not.toThrow();
    });

    it('handles zero distance between points', () => {
      const bearing = calculateBearing(0, 0, 0, 0);
      expect(typeof bearing).toBe('number');
      expect(isFinite(bearing)).toBe(true);
    });

    it('normalizes extreme angle values correctly', () => {
      expect(normalizeAngle(360)).toBe(0);
      expect(normalizeAngle(-360)).toBe(0);
      expect(normalizeAngle(450)).toBe(90);
      expect(normalizeAngle(-450)).toBe(-90);
    });

    it('provides fallback direction for invalid bearing values', () => {
      // Test with NaN (though this shouldn't happen in practice)
      const instruction = getDirectionInstruction(NaN);
      expect(instruction).toBe('Continue');
    });
  });

  describe('Real-world Navigation Scenarios', () => {
    it('handles typical university campus navigation', () => {
      // Simulate walking from one building to another on UP campus
      const start = { lat: -25.7553, lon: 28.233 }; // Engineering building
      const end = { lat: -25.757, lon: 28.235 }; // Library
      const deviceHeading = 90; // Facing east

      const bearing = calculateBearing(start.lat, start.lon, end.lat, end.lon);
      const relativeBearing = normalizeAngle(bearing - deviceHeading);
      const instruction = getDirectionInstruction(relativeBearing);
      const distance = calculateDistance(start.lat, start.lon, end.lat, end.lon);

      // Should provide reasonable navigation guidance
      expect(typeof instruction).toBe('string');
      expect(instruction).not.toBe('');
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(500); // Reasonable campus distance
    });

    it('handles indoor navigation scenario', () => {
      // Simulate indoor navigation with small coordinate differences
      const start = { lat: -25.7553, lon: 28.233 };
      const end = { lat: -25.75535, lon: 28.23305 };
      const deviceHeading = 0; // Facing north

      const bearing = calculateBearing(start.lat, start.lon, end.lat, end.lon);
      const relativeBearing = normalizeAngle(bearing - deviceHeading);
      const instruction = getDirectionInstruction(relativeBearing);

      expect(typeof instruction).toBe('string');
      expect([
        'Continue Straight',
        'Turn Right',
        'Turn Left',
        'Sharp Right',
        'Sharp Left',
        'Turn Around',
        'Continue',
      ]).toContain(instruction);
    });
  });

  describe('Component Integration Tests', () => {
    // Simple test component to verify integration
    function NavigationDisplay({ bearing, instruction }: { bearing: number; instruction: string }) {
      return (
        <View testID="navigation-display">
          <Text testID="bearing-text">{bearing.toFixed(1)}°</Text>
          <Text testID="instruction-text">{instruction}</Text>
        </View>
      );
    }

    it('renders navigation information correctly', () => {
      const bearing = 45.5;
      const instruction = 'Turn Right';

      const { getByTestId } = render(
        <NavigationDisplay bearing={bearing} instruction={instruction} />,
      );

      expect(getByTestId('bearing-text')).toHaveTextContent('45.5°');
      expect(getByTestId('instruction-text')).toHaveTextContent('Turn Right');
    });

    it('integrates bearing calculation with direction instruction', () => {
      const currentLocation = { x: 28.233, y: -25.755 };
      const destination = { x: 28.235, y: -25.757 };
      const deviceHeading = 45;

      const bearing = calculateBearing(
        currentLocation.y,
        currentLocation.x,
        destination.y,
        destination.x,
      );

      const relativeBearing = normalizeAngle(bearing - deviceHeading);
      const instruction = getDirectionInstruction(relativeBearing);

      const { getByTestId } = render(
        <NavigationDisplay bearing={relativeBearing} instruction={instruction} />,
      );

      expect(getByTestId('bearing-text')).toBeTruthy();
      expect(getByTestId('instruction-text')).toBeTruthy();

      // Verify the instruction makes sense for the calculated bearing
      const instructionText = getByTestId('instruction-text').children[0] as string;
      expect([
        'Continue Straight',
        'Turn Right',
        'Turn Left',
        'Sharp Right',
        'Sharp Left',
        'Turn Around',
        'Continue',
      ]).toContain(instructionText);
    });
  });
});
