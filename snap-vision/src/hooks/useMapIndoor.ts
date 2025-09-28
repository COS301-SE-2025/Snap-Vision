import { useState, useCallback } from 'react';
import firestore from '@react-native-firebase/firestore';
import { POI } from './useMapPOI';

// Room interface for indoor navigation
export interface Room {
  id: string;
  name: string;
  type?: string;
  isEntrance?: boolean;
  floorId: string;
  connectorGroupId?: string;
  buildingId: string;
}

interface UseMapIndoorReturn {
  // State
  showIndoorPicker: boolean;
  indoorRooms: Room[];
  selectedIndoorRoom: Room | null;
  selectedBuildingForIndoor: POI | null;
  selectedStartRoom: Room | null;

  // Functions
  handleIndoorNavFromMap: (
    parsed: any,
    hookSelectedPOI: POI | null,
    pois: POI[],
    webViewRef: React.RefObject<any>,
    navigation: any,
    setError: (error: string | null) => void,
  ) => void;
  openIndoorNavigation: (
    building: POI,
    navigation: any,
    setErrorPopupMessage: (message: string) => void,
    setShowErrorPopup: (show: boolean) => void,
  ) => Promise<void>;
  checkFloorplansExist: (locationId: string, buildingId: string) => Promise<boolean>;
  areRoomsConnected: (
    locationId: string,
    buildingId: string,
    startRoomId: string,
    endRoomId: string,
    floorId?: string,
  ) => Promise<boolean>;
  closeIndoorPicker: () => void;
  startIndoorNavigation: (
    navigation: any,
    setErrorPopupMessage: (message: string) => void,
    setShowErrorPopup: (show: boolean) => void,
  ) => Promise<void>;

  // Setters
  setShowIndoorPicker: (show: boolean) => void;
  setIndoorRooms: (rooms: Room[]) => void;
  setSelectedIndoorRoom: (room: Room | null) => void;
  setSelectedBuildingForIndoor: (building: POI | null) => void;
  setSelectedStartRoom: (room: Room | null) => void;
}

