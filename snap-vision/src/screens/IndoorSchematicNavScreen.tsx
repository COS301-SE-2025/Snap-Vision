import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
// import FloorSelector from '../components/molecules/FloorSelector';
import Icon from 'react-native-vector-icons/Ionicons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import { useAccessibility } from '../context/AccessibilityContext';
import SettingsHeader from '../components/molecules/SettingsHeader';
import IndoorSchematicMap from '../components/organisms/IndoorSchematicMap';
import StepsBottomSheet from '../components/molecules/StepsBottomSheet';
import * as NavUtils from '../utils/navigationUtils';
import StandardPopup from '../components/atoms/StandardPopup';
import DestinationReachedPopup from '../components/molecules/DestinationReachedPopup';
import QRScanner from '../components/molecules/QRScanner';
import { getQRCodeMappingByValue } from '../services/qrService';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import TTS from 'react-native-tts';
import { useBadges } from '../context/BadgeContext';

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
  const { isAccessibilityModeEnabled } = useAccessibility();
  const colors = getThemeColors(isDark);
  const { unlock } = useBadges();

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
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  // Check if floorplans exist immediately when screen loads
  useEffect(() => {
    const checkFloorplansExist = async () => {
      try {
        setLoading(true);
        const floorplansSnap = await firestore()
          .collection('locations')
          .doc(locationId)
          .collection('buildingPOIs')
          .doc(buildingId)
          .collection('floorplans')
          .limit(1)
          .get();

        if (floorplansSnap.empty) {
          // No floorplans exist, navigate to unavailable screen
          navigation.replace('IndoorNavigationUnavailable', {
            buildingId,
            buildingName,
            locationId,
          });
        }
      } catch (error) {
        console.error('Error checking floorplans:', error);
        navigation.replace('IndoorNavigationUnavailable', {
          buildingId,
          buildingName,
          locationId,
        });
      }
    };

    checkFloorplansExist();
  }, [buildingId, buildingName, locationId, navigation]);

  // Popup state
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupTitle, setPopupTitle] = useState('');
  const [popupMessage, setPopupMessage] = useState('');
  const [popupConfirmText, setPopupConfirmText] = useState('OK');

  // Destination Reached Popup state
  const [showDestinationReachedPopup, setShowDestinationReachedPopup] = useState(false);
  const [reachedDestination, setReachedDestination] = useState('');

  // QR Scanner state
  const [qrScannerVisible, setQrScannerVisible] = useState(false);

  // Custom Floor Dropdown state
  const [floorDropdownVisible, setFloorDropdownVisible] = useState(false);

  // TTS state
  const [isTtsEnabled, setIsTtsEnabled] = useState(true);

  // Floorplan image state
  const [floorplanUrl, setFloorplanUrl] = useState<string | null>(null);
  const [floorplanLoading, setFloorplanLoading] = useState<boolean>(false);

  // TTS: Setup and configuration
  useEffect(() => {
    // Set TTS defaults (only once)
    TTS.setDefaultLanguage('en-US');
    TTS.setDefaultRate(0.5);
    TTS.setDefaultPitch(1.0);

    return () => {
      // Just stop TTS on cleanup - avoid removeEventListener issues
      TTS.stop();
    };
  }, []);

  // TTS: Speak the current step's instruction when it changes
  useEffect(() => {
    if (isTtsEnabled && steps.length && steps[currentStep] && sheetOpen) {
      TTS.stop();
      setTimeout(() => {
        TTS.speak(steps[currentStep].instruction);
      }, 250);
    }
  }, [currentStep, steps, sheetOpen, isTtsEnabled]);

  // Helper function to find nearest room to a point
  const findNearestRoom = (rooms: RoomPOI[], pos: { x: number; y: number }, floorId: string) => {
    if (!pos || !rooms || !rooms.length) return null;

    //consolelog(`Finding nearest room on floor ${floorId}. Total rooms: ${rooms.length}`);

    // Filter rooms by floor
    const roomsOnFloor = rooms.filter((r) => r.floorId === floorId);
    //consolelog(`Rooms on floor ${floorId}: ${roomsOnFloor.length}`);

    if (!roomsOnFloor.length) return null;

    // Calculate distances
    const roomsWithDistance = roomsOnFloor.map((room) => {
      const dx = room.coordinates.x - pos.x;
      const dy = room.coordinates.y - pos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      return { room, distance };
    });

    // Sort by distance
    roomsWithDistance.sort((a, b) => a.distance - b.distance);

    // Return closest room
    return roomsWithDistance[0]?.room || null;
  };

  // Fetch ALL floors for this building
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        //consolelog('Loading rooms data with userPos:', userPos);

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

        // Set initial position and start room
        if (userPos) {
          // We have coordinates from QR code, set current position
          //consolelog('Setting current position from QR scan:', userPos);
          setCurrentPos(userPos);

          // Find the nearest room to use as starting point
          const nearestRoom = findNearestRoom(roomsData, userPos, selectedFloorId);

          if (nearestRoom) {
            //consolelog('Setting start room from QR coordinates:', nearestRoom.name);
            setStartId(nearestRoom.id);
            // setStatusMessage(`Current position: ${nearestRoom.name}`);

            // Show popup notification to user
            setPopupTitle('Location Set');
            setPopupMessage(`Your starting position has been set to ${nearestRoom.name}`);
            setPopupVisible(true);
          }
        } else {
          // No userPos provided, use entrance as default
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
        //consoleerror(e);
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
              //consolewarn('getDownloadURL failed for', storagePath, e);
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
            //consolewarn('Storage folder fallback failed', e);
          }
        }

        if (!cancelled) setFloorplanUrl(url ?? null);
      } catch (e) {
        //consolewarn('Floorplan fetch failed', e);
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

  // Add a guaranteed fallback coordinate that will work for all buildings/floors
  const fallbackCoordinates = { x: 500, y: 500 };

  // Handle QR code scan results - using the same logic as QrCard.tsx
  const handleQRScan = async (qrValue: string) => {
    try {
      // Close the scanner
      setQrScannerVisible(false);
      setStatus('Processing QR code...');

      if (!qrValue || typeof qrValue !== 'string' || qrValue.trim() === '') {
        setPopupTitle('Invalid QR');
        setPopupMessage('The QR code data is empty or invalid.');
        setPopupVisible(true);
        return;
      }

      //consolelog('Processing QR code value:', qrValue);

      // Use the qrService to get mapping data - same as QrCard
      const qrMapping = await getQRCodeMappingByValue(qrValue);

      if (!qrMapping) {
        setPopupTitle('QR not found');
        setPopupMessage('No mapping exists for this QR code.');
        setPopupVisible(true);
        return;
      }

      //consolelog('QR mapping found:', JSON.stringify(qrMapping));

      // Unlock the QR scan badge for successful scan
      try {
        await unlock('qr-scan');
      } catch (badgeError) {
        // Don't fail the whole operation if badge unlock fails
        console.warn('Failed to unlock qr-scan badge:', badgeError);
      }

      // Use the mapping as saved by createQRCodeMapping
      const {
        locationId: qrLocationId,
        buildingId: qrBuildingId,
        buildingName: qrBuildingName,
        roomId: qrRoomId,
        floorId: qrFloorId,
        roomName: qrRoomName,
      } = qrMapping;

      // Make sure the QR data is valid
      if (!qrLocationId || !qrBuildingId || !qrRoomId || !qrFloorId) {
        setPopupTitle('Incomplete QR');
        setPopupMessage('QR code is missing required information.');
        setPopupVisible(true);
        return;
      }

      // Check if we're in a different building/location
      if (qrBuildingId !== route.params.buildingId || qrLocationId !== route.params.locationId) {
        // We need to navigate to a different building
        setPopupTitle('Different Building');
        setPopupMessage(
          `This QR code is for ${qrBuildingName || 'a different building'}. Redirecting...`,
        );
        setPopupVisible(true);

        // Navigate to the correct building after showing message
        setTimeout(() => {
          setPopupVisible(false);
          navigation.replace('IndoorSchematicNav', {
            locationId: qrLocationId,
            buildingId: qrBuildingId,
            buildingName: qrBuildingName || 'Building',
            floorId: qrFloorId,
            userPos: fallbackCoordinates, // Add fallback coordinates
          });
        }, 1500);
        return;
      }

      // We're in the same building, try to get room details
      try {
        // Switch to the floor from the QR code
        //consolelog('Changing to floor:', qrFloorId, 'from floor:', selectedFloorId);
        setSelectedFloorId(qrFloorId);

        // Reset navigation state when changing floors
        resetRoute();

        // Get room reference
        const roomRef = firestore()
          .collection('locations')
          .doc(qrLocationId)
          .collection('roomPOIs')
          .doc(qrRoomId);

        //consolelog('Fetching room data for:', qrRoomId, 'in location:', qrLocationId);
        const roomDoc = await roomRef.get();

        // In newer Firebase versions, exists is a property or function
        let docExists = false;
        if (typeof roomDoc.exists === 'function') {
          docExists = roomDoc.exists();
        } else {
          docExists = !!roomDoc.exists;
        }
        //consolelog('Room exists:', docExists, 'Room ID:', roomDoc.id);

        if (!docExists) {
          // Room not found, try to find by name in existing rooms
          const roomByName = allRooms.find(
            (r) =>
              r.floorId === qrFloorId &&
              r.name &&
              r.name.toLowerCase() === (qrRoomName || '').toLowerCase(),
          );

          if (roomByName) {
            // Found room by name
            //consolelog('Found room by name:', roomByName.name);
            setCurrentPos(roomByName.coordinates);
            setStartId(roomByName.id);

            setPopupTitle('Location Set');
            setPopupMessage(`Your starting position has been set to ${roomByName.name}`);
            setPopupVisible(true);
            return;
          }

          // Not found by id or name, use fallback
          //consolewarn('Room document not found:', qrRoomId);
          setCurrentPos(fallbackCoordinates);

          // Try to find the nearest room to use as starting point
          const nearestRoom = findNearestRoom(allRooms, fallbackCoordinates, qrFloorId);
          if (nearestRoom) {
            setStartId(nearestRoom.id);
            setPopupTitle('Location Set');
            setPopupMessage(`Position set using nearby room: ${nearestRoom.name}`);
          } else {
            setPopupTitle('Position Set');
            setPopupMessage('Your position has been set to building entrance');
          }
          setPopupVisible(true);
          return;
        }

        // Room document exists, try to get coordinates
        const roomData = roomDoc.data() as any;
        //consolelog('Room data retrieved:', roomData ? JSON.stringify(roomData) : 'undefined');

        // Pre-define coordinates as fallback to guarantee we always have something
        let coordinates = fallbackCoordinates;

        if (roomData) {
          if (roomData.coordinates) {
            coordinates = roomData.coordinates;
            //consolelog('Room coordinates found:', coordinates);
          } else if (roomData.position) {
            coordinates = roomData.position;
            //consolelog('Room position found:', coordinates);
          }
        }

        // Set current position and starting room
        setCurrentPos(coordinates);

        // Find the nearest room to use as starting point
        const nearestRoom = findNearestRoom(allRooms, coordinates, qrFloorId);

        if (nearestRoom) {
          //consolelog('Setting start room from QR coordinates:', nearestRoom.name);
          setStartId(nearestRoom.id);

          // Show popup notification to user
          setPopupTitle('Location Set');
          setPopupMessage(`Your starting position has been set to ${nearestRoom.name}`);
          setPopupVisible(true);
        } else {
          // No nearest room found
          setPopupTitle('Position Set');
          setPopupMessage('Your position has been set');
          setPopupVisible(true);
        }
      } catch (roomError) {
        //consoleerror('Error fetching room data:', roomError);
        // Use fallback coordinates
        setCurrentPos(fallbackCoordinates);

        // Try to find the nearest room to use as starting point
        const nearestRoom = findNearestRoom(allRooms, fallbackCoordinates, qrFloorId);
        if (nearestRoom) {
          setStartId(nearestRoom.id);
          setPopupTitle('Location Set');
          setPopupMessage(`Position set near: ${nearestRoom.name}`);
          setPopupVisible(true);
        }
      }
    } catch (error) {
      //consoleerror('Error processing QR code:', error);
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

  const nextInstructionEnd = steps[currentStep]?.coordinates;

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
            accessible: isAccessibilityModeEnabled,
          },
        )
      : NavUtils.calculateRoute(startId, endId, allRooms as any, allPaths as any, {
          accessible: isAccessibilityModeEnabled,
        });

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
    const filtered = detailed.slice(1);
    setSteps(filtered);
    setCurrentStep(0);
    setSheetOpen(true);

    // TTS: Announce route found
    if (isTtsEnabled && filtered.length > 0) {
      TTS.stop();
      setTimeout(() => {
        TTS.speak(`Route found with ${filtered.length} steps. ${filtered[0].instruction}`);
      }, 500);
    }

    const firstStep = filtered[0];
    if (firstStep?.coordinates) setCurrentPos(firstStep.coordinates);
    if ((firstStep as any)?.floorId) setSelectedFloorId(String((firstStep as any).floorId));
  }, [startId, endId, allRooms, allPaths, isAccessibilityModeEnabled]);

  const handleAdvance = () => {
    if (!steps.length) return;
    const endpoint = steps[currentStep]?.coordinates;
    if (currentPos && endpoint) {
      const dist = NavUtils.calculateDistance(currentPos, endpoint);
      if (dist > 0.1) {
        setPopupTitle('Not there yet');
        setPopupMessage('Move closer to the highlighted point to complete this step.');
        setPopupConfirmText('OK');
        setPopupVisible(true);
        return;
      }
    }
    if (currentStep >= steps.length - 1) {
      // Use custom destination reached popup with confetti instead of standard popup
      const destinationRoom = allRooms.find((room) => room.id === endId);
      const destinationName = destinationRoom?.name || 'Your Destination';
      setReachedDestination(destinationName);
      setShowDestinationReachedPopup(true);

      // TTS: Announce arrival
      if (isTtsEnabled) {
        TTS.stop();
        setTimeout(() => {
          TTS.speak(`You have arrived at ${destinationName}`);
        }, 250);
      }

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

  // Determine what prompt to show based on state
  const prompt = !startId
    ? 'Choose your start room'
    : !endId
      ? 'Choose your destination'
      : `${Math.max(0, steps.length - currentStep)} steps left`;

  // Override prompt if userPos was set from QR code
  const effectivePrompt = userPos && startId ? 'Choose your destination' : prompt;

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SettingsHeader title={`Indoor Map — ${buildingName}`} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title={`Indoor Map — ${buildingName}`} />

      {/* Top bar: custom floor picker */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={[
            styles.floorDropdown,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => setFloorDropdownVisible(true)}
        >
          <Text style={[styles.floorDropdownText, { color: colors.text }]}>
            Floor: {selectedFloorId}
          </Text>
          <Icon name="chevron-down" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Custom Floor Dropdown Modal */}
      <Modal
        visible={floorDropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFloorDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setFloorDropdownVisible(false)}
        >
          <View
            style={[
              styles.dropdownContainer,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.dropdownTitle, { color: colors.text }]}>Select Floor</Text>
            <FlatList
              data={floors}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.dropdownItem,
                    selectedFloorId === item && { backgroundColor: colors.primary + '20' },
                  ]}
                  onPress={() => {
                    setSelectedFloorId(item);
                    setFloorDropdownVisible(false);
                  }}
                >
                  <Text style={[styles.dropdownItemText, { color: colors.text }]}>{item}</Text>
                  {selectedFloorId === item && (
                    <Icon name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Prompt banner */}
      <View
        style={[styles.promptBar, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Text style={{ color: colors.text, fontWeight: '600' }}>{effectivePrompt}</Text>
      </View>

      {/* Status message */}
      {statusMessage && (
        <View
          style={[
            styles.statusBar,
            { backgroundColor: colors.primary + '20', borderColor: colors.primary },
          ]}
        >
          <Text style={{ color: colors.text, fontWeight: '500' }}>{statusMessage}</Text>
        </View>
      )}

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
          nextInstructionEnd={nextInstructionEnd}
        />
      </View>

      {/* { !!Uncomment to show Bottom sheet with step-by-step directions!!} */}
      {/*Directions sheet*/}
      <StepsBottomSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onCancel={resetRoute}
        steps={steps}
        colors={colors}
        currentStep={currentStep}
        onAdvance={handleAdvance}
      />

      {/* {steps.length > 0 && !sheetOpen &&(
        <AppSecondaryButton
          title="Proceed"
          onPress={handleAdvance}
          style={styles.proceedBtn}
          testID="proceed-btn"
        />
      )} */}

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

      {/* Floating AR button
      {steps.length > 0 && startId && endId && (
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

      {/* Floating TTS toggle button */}
      {steps.length > 0 && (
        <TouchableOpacity
          onPress={() => {
            setIsTtsEnabled(!isTtsEnabled);
            if (!isTtsEnabled) {
              // If enabling TTS and there's a current step, speak it
              if (steps[currentStep]) {
                TTS.stop();
                setTimeout(() => {
                  TTS.speak(steps[currentStep].instruction);
                }, 250);
              }
            } else {
              // If disabling TTS, stop any current speech
              TTS.stop();
            }
          }}
          style={[
            styles.fabTTS,
            {
              backgroundColor: isTtsEnabled ? colors.primary : colors.card,
              borderColor: colors.border,
            },
          ]}
        >
          <Icon
            name={isTtsEnabled ? 'volume-high' : 'volume-mute'}
            size={20}
            color={isTtsEnabled ? '#FFFFFF' : colors.text}
          />
        </TouchableOpacity>
      )}

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
        <QRScanner onScan={handleQRScan} onClose={() => setQrScannerVisible(false)} />
      </Modal>

      <StandardPopup
        visible={popupVisible}
        title={popupTitle}
        message={popupMessage}
        confirmText={popupConfirmText}
        onConfirm={() => setPopupVisible(false)}
        showCancel={false}
      />

      {/* Custom Destination Reached Popup with Confetti */}
      <DestinationReachedPopup
        visible={showDestinationReachedPopup}
        destination={reachedDestination}
        onClose={() => setShowDestinationReachedPopup(false)}
        themeColors={{
          primary: colors.primary,
          background: colors.background,
          text: colors.text,
          success: '#4CAF50',
        }}
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
    top: 94,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 24,
    elevation: 5,
  },

  fabAR: {
    position: 'absolute',
    right: 16,
    top: 144,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 24,
    borderWidth: 1,
    elevation: 4,
  },

  fabTTS: {
    position: 'absolute',
    right: 16,
    top: 194,
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    elevation: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },

  fabTest: {
    position: 'absolute',
    right: 16,
    top: 194,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 24,
    elevation: 5,
    zIndex: 10,
  },

  proceedBtn: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 50,
  },

  statusBar: {
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
    marginTop: -2,
  },

  // Custom Floor Dropdown Styles
  floorDropdown: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },

  floorDropdownText: {
    fontSize: 16,
    fontWeight: '600',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  dropdownContainer: {
    width: '80%',
    maxHeight: '50%',
    borderRadius: 12,
    borderWidth: 1,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },

  dropdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },

  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },

  dropdownItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
