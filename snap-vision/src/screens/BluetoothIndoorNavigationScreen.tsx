// BluetoothIndoorNavigationScreen.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { useFocusEffect } from '@react-navigation/native';
import { NativeBeaconScanner } from '../utils/indoor/NativeBeaconScanner';
import { useBluetoothPositioning } from '../hooks/useBluetoothPositioning';

const LOG = '[IndoorScreen]';
const log = (...a: any[]) => console.log(LOG, ...a);

// Helper: make whitelist from beacon docs
function toAllowed(list: any[]) {
  return list.map(b => ({
    uuid: String(b.uuid || '').toLowerCase(),
    major: Number(b.major),
    minor: Number(b.minor),
    txPowerAt1m: typeof b.txPowerAt1m === 'number' ? b.txPowerAt1m : undefined,
  }));
}

export const BluetoothIndoorNavigationScreen: React.FC<any> = ({ route }) => {
  const { locationId, buildingId } = route.params;
  const [floors, setFloors] = useState<string[]>([]);
  const [selectedFloorId, setSelectedFloorId] = useState<string>('');
  const [floorplanUrl, setFloorplanUrl] = useState<string>('');
  const [beacons, setBeacons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const scannerRef = useRef(new NativeBeaconScanner());

  // Positioning hook – must accept (scanner) and provide { currentPos, pois, handleBatch }
  const { currentPos, pois, handleBatch } = useBluetoothPositioning({
    locationId,
    buildingId,
    floorId: selectedFloorId,
    scanner: scannerRef.current,
  });

  // Load floors
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const qs = await firestore()
          .collection('locations')
          .doc(locationId)
          .collection('buildingPOIs')
          .doc(buildingId)
          .collection('floorplans')
          .orderBy('floorLabel')
          .get();
        if (!mounted) return;
        const floorIds = qs.docs.map(d => d.id);
        setFloors(floorIds);
        const first = floorIds[0] || '';
        setSelectedFloorId(first);
      } catch (e) {
        console.warn(LOG, 'Failed to load floors', e);
      }
    })();
    return () => { mounted = false; };
  }, [locationId, buildingId]);

  // Load floorplan url when floor changes
  useEffect(() => {
    let mounted = true;
    if (!selectedFloorId) return;
    (async () => {
      try {
        const doc = await firestore()
          .collection('locations').doc(locationId)
          .collection('buildingPOIs').doc(buildingId)
          .collection('floorplans').doc(selectedFloorId)
          .get();
        const url = doc.data()?.downloadURL || '';
        if (mounted) setFloorplanUrl(url);
      } catch (e) {
        console.warn(LOG, 'Failed to load floorplan url', e);
      }
    })();
    return () => { mounted = false; };
  }, [locationId, buildingId, selectedFloorId]);

  // Load beacons for the selected floor (to restrict + get txPowerAt1m)
  useEffect(() => {
    let unsub = () => {};
    if (!selectedFloorId) return;
    setLoading(true);
    log('📥 Subscribing beacons for floor', selectedFloorId);
    unsub = firestore()
      .collection('locations').doc(locationId)
      .collection('buildingPOIs').doc(buildingId)
      .collection('beacons')
      .where('floorId', '==', selectedFloorId)
      .onSnapshot(snap => {
        const list: any[] = [];
        snap.forEach(d => list.push({ id: d.id, ...d.data() }));
        log('✅ Beacons snapshot:', list.length, 'items', list.map(b => ({ uuid: b.uuid, major: b.major, minor: b.minor, txPowerAt1m: b.txPowerAt1m })));
        setBeacons(list);
        setLoading(false);
      }, e => { console.warn(LOG, 'Beacon subscribe error', e); setLoading(false); });
    return () => unsub();
  }, [locationId, buildingId, selectedFloorId]);

  const allowed = useMemo(() => toAllowed(beacons), [beacons]);

  // Auto start/stop scan on focus and floor changes
  useFocusEffect(
    useCallback(() => {
      if (!selectedFloorId) return; // gate until floor chosen
      const uuidCommon = allowed[0]?.uuid; // optional filter if all share same UUID
      log('🚀 Starting Minew scan for floor', selectedFloorId, 'uuid=', uuidCommon);

      scannerRef.current.start(handleBatch, {
        uuid: uuidCommon,     // still filtered by allowed list
        allowed,              // restrict to the 3 devices
      });

      return () => {
        log('🛑 Stopping scan (screen blur/unmount)');
        scannerRef.current.stop();
      };
    }, [selectedFloorId, allowed, handleBatch])
  );

  return (
    <View style={{ flex: 1 }}>
      {/* Top bar: floor chooser */}
      <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text style={{ fontWeight: '600' }}>Floor:</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {floors.map(fid => (
            <TouchableOpacity
              key={fid}
              onPress={() => setSelectedFloorId(fid)}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 12,
                backgroundColor: fid === selectedFloorId ? '#3b82f6' : '#e5e7eb'
              }}>
              <Text style={{ color: fid === selectedFloorId ? 'white' : '#111827' }}>{fid}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Floorplan + POIs + Live dot */}
      <View style={{ flex: 1 }}>
        {!floorplanUrl ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator />
            <Text style={{ marginTop: 8 }}>Loading floorplan…</Text>
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {/* Replace with your actual map component that already shows POIs */}
            {/* <IndoorSchematicMap imageUrl={floorplanUrl} pois={pois} position={currentPos} /> */}

            {/* Simple overlay dot (in case your map doesn’t draw it) */}
            {currentPos && (
              <View
                pointerEvents="none"
                style={{
                  position: 'absolute',
                  left: `${currentPos.x * 100}%`,
                  top: `${currentPos.y * 100}%`,
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: '#10b981',
                  marginLeft: -8,
                  marginTop: -8
                }}
              />
            )}
          </View>
        )}
      </View>

      {/* Debug footer */}
      <View style={{ padding: 10, borderTopWidth: 1, borderColor: '#e5e7eb' }}>
        <Text>Beacons on floor: {beacons.length} (whitelisted)</Text>
      </View>
    </View>
  );
};

export default BluetoothIndoorNavigationScreen;
