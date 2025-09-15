// hooks/useBluetoothPositioning.ts
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const BT = '[BT]';

export type IBeaconReading = {
  uuid: string;      // may be real iBeacon uuid OR "minew-fef3"/"minew-c5e2"
  major: number;
  minor: number;
  rssi: number;
  ts: number;
  measuredPower?: number; // optional from scanner
};

type BeaconMeta = {
  uuid: string;      // expected iBeacon UUID (e2c56…)
  major: number;
  minor: number;
  x?: number;        // 0..1
  y?: number;        // 0..1
  txPowerAt1m?: number; // e.g., -59
};

type Options = {
  locationId: string;
  buildingId: string;
  floorId?: string;
  scanner: any;              // NativeBeaconScanner
  pathLossN?: number;        // 2.0–3.0 typical indoors
  smoothing?: number;        // 0..1 EMA
  beaconsMeta?: BeaconMeta[]; // pass DB beacons incl. x,y,txPowerAt1m
};

type Pos = { x: number; y: number };

const DEFAULT_TX = -59;
const RELAXED_UUIDS = new Set(['minew-fef3', 'minew-c5e2']); // service-data fallbacks from Minew

function median(values: number[]): number {
  if (!values.length) return 0;
  const a = [...values].sort((x, y) => x - y);
  const mid = Math.floor(a.length / 2);
  return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
}

function rssiToDistance(rssi: number, txAt1m: number, n: number): number {
  // log-distance path-loss model: d = 10 ^ ((Tx - RSSI) / (10 * n))
  const d = Math.pow(10, (txAt1m - rssi) / (10 * (n || 2.2)));
  return Math.max(0.1, Math.min(d, 50)); // clamp for stability
}

