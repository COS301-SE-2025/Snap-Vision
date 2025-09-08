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
      </View>

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
        <IndoorSchematicMap
          rooms={roomsOnSelectedFloor}
          startId={selectedRoom?.id}
          endId={undefined}
          routePolyline={[]}
          completedPolyline={[]}
          onSelectRoom={handleRoomSelect}
          themeColors={colors}
          currentPos={undefined}
          floorplanUrl={floorplanUrl || undefined}
        />
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
        <MaterialIcons name="bluetooth" size={16} color={colors.primary} />
        <Text style={[styles.bluetoothText, { color: colors.secondary }]}>
          Bluetooth beacon navigation enabled for precise indoor positioning
        </Text>
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
  },
});