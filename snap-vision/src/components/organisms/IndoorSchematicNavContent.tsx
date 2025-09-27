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

// Cache TTL configurations
const CACHE_TTL = {
  ROOMS: 10 * 60 * 1000, // 10 minutes
  PATHS: 10 * 60 * 1000, // 10 minutes
  FLOORPLANS: 30 * 60 * 1000, // 30 minutes - longer for floorplan URLs
  FLOOR_LIST: 15 * 60 * 1000, // 15 minutes
};

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

  // Theme handling - consistent with other files
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
        
        // Check cache first
        const cacheKey = `floorplans_exist:${locationId}:${buildingId}`;
        console.log('🔍 [INDOOR NAV CACHE] Checking if floorplans exist...');
        
        const cachedExists = await cacheService.get<boolean>(cacheKey, {
          ttl: CACHE_TTL.FLOORPLANS,
          userSpecific: false,
        });

        if (cachedExists !== null) {
          console.log(`✅ [INDOOR NAV CACHE] Floorplan existence cached: ${cachedExists}`);
          if (!cachedExists) {
            navigation.replace('IndoorNavigationUnavailable', {
              buildingId,
              buildingName,
              locationId,
            });
          }
          return;
        }

        console.log('🔥 [INDOOR NAV FIRESTORE] Checking floorplans existence in Firestore...');
        const floorplansSnap = await firestore()
          .collection('locations')
          .doc(locationId)
          .collection('buildingPOIs')
          .doc(buildingId)
          .collection('floorplans')
          .limit(1)
          .get();

        const exists = !floorplansSnap.empty;

        // Cache the result
        await cacheService.set(cacheKey, exists, {
          ttl: CACHE_TTL.FLOORPLANS,
          userSpecific: false,
        });
        console.log(`💿 [INDOOR NAV CACHE] Cached floorplan existence: ${exists}`);

        if (!exists) {
          navigation.replace('IndoorNavigationUnavailable', {
            buildingId,
            buildingName,
            locationId,
          });
        }
      } catch (error) {
        console.error('❌ [INDOOR NAV] Error checking floorplans:', error);
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

  // Fetch ALL floors for this building with caching
  useEffect(() => {
    let cancelled = false;
    
    const loadData = async () => {
      try {
        setLoading(true);
        console.log('🔍 [INDOOR NAV CACHE] Starting to load indoor navigation data...');

        const roomsCacheKey = `indoor_nav_rooms:${locationId}:${buildingId}`;
        const pathsCacheKey = `indoor_nav_paths:${locationId}:${buildingId}`;

        // Check cache for rooms and paths
        console.log(`🔍 [INDOOR NAV CACHE] Checking cache for rooms and paths...`);
        
        const [cachedRooms, cachedPaths] = await Promise.all([
          cacheService.get<RoomPOI[]>(roomsCacheKey, { ttl: CACHE_TTL.ROOMS, userSpecific: false }),
          cacheService.get<PathPOI[]>(pathsCacheKey, { ttl: CACHE_TTL.PATHS, userSpecific: false }),
        ]);

        if (cachedRooms && cachedPaths && !cancelled) {
          console.log(`✅ [INDOOR NAV CACHE] Found cached data: ${cachedRooms.length} rooms, ${cachedPaths.length} paths`);
          
          setAllRooms(cachedRooms);
          setAllPaths(cachedPaths);

          // Extract unique floors from cached data
          const uniqueFloors = Array.from(
            new Set(cachedRooms.map((room) => room.floorId).filter(Boolean))
          ).sort();
          
          setFloors(uniqueFloors);

          // Ensure selectedFloorId is valid
          if (!uniqueFloors.includes(selectedFloorId)) {
            const newFloor = uniqueFloors.includes(initialFloorId) ? initialFloorId : uniqueFloors[0] || '1';
            setSelectedFloorId(newFloor);
          }

          // Handle user position logic
          if (userPos && !cancelled) {
            setCurrentPos(userPos);
            const nearestRoom = findNearestRoom(cachedRooms, userPos, selectedFloorId);
            if (nearestRoom) {
              setStartId(nearestRoom.id);
              setPopupTitle('Location Set');
              setPopupMessage(`Your starting position has been set to ${nearestRoom.name}`);
              setPopupVisible(true);
            }
          } else {
            const initFloor = uniqueFloors.includes(initialFloorId) ? initialFloorId : uniqueFloors[0] || '1';
            const entrances = cachedRooms.filter(
              (r) => (r.isEntrance || r.type === 'entrance') && r.floorId === initFloor,
            );
            if (entrances.length && !cancelled) {
              setCurrentPos(entrances[0].coordinates);
            }
          }

          setLoading(false);
          return;
        }

        // Fetch from Firestore
        console.log('🔥 [INDOOR NAV FIRESTORE] Fetching data from Firestore...');

        const trace = await perf().newTrace('indoor_nav_data_load');
        await trace.start();

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

        if (cancelled) {
          await trace.stop();
          return;
        }

        console.log(`📊 [INDOOR NAV FIRESTORE] Loaded ${roomsData.length} rooms and ${pathsData.length} paths`);

        setAllRooms(roomsData);
        setAllPaths(pathsData);

        // Extract unique floor IDs
        const uniqueFloors = Array.from(
          new Set(roomsData.map((room) => room.floorId).filter(Boolean))
        ).sort();
        
        setFloors(uniqueFloors);
        console.log(`📊 [INDOOR NAV] Available floors: ${uniqueFloors.join(', ')}`);

        // Auto-select appropriate floor
        if (uniqueFloors.length > 0 && !cancelled) {
          const appropriateFloor = uniqueFloors.includes(initialFloorId) 
            ? initialFloorId 
            : uniqueFloors[0];
          setSelectedFloorId(appropriateFloor);
        }

        // Handle user position logic
        if (userPos && !cancelled) {
          setCurrentPos(userPos);
          const nearestRoom = findNearestRoom(roomsData, userPos, selectedFloorId);
          if (nearestRoom) {
            setStartId(nearestRoom.id);
            setPopupTitle('Location Set');
            setPopupMessage(`Your starting position has been set to ${nearestRoom.name}`);
            setPopupVisible(true);
          }
        } else if (!cancelled) {
          const initFloor = uniqueFloors.includes(initialFloorId) ? initialFloorId : uniqueFloors[0] || '1';
          const entrances = roomsData.filter(
            (r) => (r.isEntrance || r.type === 'entrance') && r.floorId === initFloor,
          );
          if (entrances.length) {
            setCurrentPos(entrances[0].coordinates);
          }
        }

        // Cache the data
        await Promise.all([
          cacheService.set(roomsCacheKey, roomsData, { ttl: CACHE_TTL.ROOMS, userSpecific: false }),
          cacheService.set(pathsCacheKey, pathsData, { ttl: CACHE_TTL.PATHS, userSpecific: false }),
        ]);

        console.log(`💿 [INDOOR NAV CACHE] Cached all navigation data`);

        await trace.stop();

      } catch (error) {
        console.error('❌ [INDOOR NAV] Error loading data:', error);
        if (!cancelled) {
          setPopupTitle('Error');
          setPopupMessage('Failed to load indoor navigation data.');
          setPopupVisible(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [buildingId, locationId, initialFloorId, userPos, selectedFloorId]);

  // Enhanced floorplan fetching with caching whenever floor changes
  useEffect(() => {
    let cancelled = false;

    async function fetchFloorplan() {
      if (!selectedFloorId) return;
      
      const trace = await perf().newTrace('indoor_floorplan_load_perf');
      await trace.start();
      
      try {
        setFloorplanLoading(true);
        setFloorplanUrl(null);

        const cacheKey = `indoor_nav_floorplan_url:${locationId}:${buildingId}:${selectedFloorId}`;
        console.log(`🔍 [INDOOR NAV CACHE] Checking cache for floorplan: ${cacheKey}`);

        // Check cache first
        const cachedUrl = await cacheService.get<string>(cacheKey, {
          ttl: CACHE_TTL.FLOORPLANS,
          userSpecific: false,
        });

        if (cachedUrl && !cancelled) {
          console.log(`✅ [INDOOR NAV CACHE] Found floorplan URL in cache`);
          setFloorplanUrl(cachedUrl);
          setFloorplanLoading(false);
          await trace.stop();
          return;
        }

        console.log(`🔥 [INDOOR NAV FIRESTORE] Fetching floorplan for floor ${selectedFloorId}...`);

        // Try finding by floorId first
        let fpSnap = await firestore()
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
          url = data?.imageUrl || data?.url || data?.downloadURL || null;

          const storagePath: string | undefined = data?.storagePath;
          if (!url && storagePath) {
            try {
              console.log(`☁️ [INDOOR NAV STORAGE] Resolving storage path: ${storagePath}`);
              url = await storage().ref(storagePath).getDownloadURL();
            } catch (e) {
              console.warn('getDownloadURL failed for', storagePath, e);
            }
          }
        }

        // Try by floorLabel if not found by floorId
        if (!url) {
          console.log(`🔍 [INDOOR NAV FIRESTORE] Trying by floorLabel: ${selectedFloorId}`);
          fpSnap = await firestore()
            .collection('locations')
            .doc(locationId)
            .collection('buildingPOIs')
            .doc(buildingId)
            .collection('floorplans')
            .where('floorLabel', '==', selectedFloorId)
            .limit(1)
            .get();

          if (!fpSnap.empty) {
            const data: any = fpSnap.docs[0].data();
            url = data?.imageUrl || data?.url || data?.downloadURL || null;
            console.log(`✅ [INDOOR NAV FIRESTORE] Found floorplan by floorLabel`);
          }
        }

        // Last resort: try storage folder fallback
        if (!url) {
          try {
            console.log(`📁 [INDOOR NAV STORAGE] Trying storage folder fallback...`);
            const baseRef = storage().ref(`floorplans/${locationId}/${buildingId}`);
            const list = await baseRef.listAll();
            const match =
              list.items.find((it) =>
                it.name.toLowerCase().includes(String(selectedFloorId).toLowerCase()),
              ) || list.items[0];
            if (match) {
              url = await match.getDownloadURL();
              console.log(`✅ [INDOOR NAV STORAGE] Found via storage folder fallback`);
            }
          } catch (e) {
            console.warn('Storage folder fallback failed', e);
          }
        }

        if (!cancelled) {
          setFloorplanUrl(url);
          
          // Cache the result (even if null to avoid repeated fetches)
          await cacheService.set(cacheKey, url || '', {
            ttl: CACHE_TTL.FLOORPLANS,
            userSpecific: false,
          });
          
          if (url) {
            console.log(`💿 [INDOOR NAV CACHE] Cached floorplan URL for floor ${selectedFloorId}`);
          } else {
            console.log(`💿 [INDOOR NAV CACHE] Cached empty result for floor ${selectedFloorId}`);
          }
        }

      } catch (e) {
        console.warn('❌ [INDOOR NAV] Floorplan fetch failed', e);
        if (!cancelled) setFloorplanUrl(null);
      } finally {
        if (!cancelled) setFloorplanLoading(false);
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
        }
      }
    } catch (error) {
      //consoleerror('Error processing QR code:', error);
      setPopupTitle('Error');
      setPopupMessage('Failed to process QR code. Please try again.');
      setPopupVisible(true);
    } finally {
      setStatus(null);
    }
  };

  // Rest of the component functionality...
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
      const selectedRoom = roomsOnSelectedFloor.find(room => room.id === roomId);
      if (selectedRoom) {
        setSelectedPOI(selectedRoom);
        setPoiPopupVisible(true);
      }
    }
  };

  const handleNavigateHere = (roomId: string) => {
    // Set the selected room as destination and enter navigation mode
    setEndId(roomId);
    setNavigationMode(true);
    setPoiPopupVisible(false);
    setPoiInfoModalVisible(false);
    
    // Clear any existing route
    setSteps([]);
    setCurrentStep(0);
    setSheetOpen(false);
  };

  const handleRoomInfo = () => {
    setPoiPopupVisible(false);
    setPoiInfoModalVisible(true);
  };

  // Calculate route when start and end are selected
  useEffect(() => {
    if (startId && endId && startId !== endId) {
      const route = NavUtils.calculateRoute(startId, endId, allRooms, allPaths);
      if (route.length) {
        const detailedSteps = NavUtils.generateDetailedDirections(route);
        setSteps(detailedSteps);
        setCurrentStep(0);
        setSheetOpen(true);
      } else {
        setPopupTitle('No Route');
        setPopupMessage('Cannot find a route between the selected rooms.');
        setPopupVisible(true);
      }
    }
  }, [startId, endId, allRooms, allPaths]);

  // Route polyline data for map visualization
  const remainingPolyline = useMemo(() => {
    if (!steps.length) return [];
    const remainingSteps = steps.slice(currentStep);
    return remainingSteps.map(step => step.coordinates).filter(Boolean);
  }, [steps, currentStep]);

  const completedPolyline = useMemo(() => {
    if (!steps.length || currentStep === 0) return [];
    const completedSteps = steps.slice(0, currentStep);
    return completedSteps.map(step => step.coordinates).filter(Boolean);
  }, [steps, currentStep]);

  const nextInstructionEnd = useMemo(() => {
    if (currentStep < steps.length) {
      return steps[currentStep]?.coordinates || null;
    }
    return null;
  }, [steps, currentStep]);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SettingsHeader title={`Indoor Map — ${buildingName}`} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
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
        
        <TouchableOpacity
          style={[
            styles.qrButton,
            { backgroundColor: colors.primary },
          ]}
          onPress={() => setQrScannerVisible(true)}
        >
          <Icon name="qr-code" size={20} color={colors.background} />
        </TouchableOpacity>
      </View>

      {/* Map with floorplan loading overlay */}
      <View style={{ flex: 1 }}>
        {floorplanLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
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
        onStepComplete={(stepIndex) => {
          if (stepIndex >= steps.length - 1) {
            // Navigation complete
            setReachedDestination(allRooms.find(r => r.id === endId)?.name || 'destination');
            setShowDestinationReachedPopup(true);
            resetRoute();
          } else {
            setCurrentStep(stepIndex + 1);
          }
        }}
        isTtsEnabled={isTtsEnabled}
        onToggleTts={() => setIsTtsEnabled(!isTtsEnabled)}
      />

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

      {/* QR Scanner */}
      {qrScannerVisible && (
        <QRScanner
          isVisible={qrScannerVisible}
          onClose={() => setQrScannerVisible(false)}
          onQRRead={handleQRScan}
        />
      )}

      {/* POI Popup */}
      <POIPopup
        visible={poiPopupVisible}
        poi={selectedPOI}
        onClose={() => setPoiPopupVisible(false)}
        onNavigateHere={() => selectedPOI && handleNavigateHere(selectedPOI.id)}
        onRoomInfo={handleRoomInfo}
        colors={colors}
      />

      {/* POI Info Modal - Fixed prop name */}
      <POIInfoModal
        visible={poiInfoModalVisible}
        poi={selectedPOI}
        onClose={() => setPoiInfoModalVisible(false)}
        themeColors={colors}
      />

      {/* Standard Popup */}
      <StandardPopup
        visible={popupVisible}
        title={popupTitle}
        message={popupMessage}
        confirmText={popupConfirmText}
        onConfirm={() => setPopupVisible(false)}
      />

      {/* Destination Reached Popup */}
      <DestinationReachedPopup
        visible={showDestinationReachedPopup}
        destinationName={reachedDestination}
        onClose={() => setShowDestinationReachedPopup(false)}
        colors={colors}
      />
    </View>
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
  mapContainer: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 8,
    paddingBottom: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  floorDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    marginRight: 10,
  },
  floorDropdownText: {
    fontSize: 16,
    flex: 1,
  },
  qrButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: '80%',
    maxHeight: '70%',
    borderWidth: 1,
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginVertical: 2,
  },
  dropdownItemText: {
    fontSize: 16,
  },
});