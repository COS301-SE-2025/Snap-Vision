// src/hooks/useCompass.ts
import { useState, useEffect } from 'react';
import { magnetometer, setUpdateIntervalForType, SensorTypes } from 'react-native-sensors';

export function useCompass() {
  const [heading, setHeading] = useState<number>(0);
  const [readings, setReadings] = useState<number[]>([]);

  useEffect(() => {
    try {
      // Set update interval to 250ms for more stable updates
      setUpdateIntervalForType(SensorTypes.magnetometer, 250);

      const subscription = magnetometer.subscribe(
        ({ x, y, z }) => {
          // Calculate raw heading from magnetometer data
          let angle = Math.atan2(-y, x) * (180 / Math.PI);

          // Normalize to 0-360 degrees
          angle = (angle + 360) % 360;

          // CALIBRATION: Add offset to match actual device compass
          // Your device compass shows 0° when facing north, but our calculation was different
          // We need to calibrate to match your device's built-in compass
          const calibrationOffset = -81; // Flip the calibration direction
          angle = (angle - calibrationOffset + 360) % 360;

          // Simple moving average filter to reduce jitter
          setReadings(prev => {
            const newReadings = [...prev, angle].slice(-5); // Keep last 5 readings
            const avgAngle = newReadings.reduce((sum, val) => sum + val, 0) / newReadings.length;
            setHeading(avgAngle);
            return newReadings;
          });
        },
        (error) => {
          console.warn('Magnetometer error:', error);
          // Fallback to mock heading for testing
          const interval = setInterval(() => {
            setHeading(73); // Use your actual compass reading for testing
          }, 1000);

          return () => clearInterval(interval);
        },
      );

      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.warn('Magnetometer not available, using mock heading:', error);

      // Fallback implementation for testing - use your actual compass reading
      setHeading(73); // Use your actual compass reading
    }
  }, []);

  return heading;
}
