import { useEffect, useRef, useState } from 'react';
import firestore from '@react-native-firebase/firestore';
import type { BeaconScanner, IBeaconReading } from '../types/BeaconScanner';

export type BeaconDoc = {
  id: string;
  uuid: string;   // stored any case; we normalize to lower on read
  major: number;
  minor: number;
  x: number;      // normalized 0..1
  y: number;      // normalized 0..1
  label?: string;
};

function ewma(prev: number | null, next: number, alpha = 0.2) {
  return prev == null ? next : prev + alpha * (next - prev);
}

function rssiToDistance(rssi: number, measuredPower: number, n = 2.6) {
  return Math.pow(10, (measuredPower - rssi) / (10 * n));
}

function trilaterateWeighted(beacons: BeaconDoc[], dists: number[]) {
  if (beacons.length < 3) return null;
  const [b0, ...restB] = beacons;
  const [d0, ...restD] = dists;
  const A:number[][]=[]; const rhs:number[]=[]; const w:number[]=[];
  restB.forEach((bi,i)=>{
    const di = restD[i];
    A.push([ -2*(bi.x-b0.x), -2*(bi.y-b0.y) ]);
    rhs.push( (di*di - d0*d0) - (bi.x*bi.x + bi.y*bi.y - b0.x*b0.x - b0.y*b0.y) );
    w.push(1/Math.max(1e-3, di*di));
  });
  const AT = (m:number[][])=> m[0].map((_,j)=>m.map(r=>r[j]));
  const ATm = AT(A);
  const ATWA = [[0,0],[0,0]], ATWb=[0,0];
  for (let i=0;i<A.length;i++){
    const wi=w[i];
    ATWA[0][0]+=wi*ATm[0][i]*A[i][0];
    ATWA[0][1]+=wi*ATm[0][i]*A[i][1];
    ATWA[1][0]+=wi*ATm[1][i]*A[i][0];
    ATWA[1][1]+=wi*ATm[1][i]*A[i][1];
    ATWb[0]+=wi*ATm[0][i]*rhs[i];
    ATWb[1]+=wi*ATm[1][i]*rhs[i];
  }
  const det=ATWA[0][0]*ATWA[1][1]-ATWA[0][1]*ATWA[1][0];
  if (Math.abs(det)<1e-9) return null;
  const inv=[[ ATWA[1][1]/det, -ATWA[0][1]/det ],[ -ATWA[1][0]/det, ATWA[0][0]/det ]];
  const X=inv[0][0]*ATWb[0]+inv[0][1]*ATWb[1];
  const Y=inv[1][0]*ATWb[0]+inv[1][1]*ATWb[1];
  return { x: Math.min(1,Math.max(0,X)), y: Math.min(1,Math.max(0,Y)) };
}

