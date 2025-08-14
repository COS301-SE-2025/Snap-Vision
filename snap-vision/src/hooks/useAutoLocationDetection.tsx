import { useEffect, useState } from 'react';
import firestore from '@react-native-firebase/firestore';
import { scanForWiFiNetworks } from '../services/scanService';

interface DetectedLocation {
  locationId: string;
  buildingId: string;
  floorId: string;
  buildingName: string;
  confidence: number;
}

export function useAutoLocationDetection() {
  const [detectedLocation, setDetectedLocation] = useState<DetectedLocation | null>(null);
  const [isDetecting, setIsDetecting] = useState(true);
  const [detectionError, setDetectionError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const detectLocation = async () => {
      try {
        setIsDetecting(true);
        setDetectionError(null);

        console.log('Starting WiFi scan for location detection...');
        
        // Scan current WiFi
        const currentSignals = await scanForWiFiNetworks();
        console.log('Current WiFi signals:', currentSignals.length);
        
        if (currentSignals.length === 0) {
          throw new Error('No WiFi networks detected. Please enable WiFi.');
        }

        // Get all locations
        const locationsSnapshot = await firestore().collection('locations').get();
        console.log('Found locations:', locationsSnapshot.docs.map(doc => doc.id));
        
        let bestMatch: DetectedLocation | null = null;
        let highestConfidence = 0;

        // Check each location
        for (const locationDoc of locationsSnapshot.docs) {
          const locationId = locationDoc.id;
          console.log(`Checking location: ${locationId}`);
          
          try {
            // Get all WiFi fingerprints for this location
            const fingerprintsSnapshot = await firestore()
              .collection(`locations/${locationId}/wifiFingerprints`)
              .get();

            console.log(`Found ${fingerprintsSnapshot.docs.length} fingerprints in ${locationId}`);

            // Compare with each fingerprint
            for (const fpDoc of fingerprintsSnapshot.docs) {
              const fpData = fpDoc.data();
              
              if (!fpData.wifiSignals || !Array.isArray(fpData.wifiSignals)) {
                console.warn(`Invalid fingerprint data in ${fpDoc.id}`);
                continue;
              }

              const confidence = calculateSignalSimilarity(currentSignals, fpData.wifiSignals);
              console.log(`Fingerprint ${fpDoc.id} confidence: ${(confidence * 100).toFixed(1)}%`);
              
              if (confidence > highestConfidence && confidence > 0.3) { // 30% threshold
                highestConfidence = confidence;
                bestMatch = {
                  locationId,
                  buildingId: fpData.buildingId || 'unknown',
                  floorId: fpData.floorId || 'unknown',
                  buildingName: fpData.buildingName || fpData.buildingId || 'Unknown Building',
                  confidence,
                };
                console.log(`New best match: ${bestMatch.buildingName} (${(confidence * 100).toFixed(1)}%)`);
              }
            }
          } catch (locationError) {
            console.error(`Error checking location ${locationId}:`, locationError);
          }
        }

        if (isMounted) {
          if (bestMatch) {
            setDetectedLocation(bestMatch);
            console.log(`✅ Location detected: ${bestMatch.buildingName} (${(bestMatch.confidence * 100).toFixed(1)}% confidence)`);
          } else {
            setDetectionError('No matching location found. You may be in an unmapped area.');
            console.log('❌ No location match found');
          }
          setIsDetecting(false);
        }
      } catch (error: any) {
        console.error('Location detection error:', error);
        if (isMounted) {
          setDetectionError(error.message || 'Failed to detect location');
          setIsDetecting(false);
        }
      }
    };

    detectLocation();

    return () => {
      isMounted = false;
    };
  }, []);

  return { detectedLocation, isDetecting, detectionError };
}

// Helper function to calculate similarity between signal sets
function calculateSignalSimilarity(currentSignals: any[], fingerprintSignals: any[]): number {
  if (!currentSignals.length || !fingerprintSignals.length) return 0;

  // Create a map of fingerprint signals for faster lookup
  const fpMap = new Map();
  fingerprintSignals.forEach(signal => {
    if (signal.BSSID) {
      fpMap.set(signal.BSSID, signal.level);
    }
  });

  let totalSimilarity = 0;
  let matchedSignals = 0;

  // Compare current signals with fingerprint
  for (const signal of currentSignals) {
    if (!signal.BSSID) continue;
    
    if (fpMap.has(signal.BSSID)) {
      // Calculate signal strength similarity (closer levels = higher score)
      const fpLevel = fpMap.get(signal.BSSID);
      const levelDiff = Math.abs(signal.level - fpLevel);
      const similarity = Math.max(0, 1 - levelDiff / 100); // Normalize to 0-1
      totalSimilarity += similarity;
      matchedSignals++;
    }
  }

  // Return average similarity for matched signals
  return matchedSignals > 0 ? totalSimilarity / matchedSignals : 0;
}