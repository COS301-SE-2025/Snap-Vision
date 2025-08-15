import React, { useEffect, useMemo, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, TouchableOpacity, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import SettingsHeader from '../components/molecules/SettingsHeader';
import IndoorSchematicMap from '../components/organisms/IndoorSchematicMap';
import StepsBottomSheet from '../components/molecules/StepsBottomSheet';
import * as NavUtils from '../utils/navigationUtils';
import { Picker } from '@react-native-picker/picker';
import StandardPopup from '../components/atoms/StandardPopup';
import AppSecondaryButton from '../components/atoms/AppSecondaryButton';
import QRScanner from '../components/molecules/QRScanner';

type ParamList = {
  IndoorSchematicNav: {
    buildingId: string;
    buildingName: string;
    locationId: string;
    floorId: string; // initial floor to show
    userPos?: { x: number; y: number } | null;
  };
};

export interface RoomPOI {
  id: string;
  name: string;
  buildingId: string;
  floorId: string;
  coordinates: { x: number; y: number };
  type?: string;
  description?: string | null;
  isEntrance?: boolean;
}

export interface PathPOI {
  id: string;
  buildingId: string;
  floorId: string;
  startRoomId?: string;
  endRoomId?: string;
  fromRoomId?: string;
  toRoomId?: string;
  waypoints?: { x: number; y: number }[];
  distance?: number;
  accessible?: boolean;
}

export default function IndoorSchematicNavScreen() {
  const route = useRoute<RouteProp<ParamList, 'IndoorSchematicNav'>>();
  const navigation = useNavigation<any>();
  const { buildingId, buildingName, locationId, floorId: initialFloorId, userPos } = route.params;

  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  // Master data (ALL floors)
  const [allRooms, setAllRooms] = useState<RoomPOI[]>([]);
  const [allPaths, setAllPaths] = useState<PathPOI[]>([]);
  const [floors, setFloors] = useState<string[]>([]);
  const [selectedFloorId, setSelectedFloorId] = useState<string>(initialFloorId);

  // Screen state
  const [loading, setLoading] = useState(true);
  const [startId, setStartId] = useState<string | null>(null);
  const [endId, setEndId] = useState<string | null>(null);
  const [steps, setSteps] = useState<NavUtils.NavigationStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(userPos ?? null);

  // Popup state
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupTitle, setPopupTitle] = useState('');
  const [popupMessage, setPopupMessage] = useState('');
  const [popupConfirmText, setPopupConfirmText] = useState('OK');
  
  // QR Scanner state
  const [qrScannerVisible, setQrScannerVisible] = useState(false);

  // Floorplan image state
  const [floorplanUrl, setFloorplanUrl] = useState<string | null>(null);
  const [floorplanLoading, setFloorplanLoading] = useState<boolean>(false);

  // Fetch ALL floors for this building
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const roomSnap = await firestore()
          .collection('locations')
          .doc(locationId)
          .collection('roomPOIs')
          .where('buildingId', '==', buildingId)
          .get();
        const roomsData = roomSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as RoomPOI);

        const pathSnap = await firestore()
          .collection('locations')
          .doc(locationId)
          .collection('pathPOIs')
          .where('buildingId', '==', buildingId)
          .get();
        const pathsData = pathSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as PathPOI);

        setAllRooms(roomsData);
        setAllPaths(pathsData);

        // Floors list
        const floorSet = Array.from(new Set(roomsData.map((r) => r.floorId))).sort();
        setFloors(floorSet);

        // Ensure selectedFloorId is valid
        if (!floorSet.includes(selectedFloorId)) {
          setSelectedFloorId(floorSet[0] || initialFloorId);
        }

        // Place user at entrance if nothing selected
        if (!userPos) {
          const initFloor = floorSet.includes(initialFloorId)
            ? initialFloorId
            : floorSet[0] || initialFloorId;
          const entrances = roomsData.filter(
            (r) => (r.isEntrance || r.type === 'entrance') && r.floorId === initFloor,
          );
          if (entrances.length) {
            setCurrentPos(entrances[0].coordinates);
          }
        }
      } catch (e) {
        console.error(e);
        setPopupTitle('Error');
        setPopupMessage('Failed to load indoor data.');
        setPopupConfirmText('OK');
        setPopupVisible(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [buildingId, locationId]);

  // Fetch floorplan image whenever floor changes
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

    fetchFloorplan();
    return () => {
      cancelled = true;
    };
  }, [buildingId, locationId, selectedFloorId]);

  const roomsOnSelectedFloor = useMemo(
    () => allRooms.filter((r) => r.floorId === selectedFloorId),
    [allRooms, selectedFloorId],
  );

  // Handle QR code scan results
  const handleQRScan = async (qrValue: string) => {
    try {
      // Close the scanner
      setQrScannerVisible(false);
      
      // Format expected: qr:location:building:floor:room
      // or qr:building:floor:room (legacy format)
      const parts = qrValue.split(':');
      
      if (parts[0] !== 'qr') {
        setPopupTitle('Invalid QR Code');
        setPopupMessage('This QR code is not valid for navigation.');
        setPopupVisible(true);
        return;
      }
      
      let locationId = route.params.locationId;
      let buildingId = route.params.buildingId;
      let floorId = '';
      let roomId = '';
      
      // Parse based on format
      if (parts.length === 5) {
        // New format: qr:location:building:floor:room
        locationId = parts[1];
        buildingId = parts[2];
        floorId = parts[3];
        roomId = parts[4];
      } else if (parts.length === 4) {
        // Legacy format: qr:building:floor:room
        buildingId = parts[1];
        floorId = parts[2];
        roomId = parts[3];
      } else {
        setPopupTitle('Invalid QR Format');
        setPopupMessage('The QR code format is not recognized.');
        setPopupVisible(true);
        return;
      }
      
      // Check if we're in the same building
      if (buildingId !== route.params.buildingId) {
        // We need to navigate to a different building
        setPopupTitle('Different Building');
        setPopupMessage('This QR code is for a different building. Redirecting...');
        setPopupVisible(true);
        
        // Navigate to the correct building after showing message
        setTimeout(() => {
          setPopupVisible(false);
          navigation.replace('IndoorSchematicNav', {
            buildingId,
            buildingName: 'Building', // We'll update this once we load
            locationId,
            floorId
          });
        }, 2000);
        return;
      }
      
      // We're in the correct building, set floor and find room
      setSelectedFloorId(floorId);
      
      // Find the room on this floor
      const room = allRooms.find(r => r.id === roomId && r.floorId === floorId);
      
      if (!room) {
        setPopupTitle('Room Not Found');
        setPopupMessage('The scanned room could not be found in this building.');
        setPopupVisible(true);
        return;
      }
      
      // Set current position or destination based on user selection
      setPopupTitle('QR Code Scanned');
      setPopupMessage('Use this location as your current position or destination?');
      setPopupConfirmText('Set as Position');
      setPopupVisible(true);
      
      // Store the room info for when user confirms
      const tempRoom = room;
      
      // Override default popup actions
      // Note: This would be better with a custom popup component with multiple buttons
      // but we're working with what we have
      setTimeout(() => {
        setPopupVisible(false);
        
        // Ask user if they want to set as current position or destination
        setPopupTitle('QR Location');
        setPopupMessage('What would you like to do with this location?');
        setPopupConfirmText('Set as Current Position');
        setPopupVisible(true);
        
        // Create our own custom popup buttons
        const currentPositionAction = () => {
          setPopupVisible(false);
          setCurrentPos(tempRoom.coordinates);
          setStartId(tempRoom.id);
          setStatus(`Set current position to ${tempRoom.name}`);
        };
        
        const destinationAction = () => {
          setPopupVisible(false);
          if (!startId) {
            setStartId(null);
            setEndId(tempRoom.id);
            setStatus(`Set destination to ${tempRoom.name}. Select a starting point.`);
          } else {
            setEndId(tempRoom.id);
            setStatus(`Set destination to ${tempRoom.name}`);
          }
        };
        
        // Allow both options via separate popups
        setTimeout(() => {
          setPopupVisible(false);
          setPopupTitle('Set as Current Position');
          setPopupMessage(`Set your current position to ${tempRoom.name}?`);
          setPopupConfirmText('Yes');
          setPopupVisible(true);
          
          setTimeout(() => {
            setPopupVisible(false);
            setPopupTitle('Set as Destination');
            setPopupMessage(`Set your destination to ${tempRoom.name}?`);
            setPopupConfirmText('Yes');
            setPopupVisible(true);
            
            setTimeout(() => {
              setPopupVisible(false);
              currentPositionAction();
            }, 2000);
          }, 2000);
        }, 2000);
      }, 2000);
    } catch (error) {
      console.error('Error processing QR code:', error);
      setPopupTitle('Error');
      setPopupMessage('Failed to process QR code. Please try again.');
      setPopupVisible(true);
    }
  };
  
  const resetRoute = () => {
    setStartId(null);
    setEndId(null);
    setSteps([]);
    setCurrentStep(0);
    setSheetOpen(false);
    // keep currentPos
  };

  const onSelectRoom = (roomId: string) => {
    // You can select on current floor; to select on another floor, switch floors and tap there
    if (!startId) {
      setStartId(roomId);
      setEndId(null);
      setSteps([]);
      setCurrentStep(0);
      setSheetOpen(false);
      return;
    }
    if (startId && !endId && roomId !== startId) {
      setEndId(roomId);
      return;
    }
    // Reset from tapped
    setStartId(roomId);
    setEndId(null);
    setSteps([]);
    setCurrentStep(0);
    setSheetOpen(false);
  };

  // Compute route (multi-floor if available)
  useEffect(() => {
    if (!startId || !endId) return;

    const hasMulti = typeof (NavUtils as any).calculateMultiFloorRoute === 'function';

    const routeSteps: NavUtils.NavigationStep[] = hasMulti
      ? (NavUtils as any).calculateMultiFloorRoute(
          startId,
          endId,
          allRooms as any,
          allPaths as any,
          {
            accessible: false,
          },
        )
      : NavUtils.calculateRoute(startId, endId, allRooms as any, allPaths as any);

    if (!routeSteps || !routeSteps.length) {
      setPopupTitle('No route');
      setPopupMessage('No path between the selected rooms in this building.');
      setPopupConfirmText('OK');
      setPopupVisible(true);
      setSteps([]);
      setCurrentStep(0);
      setSheetOpen(false);
      return;
    }

    const detailed = NavUtils.generateDetailedDirections(routeSteps);
    setSteps(detailed);
    setCurrentStep(0);
    setSheetOpen(true);

    const firstStep = detailed[0];
    if (firstStep?.coordinates) setCurrentPos(firstStep.coordinates);
    if ((firstStep as any)?.floorId) setSelectedFloorId(String((firstStep as any).floorId));
  }, [startId, endId, allRooms, allPaths]);

  const handleAdvance = () => {
    if (!steps.length) return;
    if (currentStep >= steps.length - 1) {
      setPopupTitle('Done');
      setPopupMessage('You have reached your destination.');
      setPopupConfirmText('OK');
      setPopupVisible(true);
      resetRoute();
      return;
    }
    const next = currentStep + 1;
    setCurrentStep(next);
    const nextStep = steps[next];
    if (nextStep?.coordinates) setCurrentPos(nextStep.coordinates);
    const nextFloor = (nextStep as any)?.floorId;
    if (nextFloor && nextFloor !== selectedFloorId) setSelectedFloorId(String(nextFloor));
  };

  const remainingPolyline = useMemo(() => {
    if (!steps.length) return [];
    return steps
      .slice(currentStep)
      .filter((s) => ((s as any).floorId ? String((s as any).floorId) === selectedFloorId : true))
      .map((s) => s.coordinates);
  }, [steps, currentStep, selectedFloorId]);

  const completedPolyline = useMemo(() => {
    if (!steps.length || currentStep <= 0) return [];
    return steps
      .slice(0, currentStep + 1)
      .filter((s) => ((s as any).floorId ? String((s as any).floorId) === selectedFloorId : true))
      .map((s) => s.coordinates);
  }, [steps, currentStep, selectedFloorId]);

  const prompt = !startId
    ? 'Choose your start room'
    : !endId
      ? 'Choose your destination'
      : `${Math.max(0, steps.length - currentStep)} steps left`;

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SettingsHeader title={`Indoor Map — ${buildingName}`} />
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title={`Indoor Map — ${buildingName}`} />

      {/* Top bar: floor picker */}
      <View style={styles.topBar}>
        {/* <Text style={{ color: colors.text, fontWeight: '700' }}>Floor</Text> */}
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
      </View>

      {/* Prompt banner */}
      <View
        style={[styles.promptBar, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Text style={{ color: colors.text, fontWeight: '600' }}>{prompt}</Text>
      </View>

      {/* Map area with floorplan */}
      <View style={{ flex: 1 }}>
        {floorplanLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator />
          </View>
        )}
        <IndoorSchematicMap
          rooms={roomsOnSelectedFloor}
          startId={startId || undefined}
          endId={endId || undefined}
          routePolyline={remainingPolyline}
          completedPolyline={completedPolyline}
          onSelectRoom={onSelectRoom}
          themeColors={colors}
          currentPos={currentPos || undefined}
          floorplanUrl={floorplanUrl || undefined}
        />
      </View>

      {/* { !!Uncomment to show Bottom sheet with step-by-step directions!!} */}
      {/* Directions sheet
      <StepsBottomSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onCancel={resetRoute}
        steps={steps}
        colors={colors}
        currentStep={currentStep}
        onAdvance={handleAdvance}
      /> */}

      {steps.length > 0 && (
        <AppSecondaryButton
          title="Proceed"
          onPress={handleAdvance}
          style={styles.proceedBtn}
          testID="proceed-btn"
        />
      )}

      {/* Floating Directions button */}
      {!sheetOpen && steps.length > 0 && (
        <TouchableOpacity
          onPress={() => setSheetOpen(true)}
          style={[
            styles.fab,
            { backgroundColor: colors.primary, shadowColor: isDark ? '#000' : '#333' },
          ]}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Directions</Text>
        </TouchableOpacity>
      )}

      {/* Floating AR button Uncomment to see AR */}
      {/* {steps.length > 0 && startId && endId && (
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('ARIndoorNav', {
              buildingId,
              buildingName,
              locationId,
              floorId: selectedFloorId,
              startRoomId: startId,
              endRoomId: endId,
              userPos: currentPos || null,
            })
          }
          style={[styles.fabAR, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={{ color: colors.text, fontWeight: '700' }}>AR</Text>
        </TouchableOpacity>
      )} */}

      {/* Floating QR scan button */}
      <TouchableOpacity
        style={[styles.qrScanButton, { backgroundColor: colors.primary }]}
        onPress={() => setQrScannerVisible(true)}
      >
        <Icon name="qr-code-outline" size={24} color="#FFFFFF" />
        <Text style={styles.qrScanButtonText}>Scan QR</Text>
      </TouchableOpacity>

      {/* QR Scanner Modal */}
      <Modal
        visible={qrScannerVisible}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setQrScannerVisible(false)}
      >
        <QRScanner 
          onScan={handleQRScan}
          onClose={() => setQrScannerVisible(false)}
        />
      </Modal>

      <StandardPopup
        visible={popupVisible}
        title={popupTitle}
        message={popupMessage}
        confirmText={popupConfirmText}
        onConfirm={() => setPopupVisible(false)}
        showCancel={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContainer: {
    paddingHorizontal: 10,
    zIndex: 2,
  },
  roomListContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  instructionText: {
    paddingHorizontal: 10,
    marginTop: 10,
    marginBottom: 5,
    opacity: 0.7,
    fontStyle: 'italic',
  },
  statusText: {
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  qrScanButton: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  qrScanButtonText: {
    color: '#FFFFFF',
    marginLeft: 6,
    fontWeight: '600',
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

  promptBar: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },

    

  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 24,
    elevation: 5,
  },

  fabAR: {
    position: 'absolute',
    right: 16,
    bottom: 74,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 24,
    borderWidth: 1,
    elevation: 4,
  },

  proceedBtn: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 50,
  },
});
