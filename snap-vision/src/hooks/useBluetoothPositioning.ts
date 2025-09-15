// hooks/useBluetoothPositioning.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const BT = '[BT]';

export type IBeaconReading = {
  uuid: string;      // real iBeacon uuid OR "minew-fef3"/"minew-c5e2"
  major: number;
  minor: number;
  rssi: number;
  ts: number;
  measuredPower?: number;
};

type BeaconMeta = {
  uuid: string;          // expected iBeacon UUID (e2c56…)
  major: number;
  minor: number;
  x?: number;            // normalized 0..1
  y?: number;            // normalized 0..1
  txPowerAt1m?: number;  // e.g. -59
  label?: string;
};

type Options = {
  locationId: string;
  buildingId: string;
  floorId?: string;
  scanner: any;
  pathLossN?: number;         // 2.0–3.0 indoors
  smoothing?: number;         // 0..1 EMA weight toward NEW pos
  beaconsMeta?: BeaconMeta[]; // anchors w/ coords & tx
  rangeScale?: number;        // OPTIONAL: meters -> floorplan units (e.g. 0.10)
};

type Pos = { x: number; y: number };

const DEFAULT_TX = -59;
const RELAXED_UUIDS = new Set(['minew-fef3', 'minew-c5e2']); // Minew service-data aliases

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
  return Math.max(0.1, Math.min(d, 50)); // clamp for stability
}

