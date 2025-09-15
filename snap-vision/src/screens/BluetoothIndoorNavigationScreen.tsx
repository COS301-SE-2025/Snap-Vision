import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  ActivityIndicator,
  TouchableOpacity,
  FlatList
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
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

  // Master data (ALL floors) - same as IndoorSchematicNavScreen
  const [allRooms, setAllRooms] = useState<RoomPOI[]>([]);
  const [floors, setFloors] = useState<string[]>([]);
  const [selectedFloorId, setSelectedFloorId] = useState<string>('');
  
  // Screen state
  const [loading, setLoading] = useState(true);
  const [showRoomsList, setShowRoomsList] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<RoomPOI | null>(null);

  // Floorplan image state - same as IndoorSchematicNavScreen
  const [floorplanUrl, setFloorplanUrl] = useState<string | null>(null);
  const [floorplanLoading, setFloorplanLoading] = useState<boolean>(false);

  // create scanner once per mount
  // inside component
const scanner = React.useMemo(() => new NativeBeaconScanner(), []);

const { currentPos, visible, beacons } = useBluetoothPositioning({
  locationId,
  buildingId,
  floorId: selectedFloorId,
  scanner,
  pathLossN: 2.6,
  smoothing: 0.25,
});

  // Debug state with enhanced beacon information
  const [debugInfo, setDebugInfo] = useState({
    scannerRunning: false,
    beaconsLoaded: 0,
    beaconsDetected: 0,
    positionFound: false,
    visible: false,
    lastRssi: null as number | null,
    detectedBeacons: [] as {major: number, minor: number, rssi: number}[],
  });

  // Update debug info with enhanced beacon information
  useEffect(() => {
    setDebugInfo(prev => ({
      scannerRunning: scanner.isRunning(),
      beaconsLoaded: beacons.length,
      beaconsDetected: prev.detectedBeacons.length,
      positionFound: !!currentPos,
      visible: visible,
      lastRssi: prev.lastRssi,
      detectedBeacons: prev.detectedBeacons,
    }));
  }, [scanner, beacons, currentPos, visible]);
  
  // Listen to beacon data for debug purposes
  useEffect(() => {
    const originalConsoleLog = console.log;
    console.log = (...args) => {
      originalConsoleLog(...args);
      
      // Check if this is a beacon log message
      if (args[0] === '[BeaconScanner]' && typeof args[1] === 'string') {
        if (args[1].includes('Raw Minew beacon event:') && args[2] && typeof args[2] === 'object') {
          const beaconData = args[2];
          if (beaconData.major !== undefined && beaconData.minor !== undefined && beaconData.rssi !== undefined) {
            setDebugInfo(prev => {
              // Add to detected beacons list, avoiding duplicates
              const key = `${beaconData.major}-${beaconData.minor}`;
              const existing = prev.detectedBeacons.findIndex(
                b => b.major === beaconData.major && b.minor === beaconData.minor
              );
              
              let newDetected = [...prev.detectedBeacons];
              if (existing >= 0) {
                // Update existing
                newDetected[existing] = {
                  ...newDetected[existing],
                  rssi: beaconData.rssi
                };
              } else {
                // Add new (keep max 10 beacons)
                newDetected.push({
                  major: beaconData.major,
                  minor: beaconData.minor,
                  rssi: beaconData.rssi
                });
                if (newDetected.length > 10) {
                  newDetected = newDetected.slice(-10);
                }
              }
              
              return {
                ...prev,
                lastRssi: beaconData.rssi,
                detectedBeacons: newDetected,
                beaconsDetected: newDetected.length
              };
            });
          }
        }
      }
    };
    
    return () => {
      console.log = originalConsoleLog;
    };
  }, []);

  // Test BLE manually
  // Navigate to beacon test screen
  const openBeaconTestScreen = () => {
    navigation.navigate('BeaconTest' as never);
  };
  
  // Legacy manual BLE testing function
  const testBLEManually = async () => {
    try {
      console.log('[Test] Manual BLE test starting...');
      const BleManager = require('react-native-ble-manager').default;
      
      // Start BLE
      await BleManager.start({ showAlert: false });
      console.log('[Test] BLE Manager started');
      
      // Check state
      const state = await BleManager.checkState();
      console.log('[Test] BLE State:', state);
      
      // Start scan
      console.log('[Test] Starting manual scan...');
      await BleManager.scan([], 5, true);
      console.log('[Test] Manual scan started');
      
      // Check results after 6 seconds
      setTimeout(async () => {
        try {
          const devices = await BleManager.getDiscoveredPeripherals();
          console.log('[Test] Found', devices.length, 'devices:');
          devices.forEach((device, index) => {
            console.log(`[Test] Device ${index + 1}:`, {
              id: device.id,
              name: device.name || 'unnamed',
              rssi: device.rssi,
              advertising: device.advertising
            });
          });
        } catch (e) {
          console.error('[Test] Error getting devices:', e);
        }
      }, 6000);
      
    } catch (e) {
      console.error('[Test] Manual BLE test failed:', e);
    }
  };// track container size to position the dot in pixels