export function useBluetoothPositioning({
  locationId, buildingId, floorId, scanner, pathLossN=2.6, smoothing=0.25
}:{
  locationId: string; buildingId: string; floorId: string;
  scanner: BeaconScanner; pathLossN?: number; smoothing?: number;
}) {
  const [beacons, setBeacons] = useState<BeaconDoc[]>([]);
  const [currentPos, setCurrentPos] = useState<{x:number;y:number}>();
  const [visible, setVisible] = useState(false);

  const rssiMapRef = useRef<Map<string, number>>(new Map());
  const posRef = useRef<{x:number|null;y:number|null}>({x:null,y:null});
  const keyOf = (u:string,ma:number,mi:number)=>`${u}_${ma}_${mi}`;

  // subscribe beacons for this floor
  useEffect(()=>{
    const col = firestore()
      .collection('locations').doc(locationId)
      .collection('buildingPOIs').doc(buildingId)
      .collection('floorplans').doc(floorId)
      .collection('beacons');

    console.log('[BT] Listening for beacons at:', `locations/${locationId}/buildingPOIs/${buildingId}/floorplans/${floorId}/beacons`);

    const unsub = col.onSnapshot(snap=>{
      console.log('[BT] Beacon snapshot received:', snap.docs.length, 'documents');
      const arr: BeaconDoc[] = snap.docs.map(d => {
        const data:any = d.data();
        console.log('[BT] Beacon doc:', d.id, data);
        return {
          id: d.id,
          uuid: String(data.uuid || '').toLowerCase(), // normalize here
          major: Number(data.major),
          minor: Number(data.minor),
          x: Number(data.x),
          y: Number(data.y),
          label: data.label,
        };
      }).filter(b => !Number.isNaN(b.x) && !Number.isNaN(b.y));
      console.log('[BT] Valid beacons loaded:', arr.map(b => ({
        id: b.id,
        label: b.label,
        uuid: b.uuid,
        major: b.major,
        minor: b.minor,
        position: `(${b.x}, ${b.y})`
      })));
      setBeacons(arr);
    }, e => console.error('[BT] beacons snapshot error', e));

    return ()=>unsub();
  }, [locationId, buildingId, floorId]);

  // scanning + positioning
  useEffect(()=>{
    if (!beacons.length) { setVisible(false); setCurrentPos(undefined); return; }

    let stopped=false; let lastSeen=0;

    const onBatch = (batch:IBeaconReading[])=>{
      if (stopped) return;

      // normalize scanned UUIDs to lower
      const norm = batch.map(r => ({...r, uuid: r.uuid.toLowerCase()}));

      const uuidIndex = new Set(beacons.map(b => keyOf((b.uuid||'').toLowerCase(), b.major, b.minor)));
      const mmIndex = new Map<string, BeaconDoc[]>();
      for (const b of beacons) {
        const mm = `${b.major}_${b.minor}`;
        if (!mmIndex.has(mm)) mmIndex.set(mm, []);
        mmIndex.get(mm)!.push(b);
      }

      // TEMPORARY: Match any Minew beacon for testing
      const readings = norm.filter(r => {
        const exact = uuidIndex.has(keyOf(r.uuid, r.major, r.minor));
        if (exact) {
          console.log('[BT] Exact match found:', r.uuid, r.major, r.minor, 'RSSI:', r.rssi);
          return true;
        }
        const isMinew = r.uuid.startsWith('minew-');
        if (isMinew) {
          console.log('[BT] 🧪 TEMP: Accepting any Minew beacon for testing:', r.uuid, r.major, r.minor, 'RSSI:', r.rssi);
          return true; // TEMPORARY: Accept any Minew beacon
        }
        const hasMatch = mmIndex.has(`${r.major}_${r.minor}`);
        if (hasMatch) {
          console.log('[BT] Minew match found:', r.major, r.minor, 'RSSI:', r.rssi);
        }
        return hasMatch;
      });

      if (!readings.length) {
        console.log('[BT] No matching beacon readings found in batch of', batch.length);
        console.log('[BT] 🔍 EXPECTED beacons (from database):');
        beacons.forEach(b => {
          console.log(`[BT]   📍 ${b.label}: UUID=${b.uuid}, Major=${b.major}, Minor=${b.minor}`);
        });
        console.log('[BT] 🔍 DETECTED beacons (from scan):');
        norm.forEach(r => {
          console.log(`[BT]   📡 Detected: UUID=${r.uuid}, Major=${r.major}, Minor=${r.minor}, RSSI=${r.rssi}`);
        });
        if (Date.now()-lastSeen>3000) setVisible(false);
        return;
      }
      lastSeen = Date.now(); setVisible(true);
      console.log('[BT] Processing', readings.length, 'matching readings');

      // smooth RSSI
      const rm = rssiMapRef.current;
      for (const r of readings) {
        const k = keyOf(r.uuid,r.major,r.minor);
        const prev = rm.get(k) ?? null;
        rm.set(k, ewma(prev, r.rssi, 0.25));
      }

      const used: BeaconDoc[]=[]; const dists:number[]=[];
      for (const b of beacons) {
        const k = keyOf(b.uuid,b.major,b.minor);
        const sm = rm.get(k); if (sm==null) continue;
        const rNow = readings.find(r=>keyOf(r.uuid,r.major,r.minor)===k);
        const mp = rNow?.measuredPower ?? -59; // fallback if measuredPower missing
        const d = rssiToDistance(sm, mp, pathLossN);
        if (!isFinite(d) || d<=0) continue;
        used.push(b); dists.push(d);
        console.log('[BT] Using beacon:', b.label || `${b.major}-${b.minor}`, 'distance:', d.toFixed(2), 'RSSI:', sm);
      }

      console.log('[BT] Using', used.length, 'beacons for positioning');

      let est: {x:number;y:number}|null = null;
      if (used.length>=3) {
        est = trilaterateWeighted(used, dists);
        console.log('[BT] Trilateration result:', est);
      }
      if (!est) {
        let bi=-1, best=Infinity;
        for (let i=0;i<dists.length;i++){ if (dists[i]<best){best=dists[i];bi=i;} }
        if (bi>=0) {
          est = { x: used[bi].x, y: used[bi].y };
          console.log('[BT] Using closest beacon position:', est, 'from beacon:', used[bi].label || `${used[bi].major}-${used[bi].minor}`);
        }
      }
      if (est) {
        const p = posRef.current;
        const sx = p.x==null ? est.x : p.x + smoothing*(est.x-p.x);
        const sy = p.y==null ? est.y : p.y + smoothing*(est.y-p.y);
        p.x=sx; p.y=sy;
        console.log('[BT] Setting position:', {x:sx, y:sy});
        setCurrentPos({x:sx,y:sy});
      } else {
        console.log('[BT] No position estimate possible');
      }
    };

    scanner.start(onBatch).catch(e=>console.error('[BT] scanner start error', e));
    const t = setInterval(()=>{ if (Date.now()-lastSeen>3000) setVisible(false); }, 1000);

    return ()=>{
      stopped=true; clearInterval(t);
      scanner.stop().catch(()=>{});
      rssiMapRef.current.clear();
      posRef.current={x:null,y:null};
    };
  }, [beacons, scanner, pathLossN, smoothing]);

  return { currentPos, visible, beacons };
}
