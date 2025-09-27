import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const BT = '[BT]';

export type IBeaconReading = {
  uuid: string; // real iBeacon uuid OR "minew-fef3"/"minew-c5e2"
  major: number;
  minor: number;
  rssi: number;
  ts: number;
  measuredPower?: number;
};

type BeaconMeta = {
  uuid: string; // expected iBeacon UUID
  major: number;
  minor: number;
  x?: number; // normalized 0..1
  y?: number; // normalized 0..1
  txPowerAt1m?: number; // -59 default
  label?: string;
};

type Options = {
  locationId: string;
  buildingId: string;
  floorId?: string;
  scanner: any;
  pathLossN?: number;
  smoothing?: number;
  beaconsMeta?: BeaconMeta[];
  rangeScale?: number;
};

type Pos = { x: number; y: number };

const DEFAULT_TX = -59;
const RELAXED_UUIDS = new Set(['minew-fef3', 'minew-c5e2']); // Minew service-data aliases when not picked up as iBeacon

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function median(values: number[]): number {
  if (!values.length) return 0;
  const a = [...values].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

function rssiToDistanceMeters(rssi: number, txAt1m: number, n: number): number {
  // Log-distance path-loss: d = 10 ^ ((Tx - RSSI) / (10 * n))
  const d = Math.pow(10, (txAt1m - rssi) / (10 * (n || 2.2)));
  return Math.max(0.1, Math.min(d, 50)); // clamp
}

//Trilateration
function trilaterateWeighted(points: Array<{ x: number; y: number; d: number }>): Pos | null {
  if (points.length < 3) return null;
  const p0 = points[0];
  const A: number[][] = [];
  const b: number[] = [];
  const w: number[] = [];

  for (let i = 1; i < points.length; i++) {
    const pi = points[i];
    A.push([2 * (pi.x - p0.x), 2 * (pi.y - p0.y)]);
    b.push(pi.x ** 2 - p0.x ** 2 + (pi.y ** 2 - p0.y ** 2) + (p0.d ** 2 - pi.d ** 2));
    w.push(1 / Math.max(1e-6, pi.d * pi.d)); // 1/d^2
  }

  const AT = transpose(A);
  const W = diag(w);
  const ATW = matMul(AT, W);
  const ATA = matMul(ATW, A);
  const ATb = matVecMul(ATW, b);
  const x = solve2x2(ATA, ATb);
  if (!x) return null;

  return { x: x[0] + p0.x, y: x[1] + p0.y };
}

function barycentricClampToTriangle(p: Pos, a: Pos, b: Pos, c: Pos): Pos {
  const v0 = { x: b.x - a.x, y: b.y - a.y };
  const v1 = { x: c.x - a.x, y: c.y - a.y };
  const v2 = { x: p.x - a.x, y: p.y - a.y };

  const d00 = v0.x * v0.x + v0.y * v0.y;
  const d01 = v0.x * v1.x + v0.y * v1.y;
  const d11 = v1.x * v1.x + v1.y * v1.y;
  const d20 = v2.x * v0.x + v2.y * v0.y;
  const d21 = v2.x * v1.x + v2.y * v1.y;

  const denom = d00 * d11 - d01 * d01;
  if (Math.abs(denom) < 1e-9) return clampToBox(p);

  let v = (d11 * d20 - d01 * d21) / denom;
  let w = (d00 * d21 - d01 * d20) / denom;
  let u = 1 - v - w;

  // If inside triangle, done
  if (u >= 0 && v >= 0 && w >= 0) return p;

  // Otherwise project to nearest edge / vertex (clamp barycentrics)
  u = Math.max(0, Math.min(1, u));
  v = Math.max(0, Math.min(1, v));
  w = Math.max(0, Math.min(1, w));
  const sum = u + v + w || 1;
  u /= sum;
  v /= sum;
  w /= sum;

  return {
    x: u * a.x + v * b.x + w * c.x,
    y: u * a.y + v * b.y + w * c.y,
  };
}

function clampToBox(p: Pos): Pos {
  return { x: clamp01(p.x), y: clamp01(p.y) };
}

function convexHull(points: Pos[]): Pos[] {
  const pts = [...points].sort((p, q) => p.x - q.x || p.y - q.y);
  if (pts.length <= 1) return pts;
  const cross = (o: Pos, a: Pos, b: Pos) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Pos[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0)
      lower.pop();
    lower.push(p);
  }
  const upper: Pos[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0)
      upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

function pointInPolygon(p: Pos, poly: Pos[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x,
      yi = poly[i].y;
    const xj = poly[j].x,
      yj = poly[j].y;
    const intersect =
      yi > p.y !== yj > p.y && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi || 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function projectToSegment(p: Pos, a: Pos, b: Pos): Pos {
  const ab = { x: b.x - a.x, y: b.y - a.y };
  const ap = { x: p.x - a.x, y: p.y - a.y };
  const ab2 = ab.x * ab.x + ab.y * ab.y || 1e-9;
  let t = (ap.x * ab.x + ap.y * ab.y) / ab2;
  t = Math.max(0, Math.min(1, t));
  return { x: a.x + t * ab.x, y: a.y + t * ab.y };
}

function clampToPolygon(p: Pos, poly: Pos[]): Pos {
  if (poly.length < 3) return clampToBox(p);
  if (pointInPolygon(p, poly)) return p;
  let best: Pos | null = null;
  let bestD = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i],
      b = poly[(i + 1) % poly.length];
    const q = projectToSegment(p, a, b);
    const d = Math.hypot(q.x - p.x, q.y - p.y);
    if (d < bestD) {
      bestD = d;
      best = q;
    }
  }
  return best ?? clampToBox(p);
}

//Matrix stuff
function transpose(M: number[][]): number[][] {
  const r = M.length,
    c = M[0]?.length || 0;
  const T = Array.from({ length: c }, () => Array(r).fill(0));
  for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) T[j][i] = M[i][j];
  return T;
}
function diag(v: number[]): number[][] {
  const n = v.length;
  const D = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) D[i][i] = v[i];
  return D;
}
function matMul(A: number[][], B: number[][]): number[][] {
  const r = A.length,
    k = A[0]?.length || 0,
    c = B[0]?.length || 0;
  const out = Array.from({ length: r }, () => Array(c).fill(0));
  for (let i = 0; i < r; i++)
    for (let j = 0; j < c; j++) {
      let s = 0;
      for (let t = 0; t < k; t++) s += A[i][t] * B[t][j];
      out[i][j] = s;
    }
  return out;
}
function matVecMul(A: number[][], v: number[]): number[] {
  const r = A.length,
    c = A[0]?.length || 0;
  const out = Array(r).fill(0);
  for (let i = 0; i < r; i++) {
    let s = 0;
    for (let j = 0; j < c; j++) s += A[i][j] * v[j];
    out[i] = s;
  }
  return out;
}
function solve2x2(A: number[][], b: number[]): number[] | null {
  if (A.length !== 2 || A[0].length !== 2 || b.length !== 2) return null;
  const [a, b1] = A[0],
    [c, d] = A[1];
  const [e, f] = b;
  const det = a * d - b1 * c;
  if (Math.abs(det) < 1e-9) return null;
  return [(e * d - b1 * f) / det, (a * f - e * c) / det];
}

