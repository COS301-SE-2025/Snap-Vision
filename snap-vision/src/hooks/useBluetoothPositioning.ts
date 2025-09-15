import { useEffect, useRef, useState } from 'react';
import firestore from '@react-native-firebase/firestore';
import type { BeaconScanner, IBeaconReading } from '../types/BeaconScanner';

// Constants for Minew beacons
const DEFAULT_TX_POWER = -59; // Default txPower for Minew MBS02 beacons

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
          txPowerAt1m: Number(data.txPowerAt1m) || DEFAULT_TX_POWER, // Add txPower from database
        };
      }).filter(b => !Number.isNaN(b.x) && !Number.isNaN(b.y));
      console.log('[BT] Valid beacons loaded:', arr.map(b => ({
        id: b.id,
        label: b.label,
        uuid: b.uuid,
        major: b.major,
        minor: b.minor,
        position: `(${b.x}, ${b.y})`,
        txPowerAt1m: b.txPowerAt1m
      })));
      console.log('[BT] 🎯 Expected beacon minors: [1, 2, 3] with major: 1');
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
      
      console.log('[BT] Available beacons in database:', beacons.map(b => 
        `${b.label || 'Beacon'} (${b.uuid}, major:${b.major}, minor:${b.minor})`
      ));

      // Enhanced matching for Minew SDK detecting standard iBeacons
      const readings = norm.filter(r => {
        // First log all incoming beacons for debugging
        console.log('[BT] 📡 Received beacon reading:', {
          uuid: r.uuid,
          major: r.major,
          minor: r.minor,
          rssi: r.rssi,
          measuredPower: r.measuredPower
        });
        
        // 1. Try exact UUID+Major+Minor match
        const exactKey = keyOf(r.uuid, r.major, r.minor);
        const exact = uuidIndex.has(exactKey);
        if (exact) {
          console.log('[BT] ✅ Exact match found:', r.uuid, r.major, r.minor, 'RSSI:', r.rssi);
          return true;
        }
        
        // 2. For Minew beacons: Try matching by major+minor only
        // This is critical for your specific use case with 3 beacons (minor 1,2,3)
        const majorMinorKey = `${r.major}_${r.minor}`;
        const hasMajorMinorMatch = mmIndex.has(majorMinorKey);
        if (hasMajorMinorMatch) {
          console.log('[BT] ✅ Major/Minor match found:', r.major, r.minor, 'RSSI:', r.rssi);
          return true;
        }
        
        // 3. Check against specific Minew MBS02 configuration
        // If we have beacons with minors 1,2,3 and major 1 in database, but beacon reported with different format
        if ((r.minor === 1 || r.minor === 2 || r.minor === 3) && r.major === 1) {
          console.log('[BT] ✅ Matched known Minew beacon config:', r.major, r.minor, 'RSSI:', r.rssi);
          return true;
        }
        
        // Log unmatched beacons for debugging
        console.log('[BT] ❌ Unmatched beacon:', r.uuid, r.major, r.minor, 'RSSI:', r.rssi);
        return false;
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

      // Enhanced RSSI smoothing with more stability
      const rm = rssiMapRef.current;
      for (const r of readings) {
        const k = keyOf(r.uuid,r.major,r.minor);
        const prev = rm.get(k) ?? null;
        // Use stronger smoothing for more stability (0.15 instead of 0.25)
        rm.set(k, ewma(prev, r.rssi, 0.15));
      }

      const used: BeaconDoc[]=[]; const dists:number[]=[];
      for (const b of beacons) {
        const k = keyOf(b.uuid,b.major,b.minor);
        const sm = rm.get(k); if (sm==null) continue;
        const rNow = readings.find(r=>keyOf(r.uuid,r.major,r.minor)===k);
        // Get measured power: prefer reading, then database value, then default for Minew MBS02
        const mp = rNow?.measuredPower ?? b.txPowerAt1m ?? DEFAULT_TX_POWER;
        console.log('[BT] Using measured power:', mp, 'for beacon:', b.label || `${b.major}-${b.minor}`);
        
        const d = rssiToDistance(sm, mp, pathLossN);
        console.log('[BT] Distance calculation:', { rssi: sm, measuredPower: mp, pathLossN, distance: d });
        
        // More lenient distance filtering (up to 20m instead of 50m)
        if (!isFinite(d) || d <= 0 || d > 20) {
          console.log('[BT] ❌ Filtering out unrealistic distance:', d);
          continue;
        }
        used.push(b); dists.push(d);
        console.log('[BT] ✅ Using beacon:', b.label || `${b.major}-${b.minor}`, 'distance:', d.toFixed(2), 'RSSI:', sm, 'txPower:', mp);
      }

      console.log('[BT] 📍 Using', used.length, 'beacons for positioning');

      // Require at least 2 beacons for stable positioning
      if (used.length < 2) {
        console.log('[BT] ⚠️ Need at least 2 beacons for positioning, got:', used.length);
        setVisible(false);
        return;
      }

      let est: {x:number;y:number}|null = null;
      if (used.length>=3) {
        est = trilaterateWeighted(used, dists);
        console.log('[BT] 🎯 Trilateration result:', est);
      } else if (used.length === 2) {
        // For 2 beacons, use weighted midpoint based on distance
        const w1 = 1 / (dists[0] + 0.1); // Avoid division by zero
        const w2 = 1 / (dists[1] + 0.1);
        const totalWeight = w1 + w2;
        est = {
          x: (used[0].x * w1 + used[1].x * w2) / totalWeight,
          y: (used[0].y * w1 + used[1].y * w2) / totalWeight
        };
        console.log('[BT] 🎯 2-beacon weighted midpoint:', est);
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
        
        // Enhanced position smoothing for stability
        let sx, sy;
        if (p.x == null || p.y == null) {
          // First position - use directly
          sx = est.x;
          sy = est.y;
          console.log('[BT] 🎯 Initial position set:', {x: sx, y: sy});
        } else {
          // Smooth position with adaptive smoothing based on distance
          const distance = Math.sqrt((est.x - p.x)**2 + (est.y - p.y)**2);
          
          // Use stronger smoothing for small movements, weaker for large jumps
          const adaptiveSmoothing = distance > 0.1 ? 0.3 : 0.1; // Stronger smoothing for stability
          
          sx = p.x + adaptiveSmoothing * (est.x - p.x);
          sy = p.y + adaptiveSmoothing * (est.y - p.y);
          
          console.log('[BT] 🎯 Smoothed position:', {x: sx, y: sy}, 'raw:', est, 'distance:', distance.toFixed(3));
        }
        
        p.x = sx; 
        p.y = sy;
        setCurrentPos({x: sx, y: sy});
      } else {
        console.log('[BT] ❌ No position estimate possible');
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