export const useMapIndoor = (): UseMapIndoorReturn => {
  // State
  const [showIndoorPicker, setShowIndoorPicker] = useState(false);
  const [indoorRooms, setIndoorRooms] = useState<Room[]>([]);
  const [selectedIndoorRoom, setSelectedIndoorRoom] = useState<Room | null>(null);
  const [selectedBuildingForIndoor, setSelectedBuildingForIndoor] = useState<POI | null>(null);
  const [selectedStartRoom, setSelectedStartRoom] = useState<Room | null>(null);

  // Handle indoor navigation from map WebView message
  const handleIndoorNavFromMap = useCallback(
    async (
      parsed: any,
      hookSelectedPOI: POI | null,
      pois: POI[],
      webViewRef: React.RefObject<any>,
      navigation: any,
      setError: (error: string | null) => void,
    ) => {
      const p = parsed.payload || {};
      // Prefer payload; fall back to the current selectedPOI from state; last resort: find by id in pois
      const fallbackPOI = hookSelectedPOI || pois.find((x) => x.id === p.id);

      const buildingId = p.id || p.buildingId || fallbackPOI?.id || fallbackPOI?.buildingId;
      const buildingName =
        p.name || p.buildingName || fallbackPOI?.name || fallbackPOI?.title || 'Building';
      const locationId = p.locationId || p.location || fallbackPOI?.location || 'up-campus'; // update default if needed
      const floorId = '1';

      ////consolelog('[IndoorNav] payload:', p);
      ////consolelog('[IndoorNav] resolved ->', { buildingId, buildingName, locationId });

      if (!buildingId) {
        setError('Indoor navigation is only available for building POIs.');
        return;
      }

      // Close popup so UI looks clean
      webViewRef.current?.injectJavaScript(
        'try{map && map.closePopup && map.closePopup();}catch(e){}',
      );

      // Check if floorplans exist for this building
      const hasFloorplans = await checkFloorplansExist(locationId, buildingId);

      if (!hasFloorplans) {
        // Navigate to unavailable screen if no floorplans
        navigation.navigate('IndoorNavigationUnavailable', {
          buildingId,
          buildingName,
          locationId,
        });
        return;
      }

      // Navigate to indoor schematic only if floorplans exist
      navigation.navigate('IndoorSchematicNav', {
        buildingId,
        buildingName,
        locationId,
        floorId,
      });
    },
    [checkFloorplansExist],
  );

  // Count how many paths touch each room (higher = better default start)
  const getRoomDegrees = useCallback(
    async (locationId: string, buildingId: string, floorId?: string) => {
      let q: any = firestore()
        .collection(`locations/${locationId}/pathPOIs`)
        .where('buildingId', '==', buildingId);
      if (floorId) q = q.where('floorId', '==', floorId);
      const snap = await q.get();
      const deg: Record<string, number> = {};
      snap.docs.forEach((d: any) => {
        const p = d.data() as any;
        [p.startRoomId, p.endRoomId].forEach((id: string) => {
          deg[id] = (deg[id] ?? 0) + 1;
        });
      });
      return deg;
    },
    [],
  );

  // Quick connectivity check (BFS) before you navigate
  const areRoomsConnected = useCallback(
    async (
      locationId: string,
      buildingId: string,
      startRoomId: string,
      endRoomId: string,
      floorId?: string,
    ): Promise<boolean> => {
      // Build graph from pathPOIs
      let q: any = firestore()
        .collection(`locations/${locationId}/pathPOIs`)
        .where('buildingId', '==', buildingId);
      if (floorId) q = q.where('floorId', '==', floorId);
      const pathSnap = await q.get();
      const edges: Record<string, string[]> = {};
      pathSnap.docs.forEach((d: any) => {
        const p = d.data() as any;
        edges[p.startRoomId] = [...(edges[p.startRoomId] || []), p.endRoomId];
        edges[p.endRoomId] = [...(edges[p.endRoomId] || []), p.startRoomId];
      });

      // Cross-floor links via connectorGroupId on stairs/elevators
      const roomSnap = await firestore()
        .collection(`locations/${locationId}/roomPOIs`)
        .where('buildingId', '==', buildingId)
        .get();
      const rooms = roomSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      const byGroup: Record<string, string[]> = {};
      rooms.forEach((r) => {
        if (r.connectorGroupId && (r.type === 'stairs' || r.type === 'elevator')) {
          byGroup[r.connectorGroupId] = [...(byGroup[r.connectorGroupId] || []), r.id];
        }
      });
      Object.values(byGroup).forEach((ids) => {
        for (let i = 0; i < ids.length; i++) {
          for (let j = i + 1; j < ids.length; j++) {
            edges[ids[i]] = [...(edges[ids[i]] || []), ids[j]];
            edges[ids[j]] = [...(edges[ids[j]] || []), ids[i]];
          }
        }
      });

      // BFS
      const seen = new Set<string>();
      const queue = [startRoomId];
      while (queue.length) {
        const node = queue.shift()!;
        if (node === endRoomId) return true;
        if (seen.has(node)) continue;
        seen.add(node);
        (edges[node] || []).forEach((n) => {
          if (!seen.has(n)) queue.push(n);
        });
      }
      return false;
    },
    [],
  );

  // Check if floorplans exist for a building
  const checkFloorplansExist = useCallback(
    async (locationId: string, buildingId: string): Promise<boolean> => {
      if (!locationId || !buildingId) {
        //console.error('Invalid parameters for checkFloorplansExist', { locationId, buildingId });
        return false;
      }

      try {
        //console.log(`Checking floorplans for building ${buildingId} in location ${locationId}`);
        const floorplansSnap = await firestore()
          .collection('locations')
          .doc(locationId)
          .collection('buildingPOIs')
          .doc(buildingId)
          .collection('floorplans')
          .limit(1)
          .get();

        const hasFloorplans = !floorplansSnap.empty;
        //console.log(`Building ${buildingId} has floorplans: ${hasFloorplans}`);
        return hasFloorplans;
      } catch (error) {
        //console.error('Error checking floorplans:', error);
        return false;
      }
    },
    [],
  );

  // Open indoor navigation for a building
  const openIndoorNavigation = useCallback(
    async (
      building: POI,
      navigation: any,
      setErrorPopupMessage: (message: string) => void,
      setShowErrorPopup: (show: boolean) => void,
    ) => {
      const b = building;
      const locationId = b.location;
      const buildingId = b.id;

      // Check if floorplans exist for this building
      const hasFloorplans = await checkFloorplansExist(locationId, buildingId);

      if (!hasFloorplans) {
        // Navigate to unavailable screen
        navigation.navigate('IndoorNavigationUnavailable', {
          buildingId,
          buildingName: building.name || building.title || 'Building',
          locationId,
        });
        return;
      }

      // Attempt to fetch indoor rooms for this building
      let rooms: Room[] = [];
      try {
        // TODO: Implement proper room fetching
        const roomSnap = await firestore()
          .collection(`locations/${locationId}/roomPOIs`)
          .where('buildingId', '==', buildingId)
          .get();

        rooms = roomSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as Room[];

        if (!rooms.length) {
          setErrorPopupMessage('No rooms available for indoor navigation');
          setShowErrorPopup(true);
          return;
        }
      } catch (error) {
        //console.error('Error fetching rooms:', error);
        setErrorPopupMessage('Error loading indoor navigation data');
        setShowErrorPopup(true);
        return;
      }

      setIndoorRooms(rooms);
      setSelectedBuildingForIndoor(building);

      // Default destination = previously chosen or first
      const defaultDest: Room = selectedIndoorRoom
        ? rooms.find((r: Room) => r.id === selectedIndoorRoom.id) || rooms[0]
        : rooms[0];

      // Smart default start: entrance on same floor → any entrance → most connected → first
      const entrances = rooms.filter((r: Room) => r.isEntrance);
      const sameFloorEntrance = defaultDest?.floorId
        ? entrances.find((e: Room) => e.floorId === defaultDest.floorId)
        : null;

      const degreeByRoom = await getRoomDegrees(locationId, buildingId, defaultDest?.floorId);
      const mostConnected = [...rooms].sort(
        (a: Room, b: Room) => (degreeByRoom[b.id] || 0) - (degreeByRoom[a.id] || 0),
      )[0];

      setSelectedStartRoom(sameFloorEntrance || entrances[0] || mostConnected || rooms[0]);
      setSelectedIndoorRoom(defaultDest);
      setShowIndoorPicker(true);
    },
    [selectedIndoorRoom, getRoomDegrees, checkFloorplansExist],
  );

  // Close indoor picker modal
  const closeIndoorPicker = useCallback(() => {
    setShowIndoorPicker(false);
  }, []);

  // Start indoor navigation
  const startIndoorNavigation = useCallback(
    async (
      navigation: any,
      setErrorPopupMessage: (message: string) => void,
      setShowErrorPopup: (show: boolean) => void,
    ) => {
      if (!selectedStartRoom || !selectedIndoorRoom || !selectedBuildingForIndoor) return;

      const b = selectedBuildingForIndoor;
      const connected = await areRoomsConnected(
        b.location,
        b.id,
        selectedStartRoom.id,
        selectedIndoorRoom.id,
        selectedIndoorRoom.floorId,
      );

      if (!connected) {
        setShowIndoorPicker(false);
        setErrorPopupMessage(
          'No saved path between those rooms. Try a different start (e.g., an Entrance) or add missing paths in the floor editor.',
        );
        setShowErrorPopup(true);
        return;
      }

      setShowIndoorPicker(false);

      navigation.navigate('IndoorNavigation', {
        locationId: b.location,
        buildingId: b.id,
        startRoomId: selectedStartRoom.id,
        endRoomId: selectedIndoorRoom.id,
        // floorId: selectedIndoorRoom.floorId, // optional
      });
    },
    [selectedStartRoom, selectedIndoorRoom, selectedBuildingForIndoor, areRoomsConnected],
  );

  return {
    // State
    showIndoorPicker,
    indoorRooms,
    selectedIndoorRoom,
    selectedBuildingForIndoor,
    selectedStartRoom,

    // Functions
    handleIndoorNavFromMap,
    openIndoorNavigation,
    checkFloorplansExist,
    areRoomsConnected,
    closeIndoorPicker,
    startIndoorNavigation,

    // Setters
    setShowIndoorPicker,
    setIndoorRooms,
    setSelectedIndoorRoom,
    setSelectedBuildingForIndoor,
    setSelectedStartRoom,
  };
};
