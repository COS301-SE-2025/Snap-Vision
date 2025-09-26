import { useState, useCallback } from 'react';
import firestore from '@react-native-firebase/firestore';
import { generateRoomId } from '../utils/pathUtils';

export interface RoomPOI {
  id: string;
  name: string;
  buildingId: string;
  floorId: string;
  coordinates: { x: number; y: number };
  type: string;
  description: string | null;
  isEntrance?: boolean;
  connectorGroupId?: string;
}

export interface RoomData {
  name: string;
  type: string;
  description: string;
  isEntrance: boolean;
  connectorGroupId: string;
}

interface UseRoomManagementProps {
  locationId: string;
  buildingId: string;
  floorLabel: string;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

export const useRoomManagement = ({
  locationId,
  buildingId,
  floorLabel,
  onError,
  onSuccess,
}: UseRoomManagementProps) => {
  const [roomMarkers, setRoomMarkers] = useState<RoomPOI[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentPoint, setCurrentPoint] = useState<{ x: number; y: number } | null>(null);
  const [roomData, setRoomData] = useState<RoomData>({
    name: '',
    type: 'classroom',
    description: '',
    isEntrance: false,
    connectorGroupId: '',
  });
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const loadRoomPOIs = useCallback(async () => {
    try {
      const snapshot = await firestore()
        .collection(`locations/${locationId}/roomPOIs`)
        .where('buildingId', '==', buildingId)
        .where('floorId', '==', floorLabel)
        .get();

      const markers = snapshot.docs.map((doc) => ({
        ...(doc.data() as RoomPOI),
      }));
      setRoomMarkers(markers);
      return markers;
    } catch (error) {
      //consoleerror('Error loading room POIs:', error);
      onError('Failed to load rooms');
      return [];
    }
  }, [locationId, buildingId, floorLabel, onError]);

  const saveRoomPOI = useCallback(
    async (webViewRef: any) => {
      if (!roomData.name.trim()) {
        onError('Room name is required');
        return;
      }
      if (!currentPoint) {
        onError('No location selected for the room.');
        return;
      }

      try {
        let roomId = editingRoomId;

        if (!isEditing) {
          roomId = generateRoomId(buildingId, floorLabel);
        }

        const roomPOI: RoomPOI = {
          id: roomId as string,
          name: roomData.name,
          buildingId: buildingId,
          floorId: floorLabel,
          coordinates: {
            x: currentPoint.x,
            y: currentPoint.y,
          },
          type: roomData.type,
          description: roomData.description || null,
          isEntrance: !!roomData.isEntrance,
          connectorGroupId: roomData.connectorGroupId || '',
        };

        await firestore()
          .collection(`locations/${locationId}/roomPOIs`)
          .doc(roomId as string)
          .set(roomPOI);

        if (isEditing) {
          setRoomMarkers(roomMarkers.map((room) => (room.id === roomId ? roomPOI : room)));
        } else {
          setRoomMarkers([...roomMarkers, roomPOI]);
        }

        webViewRef.current?.injectJavaScript(`
        addMarker("${roomId}", ${currentPoint.x}, ${currentPoint.y}, "${roomData.name}");
        true;
      `);

        resetRoomForm();
        onSuccess(isEditing ? 'Room updated successfully' : 'Room created successfully');
      } catch (error) {
        //consoleerror('Error saving room POI:', error);
        onError('Failed to save room POI');
      }
    },
    [
      roomData,
      currentPoint,
      editingRoomId,
      isEditing,
      buildingId,
      floorLabel,
      locationId,
      roomMarkers,
      onError,
      onSuccess,
    ],
  );

  const deleteRoomPOI = useCallback(
    async (webViewRef: any) => {
      if (!editingRoomId) {
        //consoleerror('No room selected for deletion');
        return;
      }

      try {
        await firestore()
          .collection(`locations/${locationId}/roomPOIs`)
          .doc(editingRoomId)
          .delete();

        setRoomMarkers(roomMarkers.filter((room) => room.id !== editingRoomId));

        webViewRef.current?.injectJavaScript(`
        const markerToRemove = document.getElementById('marker-${editingRoomId}');
        if (markerToRemove) {
          markerToRemove.remove();
        }
        true;
      `);

        resetRoomForm();
        onSuccess('Room deleted successfully');
      } catch (error) {
        //consoleerror('Error deleting room POI:', error);
        onError('Failed to delete room POI');
      }
    },
    [editingRoomId, locationId, roomMarkers, onError, onSuccess],
  );

  const startCreateRoom = useCallback((point: { x: number; y: number }) => {
    setCurrentPoint(point);
    setIsEditing(false);
    setEditingRoomId(null);
    setRoomData({
      name: '',
      type: 'classroom',
      description: '',
      isEntrance: false,
      connectorGroupId: '',
    });
    setIsModalVisible(true);
  }, []);

  const startEditRoom = useCallback(
    (roomId: string) => {
      const roomToEdit = roomMarkers.find((room) => room.id === roomId);
      if (roomToEdit) {
        setEditingRoomId(roomId);
        setIsEditing(true);
        setCurrentPoint(roomToEdit.coordinates);
        setRoomData({
          name: roomToEdit.name,
          type: roomToEdit.type,
          description: roomToEdit.description || '',
          isEntrance: !!roomToEdit.isEntrance,
          connectorGroupId: roomToEdit.connectorGroupId || '',
        });
        setIsModalVisible(true);
      }
    },
    [roomMarkers],
  );

  const resetRoomForm = useCallback(() => {
    setRoomData({
      name: '',
      type: 'classroom',
      description: '',
      isEntrance: false,
      connectorGroupId: '',
    });
    setIsEditing(false);
    setEditingRoomId(null);
    setIsModalVisible(false);
  }, []);

  return {
    // State
    roomMarkers,
    isModalVisible,
    roomData,
    isEditing,
    editingRoomId,

    // Actions
    loadRoomPOIs,
    saveRoomPOI,
    deleteRoomPOI,
    startCreateRoom,
    startEditRoom,
    resetRoomForm,
    setIsModalVisible,
    setRoomData,
  };
};
