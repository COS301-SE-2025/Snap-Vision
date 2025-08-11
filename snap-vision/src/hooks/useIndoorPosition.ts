import { useEffect, useState, useRef } from 'react';
import firestore from '@react-native-firebase/firestore';
import { scanForWiFiNetworks } from '../services/scanService';
import { estimateIndoorPosition } from '../utils/indoor/estimateIndoorPosition';

type Position = {
  x: number;
  y: number;
  confidence?: number;
};

export function useIndoorPosition(
  locationId?: string | null,
  buildingId?: string | null,
  floorId?: string | null,
  pollInterval = 10000 // Increased to 10 seconds for more stability
) {
  const [position, setPosition] = useState<Position | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Add position history for smoothing
  const positionHistory = useRef<Position[]>([]);
  const maxHistoryLength = 5; // Keep last 5 positions

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

        if (scanned.length === 0) {
          if (isMounted) {
            setError('No WiFi networks detected');
            setLoading(false);
          }
          return;
        }

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

        const estimated = estimateIndoorPosition(scanned, fingerprints);
        
        if (estimated && isMounted) {
          // SMOOTHING: Only update if confidence is reasonable
          const minConfidence = 0.1; // 10% minimum confidence
          
          if (estimated.confidence && estimated.confidence >= minConfidence) {
            // NO COORDINATE SCALING - use raw coordinates directly
            const rawPosition = {
              x: estimated.x,
              y: estimated.y,
              confidence: estimated.confidence
            };
            
            // Add to position history
            positionHistory.current.push(rawPosition);
            if (positionHistory.current.length > maxHistoryLength) {
              positionHistory.current.shift(); // Remove oldest
            }
            
            // Calculate smoothed position from history
            let smoothedPosition = rawPosition;
            
            if (positionHistory.current.length >= 3) {
              // Use weighted average of recent positions
              const weights = positionHistory.current.map((_, i) => i + 1); // More recent = higher weight
              const totalWeight = weights.reduce((sum, w) => sum + w, 0);
              
              const smoothedX = positionHistory.current.reduce((sum, pos, i) => 
                sum + (pos.x * weights[i]), 0) / totalWeight;
              const smoothedY = positionHistory.current.reduce((sum, pos, i) => 
                sum + (pos.y * weights[i]), 0) / totalWeight;
              
              smoothedPosition = { 
                x: smoothedX, 
                y: smoothedY, 
                confidence: estimated.confidence 
              };
              
              console.log(`📍 Smoothed position: (${smoothedX.toFixed(3)}, ${smoothedY.toFixed(3)}) from ${positionHistory.current.length} samples`);
            }
            
            console.log('Final position (no scaling):', smoothedPosition);
            setPosition(smoothedPosition);
            setError(null);
          } else {
            console.log(`⚠️ Low confidence position (${(estimated.confidence! * 100).toFixed(1)}%) - not updating`);
          }
          
          setLoading(false);
        } else if (isMounted) {
          setError('Could not estimate position from WiFi signals');
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Error in fetchPosition:', err);
        if (isMounted) {
          setError(`Error: ${err.message}`);
          setLoading(false);
        }
      }
    };

    // Initial fetch
    fetchPosition();

    // Set up polling
    interval = setInterval(fetchPosition, pollInterval);

    return () => {
      isMounted = false;
      if (interval) clearInterval(interval);
    };
  }, [locationId, buildingId, floorId, pollInterval]);

  return { position, loading, error };
}