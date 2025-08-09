export interface WiFiSignal {
  BSSID: string;
  level: number;
}

export interface WiFiFingerprint {
  coordinates: { x: number; y: number };
  wifiSignals: WiFiSignal[];
}

export function estimateIndoorPosition(
  liveSignals: WiFiSignal[],
  fingerprints: WiFiFingerprint[],
  k = 3
): { x: number; y: number } | null {
  if (!liveSignals.length || !fingerprints.length) return null;

  // Helper: calculate signal distance between 2 signal sets
  const calculateDistance = (a: WiFiSignal[], b: WiFiSignal[]) => {
    const bMap = Object.fromEntries(b.map(s => [s.BSSID, s.level]));
    const differences: number[] = [];

    for (const signal of a) {
      if (bMap[signal.BSSID] !== undefined) {
        differences.push(Math.pow(signal.level - bMap[signal.BSSID], 2));
      }
    }

    return differences.length ? Math.sqrt(differences.reduce((a, b) => a + b, 0)) : Infinity;
  };

  // Rank fingerprints by similarity
  const ranked = fingerprints
    .map(fp => ({
      fingerprint: fp,
      distance: calculateDistance(liveSignals, fp.wifiSignals),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, k);

  const valid = ranked.filter(r => r.distance !== Infinity);
  if (!valid.length) return null;

  console.log('🎯 Using fingerprints for position estimation:');
  valid.forEach((r, i) => {
    const fp = r.fingerprint;
    const desc = fp.description || 'WiFi Point';
    console.log(`  ${i + 1}. ${desc} at (${fp.coordinates.x.toFixed(3)}, ${fp.coordinates.y.toFixed(3)}) - Distance: ${r.distance.toFixed(2)}`);
  });

  // Average coordinates of top k
  const avgX = valid.reduce((sum, r) => sum + r.fingerprint.coordinates.x, 0) / valid.length;
  const avgY = valid.reduce((sum, r) => sum + r.fingerprint.coordinates.y, 0) / valid.length;

  console.log(`📍 Averaged position: (${avgX.toFixed(3)}, ${avgY.toFixed(3)})`);

  return { x: avgX, y: avgY };
}
