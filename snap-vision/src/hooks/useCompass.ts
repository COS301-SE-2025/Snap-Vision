// src/hooks/useCompass.ts
import { useState, useEffect } from 'react';
import { magnetometer, setUpdateIntervalForType, SensorTypes } from 'react-native-sensors';

export function useCompass() {
  const [heading, setHeading] = useState<number>(0);

  useEffect(() => {
    try {
      // Set update interval to 100ms for smooth updates
      setUpdateIntervalForType(SensorTypes.magnetometer, 100);

      const subscription = magnetometer.subscribe(
        ({ x, y, z }) => {
          // Calculate heading from magnetometer data
          let angle = Math.atan2(y, x) * (180 / Math.PI);

          // Normalize to 0-360 degrees
          angle = (angle + 360) % 360;

          setHeading(angle);
        },
        (error) => {
          console.warn('Magnetometer error:', error);
          // Fallback to mock heading for testing
          const interval = setInterval(() => {
            setHeading((prev) => (prev + 2) % 360);
          }, 1000);

          return () => clearInterval(interval);
        },
      );

      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.warn('Magnetometer not available, using mock heading:', error);

      // Fallback implementation for testing
      const interval = setInterval(() => {
        setHeading((prev) => (prev + 2) % 360);
      }, 1000);

      return () => clearInterval(interval);
    }
  }, []);

  return heading;
}
