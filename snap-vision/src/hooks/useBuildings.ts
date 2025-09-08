import { useState, useEffect } from 'react';
import firestore from '@react-native-firebase/firestore';

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

export const useBuildings = () => {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBuildingsWithNavigation();
  }, []);

  const loadBuildingsWithNavigation = async () => {
    try {
      setIsLoading(true);

      const locationSnapshot = await firestore().collection('locations').get();
      const locationIds = locationSnapshot.docs.map((doc) => doc.id);

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
      setBuildings(navigableBuildings);
    } catch (error) {
      console.error('Error loading buildings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { buildings, isLoading };
};