//Hook
export function useBluetoothPositioning(opts: Options) {
  const {
    pathLossN = 2.4,
    smoothing = 0.3,
    beaconsMeta = [],
    rangeScale, // metres -> floorplan units
  } = opts;

  const [beacons, setBeacons] = useState<IBeaconReading[]>([]);
  const [currentPos, setCurrentPos] = useState<Pos | null>(null);
  const [visible, setVisible] = useState<boolean>(false);

  // rolling window per beacon key
  const bucketsRef = useRef<Map<string, IBeaconReading[]>>(new Map());
  const lastPosRef = useRef<Pos | null>(null);
  const lastComputeTsRef = useRef<number>(0);

  // Lookups
  const metaByExact = useMemo(() => {
    const m = new Map<string, BeaconMeta>();
    for (const b of beaconsMeta) {
      m.set(`${String(b.uuid || '').toLowerCase()}|${b.major}|${b.minor}`, b);
    }
    return m;
  }, [beaconsMeta]);

  const metaByMm = useMemo(() => {
    const m = new Map<string, BeaconMeta>();
    for (const b of beaconsMeta) {
      m.set(`${b.major}|${b.minor}`, b);
    }
    return m;
  }, [beaconsMeta]);

  // Mean pairwise beacon spacing in floorplan units (for auto scaling)
  const anchorPoints = useMemo(
    () =>
      beaconsMeta
        .filter((b) => typeof b.x === 'number' && typeof b.y === 'number')
        .map((b) => ({ x: b.x as number, y: b.y as number })),
    [beaconsMeta],
  );

  const meanAnchorSpacing = useMemo(() => {
    const pts = anchorPoints;
    if (pts.length < 2) return 0.2;
    let sum = 0,
      cnt = 0;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        sum += Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
        cnt++;
      }
    }
    const mean = cnt ? sum / cnt : 0.2;
    return Math.max(0.05, Math.min(mean, 0.8));
  }, [anchorPoints]);

  // CALIBRATION: Validate beacon coordinate setup  
  useEffect(() => {
    if (anchorPoints.length >= 3) {
      //console.log(BT, 'BEACON SETUP VALIDATION:');
      
      // Check for coordinate stability
      const coordinateHistory = new Map<string, {x: number, y: number}>();
      
      anchorPoints.forEach((pt, i) => {
        const beaconInfo = beaconsMeta.find(b => b.x === pt.x && b.y === pt.y);
        const label = beaconInfo?.label || `Beacon ${i+1}`;
        const mm = beaconInfo ? `${beaconInfo.major}|${beaconInfo.minor}` : 'unknown';
        //console.log(BT, `  ${label} (${mm}): coordinates (${pt.x.toFixed(3)}, ${pt.y.toFixed(3)})`);
        
        // Store coordinate for stability check
        if (beaconInfo) {
          const key = `${beaconInfo.major}|${beaconInfo.minor}`;
          const stored = coordinateHistory.get(key);
          if (stored && (Math.abs(stored.x - pt.x) > 0.1 || Math.abs(stored.y - pt.y) > 0.1)) {
            //console.log(BT, `  🚨 COORDINATE INSTABILITY DETECTED for ${mm}!`);
            //console.log(BT, `     Previous: (${stored.x.toFixed(3)}, ${stored.y.toFixed(3)})`);
            //console.log(BT, `     Current:  (${pt.x.toFixed(3)}, ${pt.y.toFixed(3)})`);
            //console.log(BT, `     This will cause positioning errors - fix database coordinates!`);
          }
          coordinateHistory.set(key, {x: pt.x, y: pt.y});
        }
      });
      
      // Check beacon spacing
      const spacing = meanAnchorSpacing;
      //console.log(BT, `  Mean beacon spacing: ${spacing.toFixed(3)} units`);
      if (spacing < 0.3) //console.log(BT, '  ⚠️ Beacons may be too close together for accurate positioning');
      if (spacing > 0.7) //console.log(BT, '  ⚠️ Beacons may be too far apart, consider adding more beacons');
      
      // Check if beacons form a good triangle
      if (anchorPoints.length === 3) {
        const [a, b, c] = anchorPoints;
        const area = Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)) / 2;
        //console.log(BT, `  Triangle area: ${area.toFixed(4)} (>0.1 is good for positioning)`);
        if (area < 0.1) //console.log(BT, '  ⚠️ Beacons are too close to a straight line - move one beacon');
      }
    }
  }, [anchorPoints, beaconsMeta, meanAnchorSpacing]);

  const kExact = (u: string, M: number, m: number) => `${String(u || '').toLowerCase()}|${M}|${m}`;

  // Accept batches from scanner
  const computePositions = useCallback(() => {}, []);

  const handleBatch = useCallback(
    (batch: IBeaconReading[] = []) => {
      if (!Array.isArray(batch) || !batch.length) return;

      const accepted: IBeaconReading[] = [];
      for (const r of batch) {
        const key = kExact(r.uuid, r.major, r.minor);
        const exact = metaByExact.get(key);
        if (exact) {
          accepted.push(r);
          continue;
        }
        if (RELAXED_UUIDS.has(String(r.uuid || '').toLowerCase())) {
          const mm = metaByMm.get(`${r.major}|${r.minor}`);
          if (mm) accepted.push({ ...r, uuid: mm.uuid });
        }
      }

      if (!accepted.length) return;

      const now = Date.now();
      const windowMs = 3500;
      const buckets = bucketsRef.current;

      for (const r of accepted) {
        const key = kExact(r.uuid, r.major, r.minor);
        const arr = buckets.get(key) ?? [];
        arr.push(r);
        while (arr.length && now - arr[0].ts > windowMs) arr.shift();
        buckets.set(key, arr);
      }

      // Latest snapshot for debug
      const latest: IBeaconReading[] = [];
      buckets.forEach((arr) => {
        if (arr.length) latest.push(arr[arr.length - 1]);
      });
      latest.sort((a, b) => b.rssi - a.rssi);
      setBeacons(latest.slice(0, 8));

      _computePosition();
    },
    [metaByExact, metaByMm],
  );

  //meterss to units
  const deriveRangeScale = useCallback(
    (rawMeters: number[]) => {
      if (typeof rangeScale === 'number' && Number.isFinite(rangeScale)) return rangeScale;

      const med = median(rawMeters.filter(Number.isFinite));
      if (!med || !Number.isFinite(med)) return 0.15; // More realistic fallback
      
      // More stable scaling - aim for reasonable map coordinate scale
      // Based on typical indoor environments where 2-5m = 0.2-0.5 map units
      const targetUnits = Math.max(0.05, Math.min(meanAnchorSpacing * 0.6, 0.4));
      const k = targetUnits / med;
      const kClamped = Math.max(0.05, Math.min(k, 0.6)); // More conservative range
      //console.log(
        BT,
        `Auto rangeScale: meters->units ≈ ${kClamped.toFixed(3)} (median d=${med.toFixed(2)}m, target=${targetUnits.toFixed(3)}u)`,
      );
      return kClamped;
    },
    [rangeScale, meanAnchorSpacing],
  );

  //Snap to nearest beacon
  function snapNearAnchor(pos: Pos, anchors: Array<{ x: number; y: number; d: number }>) {
    const nearest = anchors.reduce((a, b) => (a.d < b.d ? a : b));
    if (nearest.d <= 0.35) {
      const w = 0.7;
      return {
        x: w * nearest.x + (1 - w) * pos.x,
        y: w * nearest.y + (1 - w) * pos.y,
      };
    }
    return pos;
  }

  //Calcs
  const _computePosition = useCallback(() => {
    const buckets = bucketsRef.current;
    const n = pathLossN;

    type Anchor = { x: number; y: number; d: number; tag: string; rssiMed: number; tx: number };
    const raw: Anchor[] = [];

    // Build raw anchors with distances in METRES (from RSSI)
    buckets.forEach((arr, k) => {
      if (!arr.length) return;
      const meta = metaByExact.get(k);
      if (!meta || typeof meta.x !== 'number' || typeof meta.y !== 'number') return;

      const rssiMed = median(arr.map((a) => a.rssi));
      const last = arr[arr.length - 1];
      const originalTx = typeof meta.txPowerAt1m === 'number'
        ? meta.txPowerAt1m
        : typeof last.measuredPower === 'number'
          ? last.measuredPower!
          : DEFAULT_TX;

      // Apply beacon-specific RSSI calibration corrections
      let correctedTx = originalTx;
      
      // FINE-TUNED CALIBRATION: Based on actual vs calculated distance ratios
      // Target: Minor=1 reduce by 30%, Minor=2 reduce by 81%, Minor=3 reduce by 24%
      if (meta.major === 1 && meta.minor === 1) {
        // Minor=1 (stairs): Need to reduce from 0.97m to ~0.69m equivalent
        // Make TX power less negative to reduce calculated distance
        correctedTx = Math.max(-85, Math.min(-65, originalTx + 5));
      } else if (meta.major === 1 && meta.minor === 2) {
        // Minor=2 (middle): Need to MASSIVELY reduce from 2.41m to ~0.46m equivalent  
        // Make TX power much less negative to dramatically reduce distance
        correctedTx = Math.max(-90, Math.min(-70, originalTx + 20));
      } else if (meta.major === 1 && meta.minor === 3) {
        // Minor=3 (wall): Need to reduce from 0.32m to ~0.24m equivalent
        // Make TX power slightly less negative to reduce distance  
        correctedTx = Math.max(-95, Math.min(-75, originalTx + 8));
      }

      // Use higher path loss exponent for indoor environment with obstacles
      const indoorPathLoss = 3.0; // Keep at 3.0 for good distance spread
      const dMeters = rssiToDistanceMeters(rssiMed, correctedTx, indoorPathLoss);
      //console.log(BT, `RSSI Calibration ${k}: originalTx=${originalTx} → correctedTx=${correctedTx} | RSSI=${rssiMed} → distance=${dMeters.toFixed(2)}m`);
      
      raw.push({ x: meta.x!, y: meta.y!, d: dMeters, tag: k, rssiMed, tx: correctedTx });
    });

    if (raw.length < 2) {
      //console.log(BT, `Need at least 2 beacons for positioning, got ${raw.length}`);
      setVisible(false);
      return;
    }
    
    if (raw.length === 2) {
      //console.log(BT, '⚠️ Using 2-beacon positioning (less accurate than 3-beacon trilateration)');
      // For 2 beacons, estimate position between them based on relative distances
      const [a, b] = raw;
      const totalDist = a.d + b.d;
      const ratio = totalDist > 0 ? a.d / totalDist : 0.5;
      
      // Position on line between beacons, weighted by distance
      const pos = {
        x: Math.max(0, Math.min(1, a.x + ratio * (b.x - a.x))),
        y: Math.max(0, Math.min(1, a.y + ratio * (b.y - a.y)))
      };
      
      // Heavy smoothing for 2-beacon mode since it's less stable
      const smoothed = lastPosRef.current 
        ? { x: 0.2 * pos.x + 0.8 * lastPosRef.current.x, y: 0.2 * pos.y + 0.8 * lastPosRef.current.y }
        : pos;
        
      lastPosRef.current = smoothed;
      lastComputeTsRef.current = Date.now();
      setCurrentPos(smoothed);
      setVisible(true);
      //console.log(BT, '2-Beacon Position ->', { x: +smoothed.x.toFixed(3), y: +smoothed.y.toFixed(3) });
      //console.log(BT, `⚠️ Missing beacon Minor=2 - check if it's powered on and broadcasting`);
      return;
    }

    // Log (meters)
    const snapshotMeters = raw
      .map(
        (p) =>
          `${p.tag.split('|').slice(1).join('/')} rssi=${p.rssiMed.toFixed(0)} tx=${p.tx} d(m)=${p.d.toFixed(2)}`,
      )
      .join(' | ');
    //console.log(BT, `Solve with ${raw.length} anchors (metres): ${snapshotMeters}`);
    
    // CALIBRATION DEBUG: Show beacon positions and calculated distances
    //console.log(BT, 'CALIBRATION DEBUG - Beacon positions and distances:');
    raw.forEach(r => {
      //console.log(BT, `  ${r.tag}: DB coords (${r.x.toFixed(3)}, ${r.y.toFixed(3)}) | RSSI=${r.rssiMed} | Calc distance=${r.d.toFixed(2)}m`);
    });
    
    if (raw.length >= 3) {
      const distances = raw.map(r => r.d).sort((a, b) => a - b);
      //console.log(BT, `Distance distribution: min=${distances[0].toFixed(2)}m, median=${distances[Math.floor(distances.length/2)].toFixed(2)}m, max=${distances[distances.length-1].toFixed(2)}m`);
    }

    //Initial scale guess
    const k0 = deriveRangeScale(raw.map((p) => p.d));
    const pts0 = raw.map((p) => ({ x: p.x, y: p.y, d: p.d * k0 }));
    let pos0 = trilaterateWeighted(pts0);
    if (!pos0) {
      //console.log(BT, 'Trilateration failed (initial)');
      setVisible(false);
      return;
    }

    //Fit best
    let num = 0,
      den = 0;
    for (const p of raw) {
      const distNorm = Math.hypot(pos0.x - p.x, pos0.y - p.y); // 0..1 units
      num += p.d * distNorm;
      den += p.d * p.d;
    }
    let kStar = den > 1e-9 ? num / den : k0;
    if (!Number.isFinite(kStar) || kStar <= 0) kStar = k0;

    //Re-solve with k*
    const pts1 = raw.map((p) => ({ x: p.x, y: p.y, d: p.d * kStar }));
    let pos1 = trilaterateWeighted(pts1) ?? pos0;

    //Snap to nearest beacon if close
    pos1 = snapNearAnchor(pos1, pts1);

    //Clamp
    let clamped: Pos = pos1;
    if (anchorPoints.length === 3) {
      const [a, b, c] = anchorPoints;
      clamped = barycentricClampToTriangle(pos1, a, b, c);
    } else if (anchorPoints.length > 3) {
      const hull = convexHull(anchorPoints);
      clamped = clampToPolygon(pos1, hull);
    }
    clamped = { x: clamp01(clamped.x), y: clamp01(clamped.y) };

    //Smooth + set
    const alpha = Math.max(0, Math.min(1, smoothing));
    const last = lastPosRef.current;
    const smoothed = last
      ? { x: alpha * clamped.x + (1 - alpha) * last.x, y: alpha * clamped.y + (1 - alpha) * last.y }
      : clamped;

    lastPosRef.current = smoothed;
    lastComputeTsRef.current = Date.now();
    setCurrentPos(smoothed);
    setVisible(true);

    //console.log(BT, 'Scale fit:', { k0: +k0.toFixed(4), kStar: +kStar.toFixed(4) });
    //console.log(BT, 'Position ->', { x: +smoothed.x.toFixed(3), y: +smoothed.y.toFixed(3) });
    
    // CALIBRATION DEBUG: Show position relative to each beacon
    //console.log(BT, 'CALIBRATION - Position relative to beacons:');
    raw.forEach(r => {
      const dx = smoothed.x - r.x;
      const dy = smoothed.y - r.y;
      const calculatedDist = Math.sqrt(dx*dx + dy*dy) * meanAnchorSpacing;
      const expectedDist = r.d;
      const error = Math.abs(calculatedDist - expectedDist);
      //console.log(BT, `  To ${r.tag}: calculated=${calculatedDist.toFixed(2)}m | expected=${expectedDist.toFixed(2)}m | error=${error.toFixed(2)}m`);
    });
  }, [metaByExact, pathLossN, smoothing, deriveRangeScale, anchorPoints]);

  const computePosition = _computePosition;

  useEffect(() => {
    const t = setInterval(() => {
      // Increased timeout from 4000ms to 8000ms for less aggressive hiding
      if (visible && Date.now() - lastComputeTsRef.current > 8000) setVisible(false);
    }, 1000);
    return () => clearInterval(t);
  }, [visible]);

  return {
    currentPos,
    visible,
    beacons,
    handleBatch,
  };
}