function trilaterateWeighted(points: Array<{x:number,y:number,d:number}>): Pos | null {
  if (points.length < 3) return null;

  const p0 = points[0];
  const A: number[][] = [];
  const b: number[] = [];
  const w: number[] = [];

  for (let i = 1; i < points.length; i++) {
    const pi = points[i];
    A.push([2*(pi.x - p0.x), 2*(pi.y - p0.y)]);
    b.push((pi.x**2 - p0.x**2) + (pi.y**2 - p0.y**2) + (p0.d**2 - pi.d**2));
    w.push(1 / Math.max(1e-6, pi.d*pi.d));
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

function transpose(M: number[][]): number[][] {
  const r = M.length, c = M[0]?.length || 0;
  const T = Array.from({length: c}, () => Array(r).fill(0));
  for (let i=0;i<r;i++) for (let j=0;j<c;j++) T[j][i] = M[i][j];
  return T;
}
function diag(v: number[]): number[][] {
  const n = v.length;
  const D = Array.from({length: n}, () => Array(n).fill(0));
  for (let i=0;i<n;i++) D[i][i] = v[i];
  return D;
}
function matMul(A: number[][], B: number[][]): number[][] {
  const r=A.length, k=A[0]?.length||0, c=B[0]?.length||0;
  const out = Array.from({length:r},()=>Array(c).fill(0));
  for (let i=0;i<r;i++) for (let j=0;j<c;j++) {
    let s=0;
    for (let t=0;t<k;t++) s += A[i][t]*B[t][j];
    out[i][j]=s;
  }
  return out;
}
function matVecMul(A: number[][], v: number[]): number[] {
  const r=A.length, c=A[0]?.length||0;
  const out = Array(r).fill(0);
  for (let i=0;i<r;i++){
    let s=0;
    for (let j=0;j<c;j++) s+=A[i][j]*v[j];
    out[i]=s;
  }
  return out;
}
function solve2x2(A:number[][], b:number[]): number[] | null {
  if (A.length!==2 || A[0].length!==2 || b.length!==2) return null;
  const [a,b1]=A[0], [c,d]=A[1];
  const [e,f]=b;
  const det = a*d - b1*c;
  if (Math.abs(det) < 1e-9) return null;
  return [(e*d - b1*f)/det, (a*f - e*c)/det];
}

export function useBluetoothPositioning(opts: Options) {
  const {
    floorId,
    scanner,
    pathLossN = 2.4,
    smoothing = 0.3,
    beaconsMeta = [],
  } = opts;

  const [beacons, setBeacons] = useState<IBeaconReading[]>([]);
  const [currentPos, setCurrentPos] = useState<Pos | null>(null);
  const [visible, setVisible] = useState<boolean>(false);

  const bucketsRef = useRef<Map<string, IBeaconReading[]>>(new Map());
  const lastPosRef = useRef<Pos | null>(null);
  const lastComputeTsRef = useRef<number>(0);

  // Lookups
  const metaByExact = useMemo(() => {
    const m = new Map<string, BeaconMeta>();
    for (const b of beaconsMeta) {
      m.set(`${b.uuid.toLowerCase()}|${b.major}|${b.minor}`, b);
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

  const key = (u:string, M:number, m:number) => `${u.toLowerCase()}|${M}|${m}`;

  // Accept batches from scanner
  const handleBatch = useCallback((batch: IBeaconReading[] = []) => {
    if (!Array.isArray(batch) || !batch.length) return;

    // Map incoming readings to known anchors:
    // 1) Exact uuid+major+minor
    // 2) If uuid is one of Minew service UUID aliases, match by major+minor only
    const accepted: IBeaconReading[] = [];
    for (const r of batch) {
      const kExact = key(r.uuid, r.major, r.minor);
      const exact = metaByExact.get(kExact);

      if (exact) {
        accepted.push(r);
        continue;
      }

      if (RELAXED_UUIDS.has((r.uuid || '').toLowerCase())) {
        const kMM = `${r.major}|${r.minor}`;
        const byMm = metaByMm.get(kMM);
        if (byMm) {
          accepted.push({ ...r, uuid: byMm.uuid }); // rewrite uuid to canonical for keying
        }
      }
    }

    if (!accepted.length) return;

    const now = Date.now();
    const windowMs = 3500;
    const buckets = bucketsRef.current;

    for (const r of accepted) {
      const k = key(r.uuid, r.major, r.minor);
      const arr = buckets.get(k) ?? [];
      arr.push(r);
      while (arr.length && now - arr[0].ts > windowMs) arr.shift();
      buckets.set(k, arr);
    }

    // Latest for debug
    const latest: IBeaconReading[] = [];
    buckets.forEach((arr) => { if (arr.length) latest.push(arr[arr.length - 1]); });
    setBeacons(latest);

    computePosition();
  }, [metaByExact, metaByMm]);

  const computePosition = useCallback(() => {
    const buckets = bucketsRef.current;
    const n = pathLossN;

    type Anchor = { x:number; y:number; d:number; tag:string; rssiMed:number; tx:number };
    const pts: Anchor[] = [];

    buckets.forEach((arr, k) => {
      if (!arr.length) return;
      // k is canonical uuid|major|minor
      const meta = metaByExact.get(k);
      if (!meta || typeof meta.x !== 'number' || typeof meta.y !== 'number') return;

      const rssiMed = median(arr.map(a => a.rssi));
      const last = arr[arr.length - 1];
      const tx = typeof meta.txPowerAt1m === 'number'
        ? meta.txPowerAt1m
        : (typeof last.measuredPower === 'number' ? last.measuredPower! : DEFAULT_TX);

      const d = rssiToDistance(rssiMed, tx, n);
      pts.push({ x: meta.x!, y: meta.y!, d, tag: k, rssiMed, tx });
    });

    if (pts.length < 3) {
      setVisible(false);
      return;
    }

    const snapshot = pts
      .map(p => `${p.tag.split('|').slice(1).join('/')} rssi=${p.rssiMed.toFixed(0)} tx=${p.tx} d=${p.d.toFixed(2)}`)
      .join(' | ');
    console.log(BT, `Solve with ${pts.length} anchors: ${snapshot}`);

    const pos = trilaterateWeighted(pts);
    if (!pos) {
      console.log(BT, 'Trilateration failed');
      setVisible(false);
      return;
    }

    const alpha = Math.max(0, Math.min(1, smoothing));
    const last = lastPosRef.current;
    const smoothed = last
      ? { x: alpha*pos.x + (1-alpha)*last.x, y: alpha*pos.y + (1-alpha)*last.y }
      : pos;

    lastPosRef.current = smoothed;
    lastComputeTsRef.current = Date.now();
    setCurrentPos(smoothed);
    setVisible(true);

    console.log(BT, 'Position ->', { x: +smoothed.x.toFixed(3), y: +smoothed.y.toFixed(3) });
  }, [metaByExact, pathLossN, smoothing]);

  // Hide dot if we stop solving for a bit
  useEffect(() => {
    const t = setInterval(() => {
      if (Date.now() - lastComputeTsRef.current > 4000 && visible) setVisible(false);
    }, 1000);
    return () => clearInterval(t);
  }, [visible]);

  return {
    currentPos,
    visible,
    beacons,
    handleBatch, // <-- feed this to scanner.start(handleBatch, …)
  };
}
