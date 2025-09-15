// BluetoothIndoorNavigationScreen.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, TouchableOpacity, FlatList } from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import SettingsHeader from '../components/molecules/SettingsHeader';
import IndoorSchematicMap from '../components/organisms/IndoorSchematicMap';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import { Picker } from '@react-native-picker/picker';
import { useBluetoothPositioning } from '../hooks/useBluetoothPositioning';
import { NativeBeaconScanner } from '../utils/indoor/NativeBeaconScanner';

const MINEW_DEFAULT_UUID = 'e2c56db5-dffb-48d2-b060-d0f5a71096e0';
const BT = '[BT]';

type RootStackParamList = {
  BluetoothIndoorNavigation: {
    buildingId: string;
    buildingName: string;
    locationId: string;
  };
};
type RouteP = RouteProp<RootStackParamList, 'BluetoothIndoorNavigation'>;
type NavP = StackNavigationProp<RootStackParamList, 'BluetoothIndoorNavigation'>;

type RoomPOI = {
  id: string;
  name: string;
  buildingId: string;
  floorId: string;
  coordinates: { x:number; y:number };
  type?: string;
  description?: string | null;
  isEntrance?: boolean;
};

type BeaconMeta = {
  id: string;
  label?: string;
  uuid: string;
  major: number;
  minor: number;
  txPowerAt1m?: number;
  x?: number;
  y?: number;
};

