import { useEffect, useState, useRef } from 'react';
import firestore from '@react-native-firebase/firestore';
import { scanForWiFiNetworks } from '../services/scanService';
import { estimateIndoorPosition } from '../utils/indoor/estimateIndoorPosition';

interface Position {
  x: number;
  y: number;
}

export function useIndoorPosition(
  locationId: string | null,
  buildingId: string | null,
  floorId: string | null,
  pollInterval = 5000
) {
  const [position, setPosition] = useState<Position | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const lastPositionRef = useRef<Position | null>(null);
  const positionHistoryRef = useRef<Position[]>([]);

  // Smooth position updates
  const smoothPosition = (newPosition: Position): Position => {
    if (!lastPositionRef.current) {
      lastPositionRef.current = newPosition;
      return newPosition;
    }

    // Add to history
    positionHistoryRef.current.push(newPosition);
    if (positionHistoryRef.current.length > 3) {
      positionHistoryRef.current.shift(); // Keep only last 3 positions
    }

    // Calculate distance from last position
    const distance = Math.sqrt(
      Math.pow(newPosition.x - lastPositionRef.current.x, 2) +
      Math.pow(newPosition.y - lastPositionRef.current.y, 2)
    );

    // If the jump is too large (>0.3 of the floorplan), smooth it
    if (distance > 0.3) {
      console.log(`Large position jump detected: ${distance.toFixed(3)}, smoothing...`);
      
      // Use weighted average with previous position
      const smoothedPosition = {
        x: lastPositionRef.current.x * 0.7 + newPosition.x * 0.3,
        y: lastPositionRef.current.y * 0.7 + newPosition.y * 0.3,
      };
      
      lastPositionRef.current = smoothedPosition;
      return smoothedPosition;
    }

    // If position history shows consistency, use the new position
    if (positionHistoryRef.current.length >= 2) {
      const avgX = positionHistoryRef.current.reduce((sum, p) => sum + p.x, 0) / positionHistoryRef.current.length;
      const avgY = positionHistoryRef.current.reduce((sum, p) => sum + p.y, 0) / positionHistoryRef.current.length;
      
      lastPositionRef.current = { x: avgX, y: avgY };
      return lastPositionRef.current;
    }

    lastPositionRef.current = newPosition;
    return newPosition;
  };

  useEffect(() => {
    // Early return if any required parameter is missing
    if (!locationId || !buildingId || !floorId) {
      setPosition(null);
      setError(null);
      setLoading(false);
      return;
    }

    let isMounted = true;
    let interval: NodeJS.Timeout;

    const fetchPosition = async () => {
      try {
        const scanned = await scanForWiFiNetworks();

        const snapshot = await firestore()
          .collection(`locations/${locationId}/wifiFingerprints`)
          .where('buildingId', '==', buildingId)
          .where('floorId', '==', floorId)
          .get();

        const fingerprints = snapshot.docs.map((doc) => doc.data());

        const estimated = await estimateIndoorPosition(scanned, fingerprints);

        if (isMounted && estimated) {
          const smoothedPosition = smoothPosition(estimated);
          setPosition(smoothedPosition);
          setError(null);
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message ?? 'Failed to estimate position');
          setLoading(false);
        }
      }
    };

    fetchPosition(); // first scan immediately
    interval = setInterval(fetchPosition, pollInterval);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [locationId, buildingId, floorId, pollInterval]);

  return { position, loading, error };
}