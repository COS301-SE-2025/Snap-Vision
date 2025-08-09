import { useEffect, useState } from 'react';
import firestore from '@react-native-firebase/firestore';
import { scanForWiFiNetworks } from '../services/scanService';
import { estimateIndoorPosition } from '../utils/indoor/estimateIndoorPosition';

type Position = {
  x: number;
  y: number;
};

export function useIndoorPosition(
  locationId?: string | null,
  buildingId?: string | null,
  floorId?: string | null,
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
        // Validate required parameters
        if (!locationId || !buildingId || !floorId) {
          if (isMounted) {
            setError('Missing location parameters');
            setLoading(false);
          }
          return;
        }

        console.log(`Fetching position for: ${locationId}/${buildingId}/${floorId}`);
        
        const scanned = await scanForWiFiNetworks();
        console.log(`Scanned ${scanned.length} WiFi networks`);

        // Query with proper validation
        const snapshot = await firestore()
          .collection(`locations/${locationId}/wifiFingerprints`)
          .where('buildingId', '==', buildingId)
          .where('floorId', '==', floorId)
          .get();

        console.log(`Found ${snapshot.docs.length} WiFi fingerprints`);

        if (snapshot.empty) {
          if (isMounted) {
            setError('No WiFi fingerprints found for this location');
            setLoading(false);
          }
          return;
        }

        const fingerprints = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        const estimated = await estimateIndoorPosition(scanned, fingerprints);
        console.log('Estimated position:', estimated);

        if (isMounted) {
          setPosition(estimated);
          setError(null);
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Error in fetchPosition:', err);
        if (isMounted) {
          setError(err.message || 'Failed to get indoor position');
          setLoading(false);
        }
      }
    };

    // Only start positioning if we have valid parameters
    if (locationId && buildingId && floorId) {
      fetchPosition();
      interval = setInterval(fetchPosition, pollInterval);
    } else {
      setLoading(false);
      setError('Waiting for location detection...');
    }

    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, [locationId, buildingId, floorId, pollInterval]);

  return { position, loading, error };
}