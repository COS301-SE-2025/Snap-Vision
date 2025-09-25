import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
import { useBluetoothPositioning } from './useBluetoothPositioning';
import { NativeBeaconScanner } from '../utils/indoor/NativeBeaconScanner';

const MINEW_DEFAULT_UUID = 'e2c56db5-dffb-48d2-b060-d0f5a71096e0';
const BT = '[BT]';

export type BeaconMeta = {
  id: string;
  label?: string;
  uuid: string;
  major: number;
  minor: number;
  txPowerAt1m?: number;
  x?: number;
  y?: number;
};

interface UseBeaconManagerParams {
  locationId: string;
  buildingId: string;
  selectedFloorId: string;
}

export function useBeaconManager({
  locationId,
  buildingId,
  selectedFloorId,
}: UseBeaconManagerParams) {
  const [floorBeacons, setFloorBeacons] = useState<BeaconMeta[]>([]);
  const scannerRef = useRef(new NativeBeaconScanner());

  const { currentPos, visible, beacons, handleBatch } = useBluetoothPositioning({
    locationId,
    buildingId,
    floorId: selectedFloorId,
    scanner: scannerRef.current,
    pathLossN: 2.6,
    smoothing: 0.25,
    beaconsMeta: floorBeacons,
  });

  const allowedList = useMemo(
    () =>
      floorBeacons.map((b) => ({
        uuid: b.uuid,
        major: b.major,
        minor: b.minor,
        txPowerAt1m: b.txPowerAt1m,
      })),
    [floorBeacons],
  );

  // Load beacons from database
  useEffect(() => {
    if (!selectedFloorId) return;
    console.log(BT, 'Subscribing beacons for floor', selectedFloorId);

    const unsub = firestore()
      .collection('locations')
      .doc(locationId)
      .collection('buildingPOIs')
      .doc(buildingId)
      .collection('floorplans')
      .doc(selectedFloorId)
      .collection('beacons')
      .onSnapshot(
        (snap) => {
          const norm: BeaconMeta[] = snap.docs.map((d) => {
            const b: any = d.data() || {};
            return {
              id: d.id,
              label: b.label,
              uuid: String(b.uuid || '').toLowerCase(),
              major: Number(b.major),
              minor: Number(b.minor),
              txPowerAt1m: typeof b.txPowerAt1m === 'number' ? b.txPowerAt1m : undefined,
              x: typeof b.x === 'number' ? b.x : undefined,
              y: typeof b.y === 'number' ? b.y : undefined,
            };
          });
          setFloorBeacons(norm);
          console.log(BT, 'EXPECTED beacons (from DB):');
          norm.forEach((b) => {
            console.log(
              BT,
              `  ${b.label ?? '(unlabeled)'}: UUID=${b.uuid}, M=${b.major}, m=${b.minor}, tx=${b.txPowerAt1m ?? 'n/a'}, x=${b.x}, y=${b.y}`,
            );
          });
        },
        (e) => console.warn(BT, 'Beacon subscribe error', e),
      );
    return () => unsub();
  }, [locationId, buildingId, selectedFloorId]);

  // Start/stop scanner based on focus
  useFocusEffect(
    useCallback(() => {
      if (!selectedFloorId) {
        console.log(BT, 'No selectedFloorId, skipping scanner start');
        return;
      }

      console.log(BT, 'useFocusEffect triggered with allowedList size:', allowedList.length);

      (async () => {
        try {
          if (scannerRef.current.isRunning?.()) {
            console.log(BT, 'Scanner already running → stopping before restart');
            await scannerRef.current.stop();
          }

          // Small delay to ensure clean restart
          await new Promise((resolve) => setTimeout(resolve, 100));

          console.log(BT, 'Starting scanner with UUID + whitelist… size=', allowedList.length);
          console.log(BT, 'Allowed list:', allowedList);

          await scannerRef.current.start(handleBatch, {
            uuid: MINEW_DEFAULT_UUID,
            allowed: allowedList,
          });
          console.log(BT, 'Scanner started (focus)');
        } catch (e) {
          console.error(BT, 'Scanner start error (focus):', e);
        }
      })();
      return () => {
        (async () => {
          try {
            console.log(BT, 'Cleaning up scanner on focus loss');
            await scannerRef.current.stop?.();
          } catch {}
        })();
      };
    }, [selectedFloorId, allowedList, handleBatch]),
  );

  // Additional effect to restart scanner when allowedList changes significantly
  useEffect(() => {
    if (!selectedFloorId || allowedList.length === 0) return;

    console.log(BT, 'AllowedList changed, restarting scanner if running...');

    (async () => {
      try {
        if (scannerRef.current.isRunning?.()) {
          console.log(BT, 'Restarting scanner due to allowedList change');
          await scannerRef.current.stop();
          await new Promise((resolve) => setTimeout(resolve, 200));
          await scannerRef.current.start(handleBatch, {
            uuid: MINEW_DEFAULT_UUID,
            allowed: allowedList,
          });
          console.log(BT, 'Scanner restarted with new allowedList');
        }
      } catch (e) {
        console.error(BT, 'Scanner restart error:', e);
      }
    })();
  }, [allowedList.length]); // Only depend on length to avoid constant restarts

  // Debug logging
  useEffect(() => {
    console.log(BT, 'DB Beacons count:', floorBeacons.length);
    if (floorBeacons.length > 0) {
      console.log(
        BT,
        'Beacon allowedList will be:',
        floorBeacons.map((b) => `${b.major}|${b.minor}`),
      );
    }
  }, [floorBeacons.length]);

  useEffect(() => {
    console.log(BT, 'AllowedList updated, size:', allowedList.length);
    allowedList.forEach((item, idx) => {
      console.log(
        BT,
        `  Allow[${idx}]: UUID=${item.uuid}, Major=${item.major}, Minor=${item.minor}`,
      );
    });
  }, [allowedList]);

  useEffect(() => {
    if (beacons?.length) {
      console.log(BT, 'DETECTED beacons from scanner:', beacons.length);
      beacons.slice(0, 10).forEach((b, index) => {
        console.log(
          BT,
          `  Detected ${index + 1}: UUID=${b.uuid}, Major=${b.major}, Minor=${b.minor}, RSSI=${b.rssi}`,
        );
      });

      const expectedMatches = beacons.filter((b) => b.major === 1 && [1, 2, 3].includes(b.minor));
      if (expectedMatches.length > 0) {
        console.log(BT, 'Found expected pattern matches:', expectedMatches.length);
        expectedMatches.forEach((m) => {
          console.log(BT, `  Match: Major=${m.major}, Minor=${m.minor}, RSSI=${m.rssi}`);
        });
      } else {
        console.log(BT, 'No beacons match expected pattern (Major=1, Minor=1,2,3)');
      }
    } else {
      console.log(BT, 'No beacons detected by scanner');
    }
  }, [beacons]);

  useEffect(() => {
    if (floorBeacons.length > 0 && beacons?.length > 0) {
      console.log(BT, 'BEACON MATCHING DEBUG:');
      console.log(BT, 'Database beacons (expected):');
      floorBeacons.forEach((db) => {
        console.log(
          BT,
          `  DB: ${db.label} - UUID="${db.uuid}" Major=${db.major} Minor=${db.minor} x=${db.x} y=${db.y}`,
        );
      });
      console.log(BT, 'Detected beacons (from scanner):');
      beacons.slice(0, 5).forEach((det) => {
        console.log(
          BT,
          `  DETECTED: UUID="${det.uuid}" Major=${det.major} Minor=${det.minor} RSSI=${det.rssi}`,
        );

        const exactMatch = floorBeacons.find(
          (db) => db.uuid === det.uuid && db.major === det.major && db.minor === det.minor,
        );
        const majorMinorMatch = floorBeacons.find(
          (db) => db.major === det.major && db.minor === det.minor,
        );

        if (exactMatch) {
          console.log(
            BT,
            `    EXACT MATCH with ${exactMatch.label} (x=${exactMatch.x}, y=${exactMatch.y})`,
          );
        } else if (majorMinorMatch) {
          console.log(
            BT,
            `    MAJOR/MINOR MATCH with ${majorMinorMatch.label} (UUID differs, x=${majorMinorMatch.x}, y=${majorMinorMatch.y})`,
          );
        } else {
          console.log(BT, `    NO MATCH found`);
        }
      });

      const beaconsWithCoords = floorBeacons.filter(
        (b) => typeof b.x === 'number' && typeof b.y === 'number',
      );
      console.log(
        BT,
        `Beacons with coordinates: ${beaconsWithCoords.length}/3 needed for positioning`,
      );
      if (beaconsWithCoords.length < 3) {
        console.log(BT, 'Need at least 3 beacons with x,y coordinates for trilateration');
        beaconsWithCoords.forEach((b) => {
          console.log(BT, `  ${b.label}: (${b.x}, ${b.y})`);
        });
      }
    }
  }, [floorBeacons, beacons]);

  useEffect(() => {
    console.log(
      BT,
      'Live position:',
      currentPos ? { x: +currentPos.x.toFixed(3), y: +currentPos.y.toFixed(3) } : '—',
      'visible=',
      visible,
    );
  }, [currentPos, visible]);

  return {
    floorBeacons,
    currentPos,
    visible,
    beacons,
    scannerRef,
    isRunning: scannerRef.current?.isRunning?.() ?? false,
    allowedListSize: allowedList.length,
    selectedFloorId,
  };
}
