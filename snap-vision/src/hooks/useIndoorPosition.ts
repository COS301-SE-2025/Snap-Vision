// src/hooks/useIndoorPosition.ts

import { useEffect, useState } from 'react';
import firestore from '@react-native-firebase/firestore';
import { scanForWiFiNetworks } from '../services/scanService';
import { estimateIndoorPosition } from '../utils/indoor/estimateIndoorPosition';

interface Position {
  x: number;
  y: number;
}

export function useIndoorPosition(
  locationId: string,
  buildingId: string,
  floorId: string,
  pollInterval = 5000
) {
  const [position, setPosition] = useState<Position | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

        if (isMounted) {
          setPosition(estimated);
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
  }, [locationId, buildingId, floorId]);

  return { position, loading, error };
}
