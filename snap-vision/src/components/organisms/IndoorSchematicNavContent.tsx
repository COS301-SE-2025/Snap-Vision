import React, { useEffect, useMemo, useState } from 'react';
import perf from '@react-native-firebase/perf';
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
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import { useAccessibility } from '../../context/AccessibilityContext';
import SettingsHeader from '../molecules/SettingsHeader';
import IndoorSchematicMap from '../organisms/IndoorSchematicMap';
import StepsBottomSheet from '../molecules/StepsBottomSheet';
import * as NavUtils from '../../utils/navigationUtils';
import StandardPopup from '../atoms/StandardPopup';
import DestinationReachedPopup from '../molecules/DestinationReachedPopup';
import QRScanner from '../molecules/QRScanner';
import { getQRCodeMappingByValue } from '../../services/qrService';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import TTS from 'react-native-tts';
import { useBadges } from '../../context/BadgeContext';
import POIPopup from '../molecules/POIPopup';
import POIInfoModal from '../molecules/POIInfoModal';
import CacheService from '../../services/CacheService';

const cacheService = CacheService.getInstance();
const FLOORPLANS_CACHE_TTL = 600 * 60 * 1000; // 10 minutes

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

  const { theme, isDark } = useTheme();
  const { isAccessibilityModeEnabled } = useAccessibility();
  const colors = getThemeColors(theme);
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
        //console.error('Error checking floorplans:', error);
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

  // POI popup state
  const [selectedPOI, setSelectedPOI] = useState<RoomPOI | null>(null);
  const [poiPopupVisible, setPoiPopupVisible] = useState(false);
  const [poiInfoModalVisible, setPoiInfoModalVisible] = useState(false);
  const [navigationMode, setNavigationMode] = useState(false);

  // TTS: Setup and configuration
  useEffect(() => {
    // Set TTS defaults (only once)
    TTS.setDefaultLanguage('en-US');
    TTS.setDefaultRate(0.5);
    TTS.setDefaultPitch(1.0);

    return () => {
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

    ////consolelog(`Finding nearest room on floor ${floorId}. Total rooms: ${rooms.length}`);

    // Filter rooms by floor
    const roomsOnFloor = rooms.filter((r) => r.floorId === floorId);
    ////consolelog(`Rooms on floor ${floorId}: ${roomsOnFloor.length}`);

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
        ////consolelog('Loading rooms data with userPos:', userPos);

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
          ////consolelog('Setting current position from QR scan:', userPos);
          setCurrentPos(userPos);

          // Find the nearest room to use as starting point
          const nearestRoom = findNearestRoom(roomsData, userPos, selectedFloorId);

          if (nearestRoom) {
            ////consolelog('Setting start room from QR coordinates:', nearestRoom.name);
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
        ////consoleerror(e);
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
      const trace = await perf().newTrace('indoor_floorplan_load_perf');
      await trace.start();
      try {
        setFloorplanLoading(true);
        setFloorplanUrl(null);

        // Check cache first for all floorplans
        const cacheKey = `floorplans:${locationId}:${buildingId}`;
        const cachedFloorplans = await cacheService.get<{ [key: string]: string }>(cacheKey, {
          ttl: FLOORPLANS_CACHE_TTL,
          userSpecific: false,
        });

        let url: string | null = null;

        if (cachedFloorplans && cachedFloorplans[selectedFloorId]) {
          // Found in cache
          url = cachedFloorplans[selectedFloorId];
          //console.log(`[FLOORPLAN CACHE] Found URL for floor ${selectedFloorId} in cache`);
        } else {
          //console.log(`[FLOORPLAN] Fetching all floorplans for ${locationId}/${buildingId} from Firestore...`);

          const fpSnap = await firestore()
            .collection('locations')
            .doc(locationId)
            .collection('buildingPOIs')
            .doc(buildingId)
            .collection('floorplans')
            .get();

          const floorplanMap: { [key: string]: string } = {};

          for (const doc of fpSnap.docs) {
            if (cancelled) break;
            const data: any = doc.data();
            const floorId = data.floorId || doc.id;
            let floorUrl = data?.imageUrl || data?.url || data?.downloadURL || null;

            // If no direct URL, try resolving storagePath
            if (!floorUrl && data?.storagePath) {
              try {
                floorUrl = await storage().ref(data.storagePath).getDownloadURL();
                //console.log(`[FLOORPLAN] Resolved storage URL for floor ${floorId}: ${floorUrl}`);
              } catch (e) {
                //console.warn(`[FLOORPLAN] getDownloadURL failed for floor ${floorId}, storagePath: ${data.storagePath}`, e);
              }
            }

            if (floorUrl) {
              floorplanMap[floorId] = floorUrl;
            } else {
              //console.warn(`[FLOORPLAN] No URL found for floor ${floorId}`);
            }
          }

          // Cache the map if we have data
          if (Object.keys(floorplanMap).length > 0) {
            await cacheService.set(cacheKey, floorplanMap, {
              ttl: FLOORPLANS_CACHE_TTL,
              userSpecific: false,
            });
            //console.log(`[FLOORPLAN] Cached floorplan map for ${locationId}/${buildingId}`);
          }

          // Get URL for selected floor
          url = floorplanMap[selectedFloorId] || null;
          if (url) {
            //console.log(`[FLOORPLAN] Set URL for floor ${selectedFloorId}: ${url}`);
          } else {
            //console.warn(`[FLOORPLAN] No URL found for selected floor ${selectedFloorId}`);
          }
        }

        if (!url) {
          //console.log(`[FLOORPLAN] Attempting storage fallback for floor ${selectedFloorId}`);
          try {
            const baseRef = storage().ref(`floorplans/${locationId}/${buildingId}`);
            const list = await baseRef.listAll();
            const match =
              list.items.find((it) =>
                it.name.toLowerCase().includes(String(selectedFloorId).toLowerCase()),
              ) || list.items[0];
            if (match) {
              url = await match.getDownloadURL();
              //console.log(`[FLOORPLAN] Fallback URL found: ${url}`);
            } else {
              //console.warn(`[FLOORPLAN] No matching file in storage for floor ${selectedFloorId}`);
            }
          } catch (e) {
            //console.warn('[FLOORPLAN] Storage folder fallback failed', e);
          }
        }

        if (!cancelled) {
          setFloorplanUrl(url ?? null);
        }
      } catch (e) {
        //console.warn('[FLOORPLAN] Floorplan fetch failed', e);
        if (!cancelled) {
          setFloorplanUrl(null);
        }
      } finally {
        if (!cancelled) {
          setFloorplanLoading(false);
        }
        await trace.stop();
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

  const fallbackCoordinates = { x: 500, y: 500 };

  // Handle QR code scan results
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

      ////consolelog('Processing QR code value:', qrValue);

      // Use the qrService to get mapping data - same as QrCard
      const qrMapping = await getQRCodeMappingByValue(qrValue);

      if (!qrMapping) {
        setPopupTitle('QR not found');
        setPopupMessage('No mapping exists for this QR code.');
        setPopupVisible(true);
        return;
      }

      ////consolelog('QR mapping found:', JSON.stringify(qrMapping));

      // Unlock the QR scan badge for successful scan
      try {
        await unlock('qr-scan');
      } catch (badgeError) {
        //console.warn('Failed to unlock qr-scan badge:', badgeError);
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
            userPos: fallbackCoordinates,
          });
        }, 1500);
        return;
      }

      // We're in the same building, try to get room details
      try {
        // Switch to the floor from the QR code
        ////consolelog('Changing to floor:', qrFloorId, 'from floor:', selectedFloorId);
        setSelectedFloorId(qrFloorId);

        // Reset navigation state when changing floors
        resetRoute();

        // Get room reference
        const roomRef = firestore()
          .collection('locations')
          .doc(qrLocationId)
          .collection('roomPOIs')
          .doc(qrRoomId);

        ////consolelog('Fetching room data for:', qrRoomId, 'in location:', qrLocationId);
        const roomDoc = await roomRef.get();

        let docExists = false;
        if (typeof roomDoc.exists === 'function') {
          docExists = roomDoc.exists();
        } else {
          docExists = !!roomDoc.exists;
        }
        ////consolelog('Room exists:', docExists, 'Room ID:', roomDoc.id);

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
            ////consolelog('Found room by name:', roomByName.name);
            setCurrentPos(roomByName.coordinates);
            setStartId(roomByName.id);

            setPopupTitle('Location Set');
            setPopupMessage(`Your starting position has been set to ${roomByName.name}`);
            setPopupVisible(true);
            return;
          }

          // Not found by id or name, use fallback
          ////consolewarn('Room document not found:', qrRoomId);
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
        ////consolelog('Room data retrieved:', roomData ? JSON.stringify(roomData) : 'undefined');

        // Pre-define coordinates as fallback to guarantee we always have something
        let coordinates = fallbackCoordinates;

        if (roomData) {
          if (roomData.coordinates) {
            coordinates = roomData.coordinates;
            ////consolelog('Room coordinates found:', coordinates);
          } else if (roomData.position) {
            coordinates = roomData.position;
            ////consolelog('Room position found:', coordinates);
          }
        }

        // Set current position and starting room
        setCurrentPos(coordinates);

        // Find the nearest room to use as starting point
        const nearestRoom = findNearestRoom(allRooms, coordinates, qrFloorId);

        if (nearestRoom) {
          ////consolelog('Setting start room from QR coordinates:', nearestRoom.name);
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
        ////consoleerror('Error fetching room data:', roomError);
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
      ////consoleerror('Error processing QR code:', error);
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
    setNavigationMode(false);
    // keep currentPos
  };

  const onSelectRoom = (roomId: string) => {
    // If in navigation mode (after user clicked "Navigate Here"), handle start selection only
    if (navigationMode) {
      if (!startId) {
        // Set as start room - destination is already set from "Navigate Here"
        setStartId(roomId);
        // Don't reset endId since it's already set as destination
        setSteps([]);
        setCurrentStep(0);
        setSheetOpen(false);
        return;
      }
      // If start is already set and user taps another room, reset start to the new room
      setStartId(roomId);
      setSteps([]);
      setCurrentStep(0);
      setSheetOpen(false);
    } else {
      // Show POI popup for any selected room when not in navigation mode
      const selectedRoom = roomsOnSelectedFloor.find((room) => room.id === roomId);
      if (selectedRoom) {
        setSelectedPOI(selectedRoom);
        setPoiPopupVisible(true);
      }
    }
  };

  const nextInstructionEnd = steps[currentStep]?.coordinates;

  // POI popup handlers
  const handleNavigateHere = () => {
    if (selectedPOI) {
      setEndId(selectedPOI.id);
      setNavigationMode(true);
      setPoiPopupVisible(false);
      setSelectedPOI(null);
      setStartId(null);
      setSteps([]);
      setCurrentStep(0);
      setSheetOpen(false);
    }
  };

  const handleMoreInfo = () => {
    setPoiPopupVisible(false);
    setPoiInfoModalVisible(true);
  };

  const handleClosePOIPopup = () => {
    setPoiPopupVisible(false);
    setSelectedPOI(null);
  };

  const handleClosePOIInfoModal = () => {
    setPoiInfoModalVisible(false);
    setSelectedPOI(null);
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
  const prompt = !navigationMode
    ? 'Tap any POI to explore'
    : !startId
      ? 'Choose your start room'
      : !endId
        ? 'Choose your destination'
        : `${Math.max(0, steps.length - currentStep)} steps left`;

  // Override prompt if userPos was set from QR code
  const effectivePrompt = userPos && startId && navigationMode ? 'Choose your destination' : prompt;

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

      {/* POI Popup */}
      <POIPopup
        visible={poiPopupVisible}
        poi={selectedPOI}
        onNavigate={handleNavigateHere}
        onMoreInfo={handleMoreInfo}
        onClose={handleClosePOIPopup}
        themeColors={colors}
      />

      {/* POI Info Modal */}
      <POIInfoModal
        visible={poiInfoModalVisible}
        poi={selectedPOI}
        onClose={handleClosePOIInfoModal}
        themeColors={colors}
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
    top: 90,
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
    width: 150,
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
    right: 20,
    top: 140,
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
    right: 20,
    top: 210,
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