/** Weighted trilateration (least squares). */
function trilaterateWeighted(points: Array<{ x: number; y: number; d: number }>): Pos | null {
  if (points.length < 3) return null;
  const p0 = points[0];
  const A: number[][] = [];
  const b: number[] = [];
  const w: number[] = [];

  for (let i = 1; i < points.length; i++) {
    const pi = points[i];
    A.push([2 * (pi.x - p0.x), 2 * (pi.y - p0.y)]);
    b.push((pi.x ** 2 - p0.x ** 2) + (pi.y ** 2 - p0.y ** 2) + (p0.d ** 2 - pi.d ** 2));
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

/** --- Geometry helpers for hull clamping --- */
function barycentricClampToTriangle(p: Pos, a: Pos, b: Pos, c: Pos): Pos {
  // Compute barycentric, clamp to simplex
  const v0 = { x: b.x - a.x, y: b.y - a.y };
  const v1 = { x: c.x - a.x, y: c.y - a.y };
  const v2 = { x: p.x - a.x, y: p.y - a.y };

  const d00 = v0.x * v0.x + v0.y * v0.y;
  const d01 = v0.x * v1.x + v0.y * v1.y;
  const d11 = v1.x * v1.x + v1.y * v1.y;
  const d20 = v2.x * v0.x + v2.y * v0.y;
  const d21 = v2.x * v1.x + v2.y * v1.y;

  const denom = d00 * d11 - d01 * d01;
  if (Math.abs(denom) < 1e-9) return clampToBox(p); // degenerate triangle, box-clamp

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
  u /= sum; v /= sum; w /= sum;

  return {
    x: u * a.x + v * b.x + w * c.x,
    y: u * a.y + v * b.y + w * c.y,
  };
}

function clampToBox(p: Pos): Pos {
  return { x: clamp01(p.x), y: clamp01(p.y) };
}

function convexHull(points: Pos[]): Pos[] {
  // Monotone chain
  const pts = [...points].sort((p, q) => (p.x - q.x) || (p.y - q.y));
  if (pts.length <= 1) return pts;
  const cross = (o: Pos, a: Pos, b: Pos) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Pos[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Pos[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop(); lower.pop();
  return lower.concat(upper);
}

function pointInPolygon(p: Pos, poly: Pos[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const intersect = ((yi > p.y) !== (yj > p.y)) &&
      (p.x < (xj - xi) * (p.y - yi) / ((yj - yi) || 1e-9) + xi);
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
  // project to nearest edge
  let best: Pos | null = null;
  let bestD = Infinity;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const q = projectToSegment(p, a, b);
    const d = Math.hypot(q.x - p.x, q.y - p.y);
    if (d < bestD) { bestD = d; best = q; }
  }
  return best ?? clampToBox(p);
}

// ---------- small matrix helpers ----------
function transpose(M: number[][]): number[][] {
  const r = M.length, c = M[0]?.length || 0;
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
  const r = A.length, k = A[0]?.length || 0, c = B[0]?.length || 0;
  const out = Array.from({ length: r }, () => Array(c).fill(0));
  for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) {
    let s = 0; for (let t = 0; t < k; t++) s += A[i][t] * B[t][j];
    out[i][j] = s;
  }
  return out;
}
function matVecMul(A: number[][], v: number[]): number[] {
  const r = A.length, c = A[0]?.length || 0;
  const out = Array(r).fill(0);
  for (let i = 0; i < r; i++) {
    let s = 0; for (let j = 0; j < c; j++) s += A[i][j] * v[j];
    out[i] = s;
  }
  return out;
}
function solve2x2(A: number[][], b: number[]): number[] | null {
  if (A.length !== 2 || A[0].length !== 2 || b.length !== 2) return null;
  const [a, b1] = A[0], [c, d] = A[1];
  const [e, f] = b;
  const det = a * d - b1 * c;
  if (Math.abs(det) < 1e-9) return null;
  return [(e * d - b1 * f) / det, (a * f - e * c) / det];
}

// ---------- Hook ----------
export function useBluetoothPositioning(opts: Options) {
  const {
    pathLossN = 2.4,
    smoothing = 0.3,
    beaconsMeta = [],
    rangeScale, // meters -> floorplan units (optional override)
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
        .filter(b => typeof b.x === 'number' && typeof b.y === 'number')
        .map(b => ({ x: b.x as number, y: b.y as number })),
    [beaconsMeta]
  );

  const meanAnchorSpacing = useMemo(() => {
    const pts = anchorPoints;
    if (pts.length < 2) return 0.2;
    let sum = 0, cnt = 0;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        sum += Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y);
        cnt++;
      }
    }
    const mean = cnt ? sum / cnt : 0.2;
    return Math.max(0.05, Math.min(mean, 0.8));
  }, [anchorPoints]);

  const kExact = (u: string, M: number, m: number) => `${String(u || '').toLowerCase()}|${M}|${m}`;

  // Accept batches from scanner
  const computePositions = useCallback(() => {}, []); // placeholder to satisfy dependency before real impl

  const handleBatch = useCallback((batch: IBeaconReading[] = []) => {
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
        if (mm) accepted.push({ ...r, uuid: mm.uuid }); // normalize uuid for keying
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
    buckets.forEach((arr) => { if (arr.length) latest.push(arr[arr.length - 1]); });
    latest.sort((a, b) => b.rssi - a.rssi);
    setBeacons(latest.slice(0, 8));

    _computePosition();
  }, [metaByExact, metaByMm]);

  // --- auto scaling helper: derive meters->units if not provided ---
  const deriveRangeScale = useCallback((rawMeters: number[]) => {
    if (typeof rangeScale === 'number' && Number.isFinite(rangeScale)) return rangeScale;

    const med = median(rawMeters.filter(Number.isFinite));
    if (!med || !Number.isFinite(med)) return 0.10; // fallback
    const targetUnits = Math.max(0.03, Math.min(meanAnchorSpacing * 0.5, 0.35));
    const k = targetUnits / med;
    const kClamped = Math.max(0.02, Math.min(k, 0.8));
    console.log(
      BT,
      `Auto rangeScale: meters->units ≈ ${kClamped.toFixed(3)} (median d=${med.toFixed(2)}m, anchor spacing=${meanAnchorSpacing.toFixed(2)}u)`
    );
    return kClamped;
  }, [rangeScale, meanAnchorSpacing]);

  // --- nearest-beacon snap if extremely close ---
  function snapNearAnchor(pos: Pos, anchors: Array<{x:number;y:number;d:number}>) {
    const nearest = anchors.reduce((a,b) => (a.d < b.d ? a : b));
    if (nearest.d <= 0.35) {
      // blend 70% toward nearest if phone is very close (helps when next to beacon)
      const w = 0.7;
      return {
        x: w * nearest.x + (1 - w) * pos.x,
        y: w * nearest.y + (1 - w) * pos.y,
      };
    }
    return pos;
  }

  // --- main compute ---
  const _computePosition = useCallback(() => {
    const buckets = bucketsRef.current;
    const n = pathLossN;

    type Anchor = { x:number; y:number; d:number; tag:string; rssiMed:number; tx:number };
    const raw: Anchor[] = [];

    // Build raw anchors with distances in METERS (from RSSI)
    buckets.forEach((arr, k) => {
      if (!arr.length) return;
      const meta = metaByExact.get(k);
      if (!meta || typeof meta.x !== 'number' || typeof meta.y !== 'number') return;

      const rssiMed = median(arr.map(a => a.rssi));
      const last = arr[arr.length - 1];
      const tx = typeof meta.txPowerAt1m === 'number'
        ? meta.txPowerAt1m
        : (typeof last.measuredPower === 'number' ? last.measuredPower! : DEFAULT_TX);

      const dMeters = rssiToDistanceMeters(rssiMed, tx, n); // meters
      raw.push({ x: meta.x!, y: meta.y!, d: dMeters, tag: k, rssiMed, tx });
    });

    if (raw.length < 3) {
      setVisible(false);
      return;
    }

    // Log (meters)
    const snapshotMeters = raw
      .map(p => `${p.tag.split('|').slice(1).join('/')} rssi=${p.rssiMed.toFixed(0)} tx=${p.tx} d(m)=${p.d.toFixed(2)}`)
      .join(' | ');
    console.log(BT, `Solve with ${raw.length} anchors (meters): ${snapshotMeters}`);

    // 1) Smart initial scale guess
    const k0 = deriveRangeScale(raw.map(p => p.d));
    const pts0 = raw.map(p => ({ x: p.x, y: p.y, d: p.d * k0 }));
    let pos0 = trilaterateWeighted(pts0);
    if (!pos0) {
      console.log(BT, 'Trilateration failed (initial)');
      setVisible(false);
      return;
    }

    // 2) Fit best scale k*
    let num = 0, den = 0;
    for (const p of raw) {
      const distNorm = Math.hypot(pos0.x - p.x, pos0.y - p.y); // 0..1 units
      num += p.d * distNorm;
      den += p.d * p.d;
    }
    let kStar = den > 1e-9 ? (num / den) : k0;
    if (!Number.isFinite(kStar) || kStar <= 0) kStar = k0;

    // 3) Re-solve using k*
    const pts1 = raw.map(p => ({ x: p.x, y: p.y, d: p.d * kStar }));
    let pos1 = trilaterateWeighted(pts1) ?? pos0;

    // 4) Snap toward nearest anchor if extremely close
    pos1 = snapNearAnchor(pos1, pts1);

    // 5) Clamp to anchors hull (triangle or polygon), then to [0..1]
    let clamped: Pos = pos1;
    if (anchorPoints.length === 3) {
      const [a, b, c] = anchorPoints;
      clamped = barycentricClampToTriangle(pos1, a, b, c);
    } else if (anchorPoints.length > 3) {
      const hull = convexHull(anchorPoints);
      clamped = clampToPolygon(pos1, hull);
    }
    clamped = { x: clamp01(clamped.x), y: clamp01(clamped.y) };

    // 6) Smooth & set
    const alpha = Math.max(0, Math.min(1, smoothing));
    const last = lastPosRef.current;
    const smoothed = last
      ? { x: alpha*clamped.x + (1-alpha)*last.x, y: alpha*clamped.y + (1-alpha)*last.y }
      : clamped;

    lastPosRef.current = smoothed;
    lastComputeTsRef.current = Date.now();
    setCurrentPos(smoothed);
    setVisible(true);

    console.log(BT, 'Scale fit:', { k0: +k0.toFixed(4), kStar: +kStar.toFixed(4) });
    console.log(BT, 'Position ->', { x: +smoothed.x.toFixed(3), y: +smoothed.y.toFixed(3) });
  }, [metaByExact, pathLossN, smoothing, deriveRangeScale, anchorPoints]);

  // hook-visible computePosition reference (not strictly needed externally)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const computePosition = _computePosition;

  // Auto-hide dot if we stop solving for a bit
  useEffect(() => {
    const t = setInterval(() => {
      if (visible && Date.now() - lastComputeTsRef.current > 4000) setVisible(false);
    }, 1000);
    return () => clearInterval(t);
  }, [visible]);

  return {
    currentPos,
    visible,
    beacons,
    handleBatch, // pass to scanner.start(handleBatch, { uuid, allowed })
  };
}
