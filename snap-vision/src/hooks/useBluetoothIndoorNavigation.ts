import { useState, useMemo } from 'react';
import { useRoomManager, RoomPOI } from './useRoomManager';
import { useFloorplanManager } from './useFloorplanManager';
import { useBeaconManager } from './useBeaconManager';
import { useNavigationManager } from './useNavigationManager';

interface UseBluetoothIndoorNavigationProps {
  buildingId: string;
  buildingName: string;
  locationId: string;
}

interface UseBluetoothIndoorNavigationReturn {
  // Managers
  roomManager: ReturnType<typeof useRoomManager>;
  floorplanManager: ReturnType<typeof useFloorplanManager>;
  beaconManager: ReturnType<typeof useBeaconManager>;
  navigationManager: ReturnType<typeof useNavigationManager>;

  // Computed values
  dotPx: { left: number; top: number } | null;

  // State
  showRoomsList: boolean;
  setShowRoomsList: (show: boolean) => void;
  mapSize: { width: number; height: number };
  setMapSize: (size: { width: number; height: number }) => void;
  showPOIPopup: boolean;
  setShowPOIPopup: (show: boolean) => void;
  showPOIInfoModal: boolean;
  setShowPOIInfoModal: (show: boolean) => void;
  selectedPOI: RoomPOI | null;
  setSelectedPOI: (poi: RoomPOI | null) => void;
  showDirectionsModal: boolean;
  setShowDirectionsModal: (show: boolean) => void;

  // Event handlers
  handleRoomSelect: (roomId: string) => void;
  handleNavigateHere: () => Promise<void>;
  handleMoreInfo: () => void;
  handleClosePOIPopup: () => void;
  handleShowRoomsList: () => void;
  handleRoomListSelect: (room: any) => void;
}

export const useBluetoothIndoorNavigation = ({
  buildingId,
  buildingName,
  locationId,
}: UseBluetoothIndoorNavigationProps): UseBluetoothIndoorNavigationReturn => {
  const [showRoomsList, setShowRoomsList] = useState(false);
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });

  // POI popup state
  const [showPOIPopup, setShowPOIPopup] = useState(false);
  const [showPOIInfoModal, setShowPOIInfoModal] = useState(false);
  const [selectedPOI, setSelectedPOI] = useState<RoomPOI | null>(null);

  // Navigation state
  const [showDirectionsModal, setShowDirectionsModal] = useState(false);

  // Custom hooks for managing different aspects
  const roomManager = useRoomManager({ locationId, buildingId });
  const floorplanManager = useFloorplanManager({
    locationId,
    buildingId,
    selectedFloorId: roomManager.selectedFloorId,
  });
  const beaconManager = useBeaconManager({
    locationId,
    buildingId,
    selectedFloorId: roomManager.selectedFloorId,
  });
  const navigationManager = useNavigationManager({
    locationId,
    buildingId,
    currentPosition: beaconManager.currentPos,
    allRooms: roomManager.allRooms,
  });

  // Debug navigation manager state
  console.log('[HOOK] Navigation manager state:', {
    isNavigating: navigationManager.isNavigating,
    destination: navigationManager.destination?.name,
    stepsCount: navigationManager.steps.length,
    pathPOIsLoaded: navigationManager.pathPOIsLoaded,
  });

  const dotPx = useMemo(() => {
    if (!beaconManager.currentPos || !mapSize.width || !mapSize.height) return null;
    return {
      left: beaconManager.currentPos.x * mapSize.width,
      top: beaconManager.currentPos.y * mapSize.height,
    };
  }, [beaconManager.currentPos, mapSize]);

  const handleRoomSelect = (roomId: string) => {
    const room = roomManager.allRooms.find((r) => r.id === roomId);
    if (room) {
      setSelectedPOI(room);
      setShowPOIPopup(true);
      // Don't set as selectedRoom to avoid destination color
    }
  };

  const handleNavigateHere = async () => {
    console.log('[HOOK] handleNavigateHere called');
    console.log('[HOOK] selectedPOI:', selectedPOI);
    console.log('[HOOK] Navigation manager isNavigating:', navigationManager.isNavigating);

    if (selectedPOI) {
      console.log('Starting navigation to:', selectedPOI.name);
      const success = await navigationManager.startNavigation(selectedPOI);
      console.log('[HOOK] Navigation start result:', success);

      if (success) {
        console.log('[HOOK] Navigation started successfully, closing popup');
        setShowPOIPopup(false);
        // Optionally show directions modal
        // setShowDirectionsModal(true);
      } else {
        console.warn('Failed to start navigation');
        // Could show an error message here
      }
    } else {
      console.warn('[HOOK] No selectedPOI available');
    }
  };

  const handleMoreInfo = () => {
    setShowPOIPopup(false);
    setShowPOIInfoModal(true);
  };

  const handleClosePOIPopup = () => {
    setShowPOIPopup(false);
    setSelectedPOI(null);
  };

  const handleShowRoomsList = () => {
    setShowRoomsList(true);
  };

  const handleRoomListSelect = (room: any) => {
    // Don't set as selectedRoom to avoid destination color
    setSelectedPOI(room);
    setShowPOIPopup(true);
    setShowRoomsList(false); // Close the rooms list
  };

  return {
    // Managers
    roomManager,
    floorplanManager,
    beaconManager,
    navigationManager,

    // Computed values
    dotPx,

    // State
    showRoomsList,
    setShowRoomsList,
    mapSize,
    setMapSize,
    showPOIPopup,
    setShowPOIPopup,
    showPOIInfoModal,
    setShowPOIInfoModal,
    selectedPOI,
    setSelectedPOI,
    showDirectionsModal,
    setShowDirectionsModal,

    // Event handlers
    handleRoomSelect,
    handleNavigateHere,
    handleMoreInfo,
    handleClosePOIPopup,
    handleShowRoomsList,
    handleRoomListSelect,
  };
};
