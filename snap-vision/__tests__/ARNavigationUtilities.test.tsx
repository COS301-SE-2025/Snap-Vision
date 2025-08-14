// Test file for AR Navigation utility functions
describe('AR Navigation Utility Functions', () => {
  // Utility functions extracted from ARNavigationOverlay for testing
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

  describe('calculateDistance', () => {
    it('calculates distance between two GPS coordinates correctly', () => {
      // Test with known coordinates (London to Paris approximately 344 km)
      const london = { lat: 51.5074, lon: -0.1278 };
      const paris = { lat: 48.8566, lon: 2.3522 };

      const distance = calculateDistance(london.lat, london.lon, paris.lat, paris.lon);

      // Should be approximately 344,000 meters (allow 5% tolerance)
      expect(distance).toBeGreaterThan(320000);
      expect(distance).toBeLessThan(370000);
    });

    it('returns 0 for identical coordinates', () => {
      const distance = calculateDistance(40.7128, -74.006, 40.7128, -74.006);
      expect(distance).toBe(0);
    });

    it('calculates short distances accurately', () => {
      // 100m north from a point (approximately)
      const lat1 = -25.755;
      const lon1 = 28.233;
      const lat2 = -25.754; // ~111m north
      const lon2 = 28.233;

      const distance = calculateDistance(lat1, lon1, lat2, lon2);

      // Should be approximately 111 meters (allow 10% tolerance)
      expect(distance).toBeGreaterThan(100);
      expect(distance).toBeLessThan(122);
    });

    it('handles negative coordinates correctly', () => {
      const distance = calculateDistance(-25.755, 28.233, -25.757, 28.235);
      expect(distance).toBeGreaterThan(0);
      expect(typeof distance).toBe('number');
      expect(isFinite(distance)).toBe(true);
    });
  });

  describe('calculateBearing', () => {
    it('calculates bearing for north direction', () => {
      const bearing = calculateBearing(0, 0, 1, 0); // Moving north
      expect(bearing).toBeCloseTo(0, 1);
    });

    it('calculates bearing for east direction', () => {
      const bearing = calculateBearing(0, 0, 0, 1); // Moving east
      expect(bearing).toBeCloseTo(90, 1);
    });

    it('calculates bearing for south direction', () => {
      const bearing = calculateBearing(0, 0, -1, 0); // Moving south
      expect(Math.abs(bearing)).toBeCloseTo(180, 1);
    });

    it('calculates bearing for west direction', () => {
      const bearing = calculateBearing(0, 0, 0, -1); // Moving west
      expect(bearing).toBeCloseTo(-90, 1);
    });

    it('returns normalized bearing between -180 and 180', () => {
      const bearing = calculateBearing(-25.755, 28.233, -25.757, 28.235);
      expect(bearing).toBeGreaterThanOrEqual(-180);
      expect(bearing).toBeLessThanOrEqual(180);
    });

    it('calculates bearing for same coordinates', () => {
      const bearing = calculateBearing(40.7128, -74.006, 40.7128, -74.006);
      expect(bearing).toBe(0);
    });
  });

  describe('normalizeAngle', () => {
    it('keeps angles within -180 to 180 range unchanged', () => {
      expect(normalizeAngle(45)).toBe(45);
      expect(normalizeAngle(-45)).toBe(-45);
      expect(normalizeAngle(180)).toBe(180);
      expect(normalizeAngle(-180)).toBe(-180);
    });

    it('normalizes positive angles greater than 180', () => {
      expect(normalizeAngle(270)).toBe(-90);
      expect(normalizeAngle(360)).toBe(0);
      expect(normalizeAngle(450)).toBe(90);
    });

    it('normalizes negative angles less than -180', () => {
      expect(normalizeAngle(-270)).toBe(90);
      expect(normalizeAngle(-360)).toBe(0);
      expect(normalizeAngle(-450)).toBe(-90);
    });

    it('handles multiple full rotations', () => {
      expect(normalizeAngle(720)).toBe(0);
      expect(normalizeAngle(-720)).toBe(0);
      expect(normalizeAngle(1080)).toBe(0);
    });

    it('handles edge cases', () => {
      expect(normalizeAngle(0)).toBe(0);
      expect(normalizeAngle(181)).toBe(-179);
      expect(normalizeAngle(-181)).toBe(179);
    });
  });

  describe('getDirectionInstruction', () => {
    it('returns correct instruction for straight ahead', () => {
      expect(getDirectionInstruction(0)).toBe('Continue Straight');
      expect(getDirectionInstruction(30)).toBe('Continue Straight');
      expect(getDirectionInstruction(-30)).toBe('Continue Straight');
      expect(getDirectionInstruction(34)).toBe('Continue Straight');
      expect(getDirectionInstruction(-34)).toBe('Continue Straight');
    });

    it('returns correct instruction for right turns', () => {
      expect(getDirectionInstruction(45)).toBe('Turn Right');
      expect(getDirectionInstruction(60)).toBe('Turn Right');
      expect(getDirectionInstruction(79)).toBe('Turn Right');
    });

    it('returns correct instruction for sharp right turns', () => {
      expect(getDirectionInstruction(90)).toBe('Sharp Right');
      expect(getDirectionInstruction(100)).toBe('Sharp Right');
      expect(getDirectionInstruction(119)).toBe('Sharp Right');
    });

    it('returns correct instruction for left turns', () => {
      expect(getDirectionInstruction(-45)).toBe('Turn Left');
      expect(getDirectionInstruction(-60)).toBe('Turn Left');
      expect(getDirectionInstruction(-79)).toBe('Turn Left');
    });

    it('returns correct instruction for sharp left turns', () => {
      expect(getDirectionInstruction(-90)).toBe('Sharp Left');
      expect(getDirectionInstruction(-100)).toBe('Sharp Left');
      expect(getDirectionInstruction(-119)).toBe('Sharp Left');
    });

    it('returns correct instruction for turn around', () => {
      expect(getDirectionInstruction(150)).toBe('Turn Around');
      expect(getDirectionInstruction(180)).toBe('Turn Around');
      expect(getDirectionInstruction(-150)).toBe('Turn Around');
      expect(getDirectionInstruction(-180)).toBe('Turn Around');
    });

    it('handles boundary values correctly', () => {
      expect(getDirectionInstruction(35)).toBe('Turn Right');
      expect(getDirectionInstruction(-35)).toBe('Turn Left');
      expect(getDirectionInstruction(80)).toBe('Sharp Right');
      expect(getDirectionInstruction(-80)).toBe('Sharp Left');
      expect(getDirectionInstruction(120)).toBe('Turn Around');
      expect(getDirectionInstruction(-120)).toBe('Turn Around');
    });
  });

  describe('getDirectionEmoji', () => {
    it('returns correct emoji for straight ahead', () => {
      expect(getDirectionEmoji(0)).toBe('↑');
      expect(getDirectionEmoji(30)).toBe('↑');
      expect(getDirectionEmoji(-30)).toBe('↑');
    });

    it('returns correct emoji for right directions', () => {
      expect(getDirectionEmoji(45)).toBe('↗');
      expect(getDirectionEmoji(90)).toBe('→');
    });

    it('returns correct emoji for left directions', () => {
      expect(getDirectionEmoji(-45)).toBe('↖');
      expect(getDirectionEmoji(-90)).toBe('←');
    });

    it('returns correct emoji for turn around', () => {
      expect(getDirectionEmoji(150)).toBe('↻');
      expect(getDirectionEmoji(-150)).toBe('↻');
      expect(getDirectionEmoji(180)).toBe('↻');
      expect(getDirectionEmoji(-180)).toBe('↻');
    });

    it('handles boundary values correctly', () => {
      expect(getDirectionEmoji(34)).toBe('↑');
      expect(getDirectionEmoji(35)).toBe('↗');
      expect(getDirectionEmoji(-35)).toBe('↖');
      expect(getDirectionEmoji(80)).toBe('→');
      expect(getDirectionEmoji(-80)).toBe('←');
    });
  });

  describe('Integration Tests - Direction Logic', () => {
    it('provides consistent direction instruction and emoji', () => {
      const testCases = [
        { bearing: 0, instruction: 'Continue Straight', emoji: '↑' },
        { bearing: 45, instruction: 'Turn Right', emoji: '↗' },
        { bearing: 90, instruction: 'Sharp Right', emoji: '→' },
        { bearing: 150, instruction: 'Turn Around', emoji: '↻' },
        { bearing: -45, instruction: 'Turn Left', emoji: '↖' },
        { bearing: -90, instruction: 'Sharp Left', emoji: '←' },
        { bearing: -150, instruction: 'Turn Around', emoji: '↻' },
      ];

      testCases.forEach(({ bearing, instruction, emoji }) => {
        expect(getDirectionInstruction(bearing)).toBe(instruction);
        expect(getDirectionEmoji(bearing)).toBe(emoji);
      });
    });
  });

  describe('Real-world Scenario Tests', () => {
    it('calculates realistic campus navigation scenario', () => {
      // University of Pretoria coordinates
      const start = { lat: -25.7553, lon: 28.233 };
      const end = { lat: -25.756, lon: 28.234 };

      const distance = calculateDistance(start.lat, start.lon, end.lat, end.lon);
      const bearing = calculateBearing(start.lat, start.lon, end.lat, end.lon);

      // Distance should be reasonable for campus navigation (under 1km)
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(1000);

      // Bearing should be valid
      expect(bearing).toBeGreaterThanOrEqual(-180);
      expect(bearing).toBeLessThanOrEqual(180);

      // Should provide reasonable direction
      const instruction = getDirectionInstruction(bearing);
      expect(instruction).toBeDefined();
      expect(typeof instruction).toBe('string');
    });

    it('handles bearing calculation with device heading offset', () => {
      const currentLat = -25.7553;
      const currentLon = 28.233;
      const targetLat = -25.756;
      const targetLon = 28.234;
      const deviceHeading = 45; // Device pointing northeast

      const trueBearing = calculateBearing(currentLat, currentLon, targetLat, targetLon);
      const normalizedDeviceHeading = ((deviceHeading % 360) + 360) % 360;
      const relativeBearing = normalizeAngle(trueBearing - normalizedDeviceHeading);

      // Relative bearing should be normalized
      expect(relativeBearing).toBeGreaterThanOrEqual(-180);
      expect(relativeBearing).toBeLessThanOrEqual(180);

      // Should provide appropriate direction instruction
      const instruction = getDirectionInstruction(relativeBearing);
      expect([
        'Continue Straight',
        'Turn Right',
        'Sharp Right',
        'Turn Around',
        'Turn Left',
        'Sharp Left',
        'Continue',
      ]).toContain(instruction);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('handles extreme coordinate values', () => {
      // Test with coordinates at extreme latitudes
      expect(() => calculateDistance(89, 0, 90, 0)).not.toThrow();
      expect(() => calculateDistance(-89, 0, -90, 0)).not.toThrow();

      // Test with coordinates at extreme longitudes
      expect(() => calculateDistance(0, 179, 0, -179)).not.toThrow();
      expect(() => calculateDistance(0, -179, 0, 179)).not.toThrow();
    });

    it('handles very small coordinate differences', () => {
      const distance = calculateDistance(0, 0, 0.0001, 0.0001);
      expect(distance).toBeGreaterThan(0);
      expect(isFinite(distance)).toBe(true);
    });

    it('normalizes extreme angle values', () => {
      expect(normalizeAngle(1000)).toBeGreaterThanOrEqual(-180);
      expect(normalizeAngle(1000)).toBeLessThanOrEqual(180);

      expect(normalizeAngle(-1000)).toBeGreaterThanOrEqual(-180);
      expect(normalizeAngle(-1000)).toBeLessThanOrEqual(180);
    });

    it('provides fallback direction for unexpected bearing values', () => {
      // Test with values that might occur due to calculation errors
      expect(getDirectionInstruction(NaN)).toBe('Continue');
      expect(getDirectionEmoji(NaN)).toBe('↑');
    });
  });
});
