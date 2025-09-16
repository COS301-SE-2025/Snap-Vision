import { useState, useEffect, useMemo } from 'react';
import firestore from '@react-native-firebase/firestore';

const BT = '[BT]';

export type RoomPOI = {
  id: string;
  name: string;
  buildingId: string;
  floorId: string;
  coordinates: { x: number; y: number };
  type?: string;
  description?: string | null;
  isEntrance?: boolean;
};

interface UseRoomManagerParams {
  locationId: string;
  buildingId: string;
}

export function useRoomManager({ locationId, buildingId }: UseRoomManagerParams) {
  const [allRooms, setAllRooms] = useState<RoomPOI[]>([]);
  const [floors, setFloors] = useState<string[]>([]);
  const [selectedFloorId, setSelectedFloorId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<RoomPOI | null>(null);

  // Load rooms and floors
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        console.log(BT, 'Loading rooms for building:', buildingId);
        
        const roomSnap = await firestore()
          .collection('locations')
          .doc(locationId)
          .collection('roomPOIs')
          .where('buildingId', '==', buildingId)
          .get();
          
        const roomsData = roomSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as RoomPOI[];
        setAllRooms(roomsData);
        
        const floorSet = Array.from(new Set(roomsData.map((r) => r.floorId))).sort();
        setFloors(floorSet);
        if (floorSet.length > 0) setSelectedFloorId(floorSet[0]);
        
        console.log(BT, 'Rooms loaded:', roomsData.length, 'Floors:', floorSet);
      } catch (e) {
        console.error(BT, 'Rooms load error:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [buildingId, locationId]);

  // Get rooms for selected floor
  const roomsOnSelectedFloor = useMemo(
    () => allRooms.filter((r) => r.floorId === selectedFloorId),
    [allRooms, selectedFloorId],
  );

  const handleRoomSelect = (roomId: string) => {
    const room = allRooms.find((r) => r.id === roomId);
    if (room) {
      setSelectedRoom(room);
      console.log(BT, 'Room selected:', room.name);
    }
  };

  return {
    allRooms,
    floors,
    selectedFloorId,
    setSelectedFloorId,
    loading,
    selectedRoom,
    setSelectedRoom,
    roomsOnSelectedFloor,
    handleRoomSelect,
  };
}