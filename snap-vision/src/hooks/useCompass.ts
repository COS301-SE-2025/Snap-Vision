import { useState, useEffect } from 'react';
import CompassHeading from 'react-native-compass-heading';

export function useCompass() {
  const [heading, setHeading] = useState<number>(0);
  const [readings, setReadings] = useState<number[]>([]);

  useEffect(() => {
    let isSubscribed = true;

    // Start compass heading updates
    const degreeUpdateRate = 3; // Update every 3 degrees of change

    CompassHeading.start(degreeUpdateRate, (data) => {
      if (isSubscribed) {
        // The callback receives an object with heading and accuracy
        const currentHeading = data.heading;
        ////consolelog('Compass heading:', currentHeading, 'accuracy:', data.accuracy);

        // Simple moving average filter to reduce jitter
        setReadings((prev) => {
          const newReadings = [...prev, currentHeading].slice(-5); // Keep last 5 readings
          const avgHeading = newReadings.reduce((sum, val) => sum + val, 0) / newReadings.length;
          setHeading(avgHeading);
          return newReadings;
        });
      }
    });

    // Cleanup function
    return () => {
      isSubscribed = false;
      CompassHeading.stop();
    };
  }, []);

  return heading;
}