export default function BluetoothIndoorNavigationScreen() {
  const navigation = useNavigation<NavP>();
  const route = useRoute<RouteP>();
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const { buildingId, buildingName, locationId } = route.params;

  const [allRooms, setAllRooms] = useState<RoomPOI[]>([]);
  const [floors, setFloors] = useState<string[]>([]);
  const [selectedFloorId, setSelectedFloorId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showRoomsList, setShowRoomsList] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<RoomPOI | null>(null);

  const [floorplanUrl, setFloorplanUrl] = useState<string | null>(null);
  const [floorplanLoading, setFloorplanLoading] = useState<boolean>(false);

  const [floorBeacons, setFloorBeacons] = useState<BeaconMeta[]>([]);

  const scannerRef = useRef(new NativeBeaconScanner());

  // ⬇️ Pass beaconsMeta, and destructure handleBatch from the hook
  const { currentPos, visible, beacons, handleBatch } = useBluetoothPositioning({
    locationId,
    buildingId,
    floorId: selectedFloorId,
    scanner: scannerRef.current,
    pathLossN: 2.6,
    smoothing: 0.25,
    beaconsMeta: floorBeacons,         // <-- give x,y,txPower to the solver
  });

  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  const dotPx = useMemo(() => {
    if (!currentPos || !mapSize.width || !mapSize.height) return null;
    return { left: currentPos.x * mapSize.width, top: currentPos.y * mapSize.height };
  }, [currentPos, mapSize]);

  // Rooms & floors
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        console.log(BT, 'Loading rooms for building:', buildingId);
        const roomSnap = await firestore()
          .collection('locations').doc(locationId)
          .collection('roomPOIs')
          .where('buildingId', '==', buildingId)
          .get();
        const roomsData = roomSnap.docs.map(d => ({ id: d.id, ...d.data() })) as RoomPOI[];
        setAllRooms(roomsData);
        const floorSet = Array.from(new Set(roomsData.map(r => r.floorId))).sort();
        setFloors(floorSet);
        if (floorSet.length > 0) setSelectedFloorId(floorSet[0]);
        console.log(BT, 'Rooms loaded:', roomsData.length, 'Floors:', floorSet);
      } catch (e) {
        console.error(BT, 'Rooms load error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [buildingId, locationId]);

  // Floorplan image
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setFloorplanLoading(true);
        setFloorplanUrl(null);

        const fpSnap = await firestore()
          .collection('locations').doc(locationId)
          .collection('buildingPOIs').doc(buildingId)
          .collection('floorplans')
          .where('floorId', '==', selectedFloorId)
          .limit(1)
          .get();

        let url: string | null = null;
        if (!fpSnap.empty) {
          const data: any = fpSnap.docs[0].data();
          url = data?.imageUrl || data?.url || null;
          if (!url && data?.storagePath) {
            try { url = await storage().ref(data.storagePath).getDownloadURL(); }
            catch (e) { console.warn(BT, 'getDownloadURL failed', e); }
          }
        }
        if (!url) {
          try {
            const baseRef = storage().ref(`floorplans/${locationId}/${buildingId}`);
            const list = await baseRef.listAll();
            const match = list.items.find(it =>
              it.name.toLowerCase().includes(String(selectedFloorId).toLowerCase()),
            ) || list.items[0];
            if (match) url = await match.getDownloadURL();
          } catch (e) { console.warn(BT, 'Storage fallback failed', e); }
        }
        if (!cancelled) setFloorplanUrl(url ?? null);
        console.log(BT, 'Floorplan URL for floor', selectedFloorId, '=>', url ? 'OK' : 'MISSING');
      } catch (e) {
        console.warn(BT, 'Floorplan fetch failed', e);
        if (!cancelled) setFloorplanUrl(null);
      } finally {
        if (!cancelled) setFloorplanLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [buildingId, locationId, selectedFloorId]);

  // DB beacons (with x,y,txPower)
  useEffect(() => {
    if (!selectedFloorId) return;
    console.log(BT, 'Subscribing beacons for floor', selectedFloorId);
    const unsub = firestore()
      .collection('locations').doc(locationId)
      .collection('buildingPOIs').doc(buildingId)
      .collection('floorplans').doc(selectedFloorId)
      .collection('beacons')
      .onSnapshot(snap => {
        const norm: BeaconMeta[] = snap.docs.map(d => {
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
        norm.forEach(b => {
          console.log(BT, `  📍 ${b.label ?? '(unlabeled)'}: UUID=${b.uuid}, M=${b.major}, m=${b.minor}, tx=${b.txPowerAt1m ?? 'n/a'}, x=${b.x}, y=${b.y}`);
        });
      }, e => console.warn(BT, 'Beacon subscribe error', e));
    return () => unsub();
  }, [locationId, buildingId, selectedFloorId]);

  const allowedList = useMemo(
    () => floorBeacons.map(b => ({ uuid: b.uuid, major: b.major, minor: b.minor, txPowerAt1m: b.txPowerAt1m })),
    [floorBeacons]
  );

  // Auto scan on focus — IMPORTANT: feed handleBatch to scanner.start
  useFocusEffect(
    useCallback(() => {
      if (!selectedFloorId) return;
      (async () => {
        try {
          if (scannerRef.current.isRunning?.()) {
            console.log(BT, 'Scanner already running → stopping before restart');
            await scannerRef.current.stop();
          }
          console.log(BT, 'Starting scanner with UUID + whitelist… size=', allowedList.length);
          await scannerRef.current.start(handleBatch, {   // <-- feed batches to the hook
            uuid: MINEW_DEFAULT_UUID,
            allowed: allowedList,
          });
          console.log(BT, '✅ Scanner started (focus)');
        } catch (e) {
          console.error(BT, '❌ Scanner start error (focus):', e);
        }
      })();
      return () => { (async () => { try { await scannerRef.current.stop?.(); } catch {} })(); };
    }, [selectedFloorId, allowedList, handleBatch])
  );

  // Debug
  useEffect(() => { console.log(BT, 'DB Beacons count:', floorBeacons.length); }, [floorBeacons.length]);
  useEffect(() => {
    if (beacons?.length) {
      const latest = beacons.slice(0, 5).map(b => `(${b.major}/${b.minor} rssi=${b.rssi})`).join(', ');
      console.log(BT, `Hook beacons sample [${beacons.length}]: ${latest}`);
    }
  }, [beacons]);
  useEffect(() => {
    console.log(BT, 'Live position:', currentPos ? { x:+currentPos.x.toFixed(3), y:+currentPos.y.toFixed(3) } : '—', 'visible=', visible);
  }, [currentPos, visible]);

  // POIs UI
  const roomsOnSelectedFloor = useMemo(() => allRooms.filter(r => r.floorId === selectedFloorId), [allRooms, selectedFloorId]);
  const handleRoomSelect = (roomId: string) => {
    const room = allRooms.find(r => r.id === roomId);
    if (room) { setSelectedRoom(room); console.log(BT, 'Room selected:', room.name); }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <SettingsHeader title={`${buildingName} - Bluetooth Navigation`} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.secondary }]}>Loading building layout...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title={`${buildingName} - Bluetooth Navigation`} />

      <View className="topBar" style={styles.topBar}>
        <Picker
          selectedValue={selectedFloorId}
          onValueChange={(v) => setSelectedFloorId(String(v))}
          style={{ width: 160, color: colors.text }}
          dropdownIconColor={colors.text}
          mode="dropdown"
        >
          {floors.map((f) => <Picker.Item key={f} label={`Floor ${f}`} value={f} color={colors.text} />)}
        </Picker>

        <TouchableOpacity style={[styles.roomsButton, { backgroundColor: colors.primary }]} onPress={() => setShowRoomsList(!showRoomsList)}>
          <MaterialIcons name="list" size={16} color="white" />
          <Text style={styles.roomsButtonText}>Rooms ({roomsOnSelectedFloor.length})</Text>
        </TouchableOpacity>
      </View>

      {__DEV__ && (
        <View style={[styles.debugBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={styles.debugBarRow}>
            <Text style={[styles.debugText, { color: colors.text }]}>
              Scanner: {scannerRef.current.isRunning?.() ? '✅' : '❌'} |
              DB Beacons: {floorBeacons.length} |
              Hook Beacons: {beacons?.length ?? 0} |
              Position: {currentPos ? '✅' : '❌'} |
              Visible: {visible ? '✅' : '❌'}
            </Text>
          </View>
          {currentPos && (
            <View style={styles.debugBarRow}>
              <Text style={[styles.debugText, { color: colors.secondary }]}>
                Pos: ({currentPos.x.toFixed(3)}, {currentPos.y.toFixed(3)})
              </Text>
            </View>
          )}
          <View style={styles.debugBarRow}>
            <Text style={[styles.debugNote, { color: colors.secondary }]}>
              Accepts iBeacon UUID or Minew service frames (fef3/c5e2) via major/minor match
            </Text>
          </View>
        </View>
      )}

      <View style={{ flex: 1 }}>
        {floorplanLoading && <View style={styles.loadingOverlay}><ActivityIndicator size="large" color={colors.primary} /></View>}
        <View style={{ flex: 1 }} onLayout={e => setMapSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
          <IndoorSchematicMap
            rooms={roomsOnSelectedFloor}
            startId={selectedRoom?.id}
            endId={undefined}
            routePolyline={[]}
            completedPolyline={[]}
            onSelectRoom={handleRoomSelect}
            themeColors={colors}
            currentPos={currentPos}
            floorplanUrl={floorplanUrl || undefined}
          />
          {dotPx && (
            <View pointerEvents="none" style={{
              position: 'absolute', left: dotPx.left - 8, top: dotPx.top - 8,
              width: 16, height: 16, borderRadius: 8, backgroundColor: '#007AFF',
              borderWidth: 3, borderColor: '#fff', elevation: 4
            }}/>
          )}
          {!visible && (
            <View style={{ position: 'absolute', bottom: 8, left: 8, right: 8, alignItems: 'center', paddingVertical: 6, borderRadius: 12, backgroundColor: colors.card }}>
              <Text style={{ color: colors.secondary, fontSize: 12 }}>Waiting for beacon signals…</Text>
            </View>
          )}
        </View>
      </View>

      {showRoomsList && (
        <View style={[styles.roomsListOverlay, { backgroundColor: colors.background }]}>
          <View style={[styles.roomsListHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.roomsListTitle, { color: colors.text }]}>Rooms & POIs</Text>
            <TouchableOpacity onPress={() => setShowRoomsList(false)} style={styles.closeListButton}>
              <MaterialIcons name="close" size={24} color={colors.secondary} />
            </TouchableOpacity>
          </View>
          <FlatList data={roomsOnSelectedFloor} keyExtractor={(item) => item.id} renderItem={({item}) =>
            <TouchableOpacity style={[styles.roomItem, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => { setSelectedRoom(item); setShowRoomsList(false); }}>
              <View style={styles.roomContent}>
                <MaterialIcons name={item.type === 'office' ? 'meeting-room' : 'place'} size={20} color={colors.primary} />
                <View style={styles.roomDetails}>
                  <Text style={[styles.roomName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.roomType, { color: colors.secondary }]}>{item.type || 'POI'}</Text>
                  {item.description && <Text style={[styles.roomDescription, { color: colors.secondary }]} numberOfLines={1}>{item.description}</Text>}
                </View>
              </View>
            </TouchableOpacity>
          } />
        </View>
      )}

      <View style={[styles.bluetoothFooter, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <MaterialIcons name="bluetooth" size={16} color={visible ? colors.primary : 'orange'} />
        <Text style={[styles.bluetoothText, { color: colors.secondary }]}>{visible ? 'Beacon navigation active' : 'Waiting for beacon signals'}</Text>
        <TouchableOpacity style={[styles.refreshButton, { backgroundColor: colors.primary }]} onPress={() => {
          (async () => {
            try {
              console.log(BT, 'Manual restart clicked');
              await scannerRef.current.stop?.();
              await new Promise(r => setTimeout(r, 400));
              await scannerRef.current.start?.(handleBatch, { uuid: MINEW_DEFAULT_UUID, allowed: allowedList });
              console.log(BT, '✅ Scanner manually restarted with whitelist');
            } catch (e) { console.error(BT, 'Manual restart failed:', e); }
          })();
        }}>
          <MaterialIcons name="refresh" size={16} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16 },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8 },
  roomsButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  roomsButtonText: { color: 'white', fontSize: 12, fontWeight: '500', marginLeft: 4 },
  selectedRoomBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  selectedRoomContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  selectedRoomText: { color: 'white', fontSize: 14, fontWeight: '500', marginLeft: 8 },
  closeListButton: { padding: 4 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', zIndex: 5 },
  roomsListOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 },
  roomsListHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  roomsListTitle: { fontSize: 18, fontWeight: '600', flex: 1 },
  roomItem: { borderBottomWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  roomContent: { flexDirection: 'row', alignItems: 'center' },
  roomDetails: { marginLeft: 12, flex: 1 },
  roomName: { fontSize: 16, fontWeight: '500', marginBottom: 2 },
  roomType: { fontSize: 14, marginBottom: 2 },
  roomDescription: { fontSize: 12 },
  bluetoothFooter: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderTopWidth: 1 },
  bluetoothText: { fontSize: 12, marginLeft: 8, fontStyle: 'italic', flex: 1 },
  refreshButton: { padding: 6, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  debugBar: { paddingHorizontal: 12, paddingVertical: 6, borderBottomWidth: 1 },
  debugBarRow: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 2 },
  debugText: { fontSize: 10, fontFamily: 'monospace' },
  debugNote: { fontSize: 9, fontFamily: 'monospace', fontStyle: 'italic' },
});
