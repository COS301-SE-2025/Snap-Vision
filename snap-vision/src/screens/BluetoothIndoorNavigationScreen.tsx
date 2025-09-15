import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ActivityIndicator,
  TouchableOpacity,
  FlatList
} from 'react-native';
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

interface RoomPOI {
  id: string;
  name: string;
  buildingId: string;
  floorId: string;
  coordinates: { x: number; y: number };
  type?: string;
  description?: string | null;
  isEntrance?: boolean;
}

type RootStackParamList = {
  BluetoothIndoorNavigation: {
    buildingId: string;
    buildingName: string;
    locationId: string;
  };
};

type RouteP = RouteProp<RootStackParamList, 'BluetoothIndoorNavigation'>;
type NavP = StackNavigationProp<RootStackParamList, 'BluetoothIndoorNavigation'>;

export default function BluetoothIndoorNavigationScreen() {
  const navigation = useNavigation<NavP>();
  const route = useRoute<RouteP>();
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  const { buildingId, buildingName, locationId } = route.params;

  // Master data (ALL floors)
  const [allRooms, setAllRooms] = useState<RoomPOI[]>([]);
  const [floors, setFloors] = useState<string[]>([]);
  const [selectedFloorId, setSelectedFloorId] = useState<string>('');
  
  // Screen state
  const [loading, setLoading] = useState(true);
  const [showRoomsList, setShowRoomsList] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<RoomPOI | null>(null);

  // Floorplan image state
  const [floorplanUrl, setFloorplanUrl] = useState<string | null>(null);
  const [floorplanLoading, setFloorplanLoading] = useState<boolean>(false);

  // Beacons for current floor (from Firestore) – used to whitelist & for expected logs
  const [floorBeacons, setFloorBeacons] = useState<
    { id: string; label?: string; uuid: string; major: number; minor: number; txPowerAt1m?: number }[]
  >([]);

  // One scanner per screen instance
  const scanner = React.useMemo(() => new NativeBeaconScanner(), []);

  // Positioning hook (kept same)
  const { currentPos, visible, beacons } = useBluetoothPositioning({
    locationId,
    buildingId,
    floorId: selectedFloorId,
    scanner,
    pathLossN: 2.6,
    smoothing: 0.25,
  });

  // Track container size to position the dot in pixels
  const [mapSize, setMapSize] = React.useState({ width: 0, height: 0 });
  const dotPx = React.useMemo(() => {
    if (!currentPos || !mapSize.width || !mapSize.height) return null;
    return {
      left: currentPos.x * mapSize.width,
      top: currentPos.y * mapSize.height,
    };
  }, [currentPos, mapSize]);

  // =========================
  // Data loading (rooms/floors)
  // =========================
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        console.log(BT, 'Loading rooms for building:', buildingId);

        const roomSnap = await firestore()
          .collection('locations')
          .doc(locationId)
          .collection('roomPOIs')
          .where('buildingId', '==', buildingId)
          .get();

        const roomsData = roomSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as RoomPOI);
        setAllRooms(roomsData);

        const floorSet = Array.from(new Set(roomsData.map((r) => r.floorId))).sort();
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

  // =========================
  // Floorplan loading
  // =========================
  useEffect(() => {
    let cancelled = false;

    async function fetchFloorplan() {
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

          // fallback via storagePath
          const storagePath: string | undefined = data?.storagePath;
          if (!url && storagePath) {
            try {
              url = await storage().ref(storagePath).getDownloadURL();
            } catch (e) {
              console.warn(BT, 'getDownloadURL failed for', storagePath, e);
            }
          }
        }

        if (!url) {
          // very last resort: folder listing
          try {
            const baseRef = storage().ref(`floorplans/${locationId}/${buildingId}`);
            const list = await baseRef.listAll();
            const match =
              list.items.find((it) =>
                it.name.toLowerCase().includes(String(selectedFloorId).toLowerCase()),
              ) || list.items[0];
            if (match) url = await match.getDownloadURL();
          } catch (e) {
            console.warn(BT, 'Storage folder fallback failed', e);
          }
        }

        if (!cancelled) setFloorplanUrl(url ?? null);
        console.log(BT, 'Floorplan URL for floor', selectedFloorId, '=>', url ? 'OK' : 'MISSING');
      } catch (e) {
        console.warn(BT, 'Floorplan fetch failed', e);
        if (!cancelled) setFloorplanUrl(null);
      } finally {
        if (!cancelled) setFloorplanLoading(false);
      }
    }

    if (selectedFloorId) fetchFloorplan();
    return () => { cancelled = true; };
  }, [buildingId, locationId, selectedFloorId]);

  // =========================
  // Load beacons for selected floor (for whitelist + expected logs)
  // =========================
  useEffect(() => {
    if (!selectedFloorId) return;
    console.log(BT, 'Subscribing beacons for floor', selectedFloorId);

    const unsub = firestore()
      .collection('locations').doc(locationId)
      .collection('buildingPOIs').doc(buildingId)
      .collection('floorplans').doc(selectedFloorId)
      .collection('beacons')
      .onSnapshot(
        snap => {
          const list: any[] = [];
          snap.forEach(d => list.push({ id: d.id, ...d.data() }));
          // Normalize
          const norm = list.map(b => ({
            id: b.id,
            label: b.label,
            uuid: String(b.uuid || '').toLowerCase(),
            major: Number(b.major),
            minor: Number(b.minor),
            txPowerAt1m: typeof b.txPowerAt1m === 'number' ? b.txPowerAt1m : undefined,
          }));
          setFloorBeacons(norm);

          // Pretty log of expected beacons
          console.log(BT, 'EXPECTED beacons (from database):');
          norm.forEach(b => {
            console.log(
              BT,
              `  📍 ${b.label || '(unlabeled)'}: UUID=${b.uuid}, Major=${b.major}, Minor=${b.minor}, txPowerAt1m=${b.txPowerAt1m ?? 'n/a'}`
            );
          });
        },
        e => console.warn(BT, 'Beacon subscribe error', e)
      );

    return () => unsub();
  }, [locationId, buildingId, selectedFloorId]);

  // Build whitelist for scanner
  const allowedList = useMemo(
    () =>
      floorBeacons.map(b => ({
        uuid: b.uuid,
        major: b.major,
        minor: b.minor,
        txPowerAt1m: b.txPowerAt1m,
      })),
    [floorBeacons]
  );

  // =========================
  // Start/Stop scanning automatically on focus
  // =========================
  useFocusEffect(
    useCallback(() => {
      if (!selectedFloorId) return;

      const haveBeacons = allowedList.length > 0;
      console.log(BT, 'Screen focused → start scan. Floor=', selectedFloorId, 'beaconsOnFloor=', allowedList.length);

      // Try to pass uuid + whitelist (scanner will ignore extras if not supported)
      const startScan = async () => {
        try {
          // Stop first if already running
          if (scanner.isRunning?.()) {
            console.log(BT, 'Scanner already running → stopping before restart');
            await scanner.stop();
          }

          if (haveBeacons) {
            console.log(BT, 'Starting scanner with UUID + whitelist…');
            // @ts-ignore (scanner may accept options)
            await scanner.start?.((batch: any) => {
              // Optional: if your scanner start expects a callback
              console.log(BT, 'Batch received (legacy cb path):', Array.isArray(batch) ? batch.length : typeof batch);
            }, {
              uuid: MINEW_DEFAULT_UUID,
              allowed: allowedList,
            });
          } else {
            console.log(BT, 'Starting scanner without whitelist (no beacons found in DB yet)…');
            // @ts-ignore
            await scanner.start?.();
          }

          console.log(BT, '✅ Scanner started (focus)');
        } catch (e) {
          console.error(BT, '❌ Scanner start error (focus):', e);
        }
      };

      startScan();

      return () => {
        (async () => {
          try {
            console.log(BT, 'Screen blur/unmount → stopping scanner');
            await scanner.stop?.();
          } catch (e) {
            console.warn(BT, 'Scanner stop error on blur:', e);
          }
        })();
      };
    }, [selectedFloorId, allowedList, scanner])
  );

  // ================
  // Extra debug logs from hook outputs
  // ================
  useEffect(() => {
    if (beacons?.length) {
      const latest = beacons.slice(0, 5).map(b => `(${b.major}/${b.minor} rssi=${b.rssi})`).join(', ');
      console.log(BT, `Hook beacons sample [${beacons.length}]: ${latest}`);
    }
  }, [beacons]);

  useEffect(() => {
    if (!currentPos) return;
    console.log(BT, 'Live position:', {
      x: Number(currentPos.x).toFixed(3),
      y: Number(currentPos.y).toFixed(3),
      visible,
    });
  }, [currentPos, visible]);

  // ==========
  // Rooms UI
  // ==========
  const roomsOnSelectedFloor = useMemo(
    () => allRooms.filter((r) => r.floorId === selectedFloorId),
    [allRooms, selectedFloorId],
  );

  const handleRoomSelect = (roomId: string) => {
    const room = allRooms.find(r => r.id === roomId);
    if (room) {
      setSelectedRoom(room);
      console.log(BT, 'Room selected:', room.name);
    }
  };

  const renderRoomItem = ({ item }: { item: RoomPOI }) => (
    <TouchableOpacity
      style={[styles.roomItem, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => {
        setSelectedRoom(item);
        setShowRoomsList(false);
      }}
    >
      <View style={styles.roomContent}>
        <MaterialIcons 
          name={item.type === 'office' ? 'meeting-room' : 'place'} 
          size={20} 
          color={colors.primary} 
        />
        <View style={styles.roomDetails}>
          <Text style={[styles.roomName, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.roomType, { color: colors.secondary }]}>{item.type || 'POI'}</Text>
          {item.description && (
            <Text style={[styles.roomDescription, { color: colors.secondary }]} numberOfLines={1}>
              {item.description}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <SettingsHeader title={`${buildingName} - Bluetooth Navigation`} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.secondary }]}>
            Loading building layout...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title={`${buildingName} - Bluetooth Navigation`} />
      
      {/* Top bar: floor picker */}
      <View style={styles.topBar}>
        <Picker
          selectedValue={selectedFloorId}
          onValueChange={(v) => setSelectedFloorId(String(v))}
          style={{ width: 160, color: colors.text }}
          dropdownIconColor={colors.text}
          mode="dropdown"
        >
          {floors.map((f) => (
            <Picker.Item key={f} label={`Floor ${f}`} value={f} color={colors.text} />
          ))}
        </Picker>
        
        <TouchableOpacity
          style={[styles.roomsButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowRoomsList(!showRoomsList)}
        >
          <MaterialIcons name="list" size={16} color="white" />
          <Text style={styles.roomsButtonText}>
            Rooms ({roomsOnSelectedFloor.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Debug Info Bar */}
      {__DEV__ && (
        <View style={[styles.debugBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={styles.debugBarRow}>
            <Text style={[styles.debugText, { color: colors.text }]}>
              Scanner: {scanner.isRunning?.() ? '✅' : '❌'} | 
              DB Beacons: {allowedList.length} | 
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
              Expected UUID={MINEW_DEFAULT_UUID}; Major=1; Minors=[1,2,3]
            </Text>
          </View>
        </View>
      )}

      {/* Selected Room Info */}
      {selectedRoom && (
        <View style={[styles.selectedRoomBar, { backgroundColor: colors.primary }]}>
          <View style={styles.selectedRoomContent}>
            <MaterialIcons name="place" size={16} color="white" />
            <Text style={styles.selectedRoomText}>
              {selectedRoom.name} - {selectedRoom.type || 'POI'}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setSelectedRoom(null)}
            style={styles.closeButton}
          >
            <MaterialIcons name="close" size={16} color="white" />
          </TouchableOpacity>
        </View>
      )}

      {/* Map area with floorplan */}
      <View style={{ flex: 1 }}>
        {floorplanLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}

        <View
          style={{ flex: 1 }}
          onLayout={e => {
            const { width, height } = e.nativeEvent.layout;
            setMapSize({ width, height });
          }}
        >
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

          {/* Blue dot overlay */}
          {dotPx && (
            <View
              pointerEvents="none"
              style={{
                position: 'absolute',
                left: dotPx.left - 8,
                top: dotPx.top - 8,
                width: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: '#007AFF',
                borderWidth: 3,
                borderColor: '#fff',
                elevation: 4,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
              }}
            />
          )}

          {/* No-signal banner */}
          {!visible && (
            <View style={{
              position: 'absolute',
              bottom: 8, left: 8, right: 8,
              alignItems: 'center',
              paddingVertical: 6,
              borderRadius: 12,
              backgroundColor: colors.card,
            }}>
              <Text style={{ color: colors.secondary, fontSize: 12 }}>
                Waiting for beacon signals…
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Rooms List Overlay */}
      {showRoomsList && (
        <View style={[styles.roomsListOverlay, { backgroundColor: colors.background }]}>
          <View style={[styles.roomsListHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.roomsListTitle, { color: colors.text }]}>
              Rooms & POIs
            </Text>
            <TouchableOpacity
              onPress={() => setShowRoomsList(false)}
              style={styles.closeListButton}
            >
              <MaterialIcons name="close" size={24} color={colors.secondary} />
            </TouchableOpacity>
          </View>
          
          <FlatList
            data={roomsOnSelectedFloor}
            keyExtractor={(item) => item.id}
            renderItem={renderRoomItem}
            style={styles.roomsList}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {/* Bluetooth Footer (manual restart) */}
      <View style={[styles.bluetoothFooter, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <MaterialIcons name="bluetooth" size={16} color={visible ? colors.primary : 'orange'} />
        <Text style={[styles.bluetoothText, { color: colors.secondary }]}>
          {visible 
            ? "Beacon navigation active"
            : "Waiting for beacon signals"}
        </Text>
        <TouchableOpacity 
          style={[styles.refreshButton, {backgroundColor: colors.primary}]}
          onPress={() => {
            (async () => {
              try {
                console.log(BT, 'Manual restart clicked');
                await scanner.stop?.();
                await new Promise(r => setTimeout(r, 400));
                // @ts-ignore
                await scanner.start?.(undefined, { uuid: MINEW_DEFAULT_UUID, allowed: allowedList });
                console.log(BT, '✅ Scanner manually restarted with whitelist');
              } catch (e) {
                console.error(BT, 'Manual restart failed:', e);
              }
            })();
          }}
        >
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
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 8,
  },
  roomsButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  roomsButtonText: { color: 'white', fontSize: 12, fontWeight: '500', marginLeft: 4 },
  selectedRoomBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  selectedRoomContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  selectedRoomText: { color: 'white', fontSize: 14, fontWeight: '500', marginLeft: 8 },
  closeButton: { padding: 4 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', zIndex: 5 },
  roomsListOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 },
  roomsListHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  roomsListTitle: { fontSize: 18, fontWeight: '600', flex: 1 },
  closeListButton: { padding: 4 },
  roomsList: { flex: 1 },
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
