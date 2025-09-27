import { useState, useEffect } from 'react';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

interface Building {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  floors: number;
  hasNavigation?: boolean;
  source: string;
  location: string;
}

interface Location {
  id: string;
  name: string;
}

export const useBuildings = () => {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBuildingsWithNavigation();
  }, []);

  const loadBuildingsWithNavigation = async () => {
    try {
      setIsLoading(true);
      ////consolelog('[useBuildings] Starting to load buildings...');

      // Check authentication
      const currentUser = auth().currentUser;
      ////consolelog('[useBuildings] Current user:', currentUser?.uid || 'Not authenticated');

      const locationSnapshot = await firestore().collection('locations').get();
      const locationIds = locationSnapshot.docs.map((doc) => doc.id);
      ////consolelog('[useBuildings] Found location IDs:', locationIds);

      // Extract location data for LocationSelector
      const locationData: Location[] = locationSnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name || doc.id,
      }));
      ////consolelog('[useBuildings] Location data:', locationData);
      setLocations(locationData);

      const allBuildings: Building[] = [];
      const buildingsFromRooms = new Map<string, Building>();

      for (const locationId of locationIds) {
        const buildingPOIsSnap = await firestore()
          .collection('locations')
          .doc(locationId)
          .collection('buildingPOIs')
          .get();

        buildingPOIsSnap.forEach((doc) => {
          const data = doc.data();
          allBuildings.push({
            id: doc.id,
            name: data.name || doc.id,
            latitude: data.centroid?.latitude ?? 0,
            longitude: data.centroid?.longitude ?? 0,
            floors: data.floors || 1,
            source: 'buildingPOIs',
            location: locationId,
          });
        });

        const roomPOIsSnap = await firestore()
          .collection('locations')
          .doc(locationId)
          .collection('roomPOIs')
          .get();

        roomPOIsSnap.forEach((doc) => {
          const data = doc.data();
          const buildingId = data.buildingId;
          if (buildingId && !buildingsFromRooms.has(buildingId)) {
            buildingsFromRooms.set(buildingId, {
              id: buildingId,
              name: buildingId,
              latitude: 0,
              longitude: 0,
              floors: 1,
              hasNavigation: true,
              source: 'roomPOIs',
              location: locationId,
            });
          }
        });
      }

      // Add room-only buildings if they don’t exist in buildingPOIs
      buildingsFromRooms.forEach((roomBuilding, buildingId) => {
        const exists = allBuildings.some((b) => b.id === buildingId || b.name === buildingId);
        if (!exists) {
          allBuildings.push(roomBuilding);
        }
      });

      const buildingsWithNavigation = await Promise.all(
        allBuildings.map(async (building) => {
          if (building.source === 'roomPOIs') {
            return building;
          }

          const roomSnapById = await firestore()
            .collection('locations')
            .doc(building.location)
            .collection('roomPOIs')
            .where('buildingId', '==', building.id)
            .limit(1)
            .get();

          const roomSnapByName = await firestore()
            .collection('locations')
            .doc(building.location)
            .collection('roomPOIs')
            .where('buildingId', '==', building.name)
            .limit(1)
            .get();

          return {
            ...building,
            hasNavigation: !roomSnapById.empty || !roomSnapByName.empty,
          };
        }),
      );

      const navigableBuildings = buildingsWithNavigation.filter((b) => b.hasNavigation);
      ////consolelog('[useBuildings] Final navigable buildings:', navigableBuildings.length);
      setBuildings(navigableBuildings);
    } catch (error) {
      ////consoleerror('Error loading buildings:', error);
      setBuildings([]); // Clear buildings on error to avoid stale data
    } finally {
      setIsLoading(false);
      ////consolelog('[useBuildings] Loading completed');
    }
  };

  return { buildings, locations, isLoading };
};