const [mapSize, setMapSize] = React.useState({ width: 0, height: 0 });
const dotPx = React.useMemo(() => {
  if (!currentPos || !mapSize.width || !mapSize.height) return null;
  return {
    left: currentPos.x * mapSize.width,
    top: currentPos.y * mapSize.height,
  };
}, [currentPos, mapSize]);



  // Load all rooms data - same pattern as IndoorSchematicNavScreen
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        console.log('[BluetoothIndoor] Loading rooms data for building:', buildingId);

        const roomSnap = await firestore()
          .collection('locations')
          .doc(locationId)
          .collection('roomPOIs')
          .where('buildingId', '==', buildingId)
          .get();
        const roomsData = roomSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as RoomPOI);

        setAllRooms(roomsData);

        // Floors list - same logic as IndoorSchematicNavScreen
        const floorSet = Array.from(new Set(roomsData.map((r) => r.floorId))).sort();
        setFloors(floorSet);

        // Set initial floor
        if (floorSet.length > 0) {
          setSelectedFloorId(floorSet[0]);
        }

        console.log('[BluetoothIndoor] Loaded rooms:', roomsData.length, 'floors:', floorSet);
      } catch (e) {
        console.error('[BluetoothIndoor] Error loading indoor data:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [buildingId, locationId]);

  // Fetch floorplan image whenever floor changes - exact same logic as IndoorSchematicNavScreen
  useEffect(() => {
    let cancelled = false;

    async function fetchFloorplan() {
      try {
        setFloorplanLoading(true);
        setFloorplanUrl(null);

        // Firestore: locations/{locationId}/buildingPOIs/{buildingId}/floorplans (filter by floorId)
        const fpSnap = await firestore()
          .collection('locations')
          .doc(locationId)
          .collection('buildingPOIs')
          .doc(buildingId)
          .collection('floorplans')
          .where('floorId', '==', selectedFloorId)
          .limit(1)
          .get();

        let url: string | null = null;

        if (!fpSnap.empty) {
          const data: any = fpSnap.docs[0].data();
          url = data?.imageUrl || data?.url || null;

          // If only a storagePath is stored, resolve it
          const storagePath: string | undefined = data?.storagePath;
          if (!url && storagePath) {
            try {
              url = await storage().ref(storagePath).getDownloadURL();
            } catch (e) {
              console.warn('getDownloadURL failed for', storagePath, e);
            }
          }
        }

        if (!url) {
          try {
            const baseRef = storage().ref(`floorplans/${locationId}/${buildingId}`);
            const list = await baseRef.listAll();
            const match =
              list.items.find((it) =>
                it.name.toLowerCase().includes(String(selectedFloorId).toLowerCase()),
              ) || list.items[0];
            if (match) url = await match.getDownloadURL();
          } catch (e) {
            console.warn('Storage folder fallback failed', e);
          }
        }

        if (!cancelled) setFloorplanUrl(url ?? null);
      } catch (e) {
        console.warn('Floorplan fetch failed', e);
        if (!cancelled) setFloorplanUrl(null);
      } finally {
        if (!cancelled) setFloorplanLoading(false);
      }
    }

    if (selectedFloorId) {
      fetchFloorplan();
    }

    return () => {
      cancelled = true;
    };
  }, [buildingId, locationId, selectedFloorId]);

  // Filter rooms by selected floor - same as IndoorSchematicNavScreen
  const roomsOnSelectedFloor = useMemo(
    () => allRooms.filter((r) => r.floorId === selectedFloorId),
    [allRooms, selectedFloorId],
  );

  const handleRoomSelect = (roomId: string) => {
    const room = allRooms.find(r => r.id === roomId);
    if (room) {
      setSelectedRoom(room);
      console.log('[BluetoothIndoor] Room selected:', room.name);
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
      
      {/* Top bar: floor picker - same as IndoorSchematicNavScreen */}
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

        {/* Debug Test Button */}
        <View style={{flexDirection: 'row'}}>
          <TouchableOpacity
            style={[
              styles.debugButton,
              { backgroundColor: colors.card, marginRight: 8 }
            ]}
            onPress={testBLEManually}
          >
            <MaterialIcons name="bug-report" size={24} color={colors.primary} />
            <Text style={[styles.debugButtonText, { color: colors.text }]}>
              Test BLE
            </Text>
          </TouchableOpacity>
          
          {/* New Beacon Test Screen Button */}
          <TouchableOpacity
            style={[
              styles.debugButton,
              { backgroundColor: colors.notification }
            ]}
            onPress={openBeaconTestScreen}
          >
            <MaterialIcons name="bluetooth-searching" size={24} color="white" />
            <Text style={[styles.debugButtonText, { color: 'white' }]}>
              Beacon Test
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Enhanced Debug Info Bar */}
      {__DEV__ && (
        <View style={[styles.debugBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={styles.debugBarRow}>
            <Text style={[styles.debugText, { color: colors.text }]}>
              Scanner: {debugInfo.scannerRunning ? '✅' : '❌'} | 
              DB Beacons: {debugInfo.beaconsLoaded} | 
              Detected: {debugInfo.beaconsDetected} | 
              Position: {debugInfo.positionFound ? '✅' : '❌'} | 
              Visible: {debugInfo.visible ? '✅' : '❌'}
            </Text>
          </View>
          
          {currentPos && (
            <View style={styles.debugBarRow}>
              <Text style={[styles.debugText, { color: colors.secondary }]}>
                Position: ({currentPos.x.toFixed(3)}, {currentPos.y.toFixed(3)})
                {debugInfo.lastRssi ? ` | Last RSSI: ${debugInfo.lastRssi}dB` : ''}
              </Text>
            </View>
          )}
          
          {/* Detected beacons list */}
          {debugInfo.detectedBeacons.length > 0 && (
            <View style={styles.detectedBeaconsContainer}>
              <Text style={[styles.debugSectionTitle, { color: colors.primary }]}>Detected Beacons:</Text>
              <View style={styles.beaconsList}>
                {debugInfo.detectedBeacons.map((beacon, index) => (
                  <View key={`${beacon.major}-${beacon.minor}`} style={styles.beaconItem}>
                    <Text style={[styles.beaconText, { color: colors.text }]}>
                      {index+1}. Major: {beacon.major}, Minor: {beacon.minor}, RSSI: {beacon.rssi}dB
                      {beacon.minor <= 3 && beacon.major === 1 ? 
                        <Text style={{ color: 'green' }}> ✓ Target</Text> : 
                        <Text style={{ color: 'orange' }}> ⚠️ Unknown</Text>}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          
          {/* Show expected beacons */}
          <View style={styles.debugBarRow}>
            <Text style={[styles.debugNote, { color: colors.secondary }]}>
              Expected: Minew MBS02 beacons with UUID=e2c56db5-dffb-48d2-b060-d0f5a71096e0, Major=1, Minors=[1,2,3]
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

      {/* Map area with floorplan - same structure as IndoorSchematicNavScreen */}
      <View style={{ flex: 1 }}>
        {floorplanLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
        <View style={{ flex: 1 }}
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
    currentPos={currentPos}                 // still pass through
    floorplanUrl={floorplanUrl || undefined}
  />

  /* Blue dot overlay */
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

  {/* Debug dot position info */}
  {__DEV__ && currentPos && (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: 'rgba(0,0,0,0.7)',
        padding: 4,
        borderRadius: 4,
      }}
    >
      <Text style={{ color: 'white', fontSize: 10 }}>
        Map: {mapSize.width}x{mapSize.height}
      </Text>
      <Text style={{ color: 'white', fontSize: 10 }}>
        Pos: {currentPos.x.toFixed(3)}, {currentPos.y.toFixed(3)}
      </Text>
      {dotPx && (
        <Text style={{ color: 'white', fontSize: 10 }}>
          Dot: {Math.round(dotPx.left)}, {Math.round(dotPx.top)}
        </Text>
      )}
    </View>
  )}

  {/* Optional “no-signal” banner */}
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
        No Bluetooth signal here yet
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

      {/* Bluetooth Info Footer */}
      <View style={[styles.bluetoothFooter, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
        <MaterialIcons name="bluetooth" size={16} color={visible ? colors.primary : 'orange'} />
        <Text style={[styles.bluetoothText, { color: colors.secondary }]}>
          {visible 
            ? "Bluetooth beacon navigation active - beacons detected" 
            : "Waiting for beacon signals - check beacon placement"}
        </Text>
        <TouchableOpacity 
          style={[styles.refreshButton, {backgroundColor: colors.primary}]}
          onPress={() => {
            // Stop and restart scanner
            scanner.stop().then(() => {
              setTimeout(() => {
                scanner.start();
                console.log('[BT] Scanner manually restarted');
              }, 500);
            });
          }}
        >
          <MaterialIcons name="refresh" size={16} color="white" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  roomsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roomsButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  selectedRoomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  selectedRoomContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectedRoomText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  closeButton: {
    padding: 4,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
  roomsListOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  roomsListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  roomsListTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  closeListButton: {
    padding: 4,
  },
  roomsList: {
    flex: 1,
  },
  roomItem: {
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  roomContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roomDetails: {
    marginLeft: 12,
    flex: 1,
  },
  roomName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  roomType: {
    fontSize: 14,
    marginBottom: 2,
  },
  roomDescription: {
    fontSize: 12,
  },
  bluetoothFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
  },
  bluetoothText: {
    fontSize: 12,
    marginLeft: 8,
    fontStyle: 'italic',
    flex: 1,
  },
  refreshButton: {
    padding: 6,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  debugBar: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  debugBarRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 2,
  },
  debugText: {
    fontSize: 10,
    fontFamily: 'monospace',
  },
  debugNote: {
    fontSize: 9,
    fontFamily: 'monospace',
    fontStyle: 'italic',
  },
  debugSectionTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    marginTop: 4,
    marginBottom: 2,
  },
  detectedBeaconsContainer: {
    marginTop: 4,
  },
  beaconsList: {
    flexDirection: 'column',
  },
  beaconItem: {
    marginVertical: 1,
    paddingVertical: 2,
  },
  beaconText: {
    fontSize: 9,
    fontFamily: 'monospace',
  },
  debugButton: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 80,
    height: 40,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  debugButtonText: {
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
});