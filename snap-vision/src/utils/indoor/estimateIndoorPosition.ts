export interface WiFiSignal {
  BSSID: string;
  level: number;
}

export interface WiFiFingerprint {
  coordinates: { x: number; y: number };
  wifiSignals: WiFiSignal[];
  description?: string;
}

export function estimateIndoorPosition(
  liveSignals: WiFiSignal[],
  fingerprints: WiFiFingerprint[],
  k = 3
): { x: number; y: number; confidence: number } | null {
  if (!liveSignals.length || !fingerprints.length) return null;

  // Helper: calculate signal distance between 2 signal sets
  const calculateDistance = (a: WiFiSignal[], b: WiFiSignal[]) => {
    const bMap = Object.fromEntries(b.map(s => [s.BSSID, s.level]));
    const aMap = Object.fromEntries(a.map(s => [s.BSSID, s.level]));
    
    // Count matching networks
    const commonBSSIDs = a.filter(signal => bMap[signal.BSSID] !== undefined);
    const totalNetworks = new Set([...a.map(s => s.BSSID), ...b.map(s => s.BSSID)]).size;
    
    if (commonBSSIDs.length === 0) return Infinity;
    
    // Calculate weighted distance based on signal strength differences
    let totalDistance = 0;
    let weightSum = 0;
    
    for (const signal of commonBSSIDs) {
      const diff = Math.abs(signal.level - bMap[signal.BSSID]);
      const weight = Math.max(0.1, (100 + Math.min(signal.level, bMap[signal.BSSID])) / 100); // Stronger signals get more weight
      totalDistance += diff * diff * weight;
      weightSum += weight;
    }
    
    const normalizedDistance = Math.sqrt(totalDistance / weightSum);
    
    // Penalize fingerprints with few matching networks
    const networkMatchRatio = commonBSSIDs.length / totalNetworks;
    const penalty = networkMatchRatio < 0.3 ? 2.0 : 1.0; // Penalize if less than 30% networks match
    
    return normalizedDistance * penalty;
  };

  // Rank fingerprints by similarity
  const ranked = fingerprints
    .map(fp => ({
      fingerprint: fp,
      distance: calculateDistance(liveSignals, fp.wifiSignals),
    }))
    .sort((a, b) => a.distance - b.distance);

  // FILTER: Only use fingerprints with reasonable distances
  const maxReasonableDistance = 50; // Adjust based on your environment
  const valid = ranked
    .filter(r => r.distance !== Infinity && r.distance < maxReasonableDistance)
    .slice(0, k);

  if (!valid.length) {
    console.log('❌ No valid fingerprints found (all distances too high)');
    return null;
  }

  console.log('🎯 Using fingerprints for position estimation:');
  valid.forEach((r, i) => {
    const fp = r.fingerprint;
    const desc = fp.description || 'WiFi Point';
    console.log(`  ${i + 1}. ${desc} at (${fp.coordinates.x.toFixed(3)}, ${fp.coordinates.y.toFixed(3)}) - Distance: ${r.distance.toFixed(2)}`);
  });

  // SMOOTHING: Use weighted inverse distance for better stability
  const maxDistance = Math.max(...valid.map(r => r.distance));
  const weights = valid.map(r => {
    // Inverse distance weighting with smoothing
    const normalizedDistance = r.distance / maxDistance;
    return Math.pow(1 / (1 + normalizedDistance), 2); // Quadratic weighting favors closer matches
  });
  
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  
  const avgX = valid.reduce((sum, r, i) => sum + (r.fingerprint.coordinates.x * weights[i]), 0) / totalWeight;
  const avgY = valid.reduce((sum, r, i) => sum + (r.fingerprint.coordinates.y * weights[i]), 0) / totalWeight;

  // CONFIDENCE: Based on how close the best matches are
  const bestDistance = valid[0].distance;
  const confidence = Math.max(0, Math.min(1, (maxReasonableDistance - bestDistance) / maxReasonableDistance));

  console.log(`📍 Weighted averaged position: (${avgX.toFixed(3)}, ${avgY.toFixed(3)}) - Confidence: ${(confidence * 100).toFixed(1)}%`);

  return { x: avgX, y: avgY, confidence };
}