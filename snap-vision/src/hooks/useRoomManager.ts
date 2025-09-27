import { useState, useEffect, useMemo } from 'react';
import firestore from '@react-native-firebase/firestore';
import CacheService from '../services/CacheService';

const BT = '[BT]';
const cacheService = CacheService.getInstance();

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

  // Cache configuration
  const ROOMS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  // Load rooms and floors with caching
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        console.log(BT, 'Loading rooms for building:', buildingId);

        const cacheKey = `rooms:${locationId}:${buildingId}`;

        // Check cache first
        const cachedRooms = await cacheService.get<RoomPOI[]>(cacheKey, {
          ttl: ROOMS_CACHE_TTL,
          userSpecific: false,
        });

        if (cachedRooms) {
          console.log(BT, `Loaded ${cachedRooms.length} rooms from cache`);
          setAllRooms(cachedRooms);
          
          // Extract floors from cached data
          const uniqueFloors = Array.from(new Set(
            cachedRooms.map((room) => room.floorId).filter(Boolean)
          )).sort();
          setFloors(uniqueFloors);
          
          if (uniqueFloors.length > 0 && !selectedFloorId) {
            setSelectedFloorId(uniqueFloors[0]);
          }
          
          setLoading(false);
          return;
        }

        // Fetch from Firestore
        const roomSnap = await firestore()
          .collection('locations')
          .doc(locationId)
          .collection('roomPOIs')
          .where('buildingId', '==', buildingId)
          .get();

        const roomsData = roomSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as RoomPOI[];
        console.log(BT, `Loaded ${roomsData.length} rooms from Firestore`);
        
        setAllRooms(roomsData);

        // Extract unique floor IDs
        const uniqueFloors = Array.from(
          new Set(roomsData.map((room) => room.floorId).filter(Boolean))
        ).sort();
        console.log(BT, 'Available floors:', uniqueFloors);
        
        setFloors(uniqueFloors);

        // Auto-select first floor if none selected
        if (uniqueFloors.length > 0 && !selectedFloorId) {
          setSelectedFloorId(uniqueFloors[0]);
        }

        // Cache the rooms data
        await cacheService.set(cacheKey, roomsData, {
          ttl: ROOMS_CACHE_TTL,
          userSpecific: false,
        });

      } catch (error) {
        console.error(BT, 'Error loading rooms:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [locationId, buildingId, selectedFloorId]);

  // Get rooms for selected floor
  const roomsForSelectedFloor = useMemo(() => {
    if (!selectedFloorId) return allRooms;
    return allRooms.filter((room) => room.floorId === selectedFloorId);
  }, [allRooms, selectedFloorId]);

  // Refresh rooms data (bypass cache)
  const refreshRooms = async () => {
    const cacheKey = `rooms:${locationId}:${buildingId}`;
    await cacheService.remove(cacheKey);
    
    // Trigger reload by updating a dependency
    setLoading(true);
    try {
      const roomSnap = await firestore()
        .collection('locations')
        .doc(locationId)
        .collection('roomPOIs')
        .where('buildingId', '==', buildingId)
        .get();

      const roomsData = roomSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as RoomPOI[];
      setAllRooms(roomsData);

      // Update cache
      await cacheService.set(cacheKey, roomsData, {
        ttl: ROOMS_CACHE_TTL,
        userSpecific: false,
      });

      console.log(BT, `Refreshed ${roomsData.length} rooms`);
    } catch (error) {
      console.error(BT, 'Error refreshing rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    // Data
    allRooms,
    roomsForSelectedFloor,
    floors,
    selectedFloorId,
    selectedRoom,
    loading,

    // Actions
    setSelectedFloorId,
    setSelectedRoom,
    refreshRooms,
  };
}