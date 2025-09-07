import { useState, useCallback } from 'react';
import firestore from '@react-native-firebase/firestore';
import { generatePathSVG, calculatePathDistance, generatePathId } from '../utils/pathUtils';

export interface PathPOI {
  id: string;
  buildingId: string;
  floorId: string;
  startRoomId: string;
  endRoomId: string;
  waypoints: { x: number; y: number }[];
  distance: number;
  accessible: boolean;
  createdAt: string;
}

interface UsePathManagementProps {
  locationId: string;
  buildingId: string;
  floorLabel: string;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

export const usePathManagement = ({
  locationId,
  buildingId,
  floorLabel,
  onError,
  onSuccess,
}: UsePathManagementProps) => {
  const [pathMarkers, setPathMarkers] = useState<PathPOI[]>([]);
  const [isPathMode, setIsPathMode] = useState(false);
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);

  const loadPaths = useCallback(async () => {
    try {
      const snapshot = await firestore()
        .collection(`locations/${locationId}/pathPOIs`)
        .where('buildingId', '==', buildingId)
        .where('floorId', '==', floorLabel)
        .get();

      const paths = snapshot.docs.map((doc) => ({
        ...(doc.data() as PathPOI),
      }));
      setPathMarkers(paths);
      return paths;
    } catch (error) {
      console.error('Error loading paths:', error);
      onError('Failed to load paths');
      return [];
    }
  }, [locationId, buildingId, floorLabel, onError]);

  const togglePathMode = useCallback((webViewRef: any) => {
    const newPathMode = !isPathMode;
    setIsPathMode(newPathMode);
    setSelectedRooms([]);
    setCurrentPath([]);

    webViewRef.current?.injectJavaScript(`
      window.togglePathMode && window.togglePathMode(${newPathMode});
      true;
    `);
  }, [isPathMode]);

  const savePath = useCallback(async (roomMarkers: any[], webViewRef: any) => {
    if (selectedRooms.length !== 2 || currentPath.length < 2) {
      onError('Please select two rooms and add waypoints to create a path');
      return;
    }

    try {
      const pathId = generatePathId(buildingId, floorLabel);

      const startRoom = roomMarkers.find((r) => r.id === selectedRooms[0]);
      const endRoom = roomMarkers.find((r) => r.id === selectedRooms[1]);

      if (!startRoom || !endRoom) {
        onError('Selected rooms not found');
        return;
      }

      const waypoints = [startRoom.coordinates, ...currentPath, endRoom.coordinates];

      const pathPOI: PathPOI = {
        id: pathId,
        buildingId: buildingId,
        floorId: floorLabel,
        startRoomId: selectedRooms[0],
        endRoomId: selectedRooms[1],
        waypoints: waypoints,
        distance: calculatePathDistance(waypoints),
        accessible: true,
        createdAt: new Date().toISOString(),
      };

      await firestore().collection(`locations/${locationId}/pathPOIs`).doc(pathId).set(pathPOI);

      setPathMarkers([...pathMarkers, pathPOI]);

      const pathData = {
        id: pathId,
        d: generatePathSVG(waypoints),
      };

      webViewRef.current?.injectJavaScript(`
        window.drawSinglePath && window.drawSinglePath(${JSON.stringify(pathData)});
        true;
      `);

      setIsPathMode(false);
      setSelectedRooms([]);
      setCurrentPath([]);

      webViewRef.current?.injectJavaScript(`
        window.togglePathMode && window.togglePathMode(false);
        true;
      `);

      onSuccess('Path created successfully');
    } catch (error) {
      console.error('Error saving path:', error);
      onError('Failed to save path');
    }
  }, [selectedRooms, currentPath, buildingId, floorLabel, locationId, pathMarkers, onError, onSuccess]);

  const handleSelectPath = useCallback((pathId: string, webViewRef: any, colors: any) => {
    setSelectedPathId(pathId);
    webViewRef.current?.injectJavaScript(`
      document.querySelectorAll('.path-line').forEach(p => {
        p.setAttribute('stroke', p.getAttribute('data-path-id') === '${pathId}' ? '#FF9800' : '${colors.primary}');
        p.setAttribute('opacity', p.getAttribute('data-path-id') === '${pathId}' ? '1' : '0.8');
        p.setAttribute('stroke-width', p.getAttribute('data-path-id') === '${pathId}' ? '2.5' : '1');
      });
      true;
    `);
  }, []);

  const deleteSelectedPath = useCallback(async (webViewRef: any) => {
    if (!selectedPathId) return;
    try {
      await firestore().collection(`locations/${locationId}/pathPOIs`).doc(selectedPathId).delete();
      setPathMarkers(pathMarkers.filter((p) => p.id !== selectedPathId));
      setSelectedPathId(null);
      webViewRef.current?.injectJavaScript(`
        document.querySelectorAll('.path-line[data-path-id="${selectedPathId}"]').forEach(p => p.remove());
        true;
      `);
      onSuccess('Path deleted successfully');
    } catch (error) {
      onError('Failed to delete path');
    }
  }, [selectedPathId, locationId, pathMarkers, onError, onSuccess]);

  return {
    // State
    pathMarkers,
    isPathMode,
    selectedRooms,
    currentPath,
    selectedPathId,

    // Actions
    loadPaths,
    togglePathMode,
    savePath,
    handleSelectPath,
    deleteSelectedPath,
    setSelectedRooms,
    setCurrentPath,
  };
};
