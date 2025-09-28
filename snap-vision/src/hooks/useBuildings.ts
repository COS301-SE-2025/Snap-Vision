import { useState, useEffect } from 'react';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import CacheService from '../services/CacheService';

const cacheService = CacheService.getInstance();

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

// Cache TTL configurations
const BUILDINGS_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const LOCATIONS_CACHE_TTL = 15 * 60 * 1000; // 15 minutes

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
      if (!currentUser) {
        //console.log(' [BUILDINGS] No authenticated user');
        setIsLoading(false);
        return;
      }

      // Check cache for locations
      const locationsCacheKey = 'buildings_locations_data';
      //console.log(' [BUILDINGS CACHE] Checking cache for locations...');
      
      let locationData: Location[] | null = await cacheService.get<Location[]>(locationsCacheKey, {
        ttl: LOCATIONS_CACHE_TTL,
        userSpecific: false,
      });

      let locationIds: string[] = [];

      if (locationData) {
        //console.log(` [BUILDINGS CACHE] Found ${locationData.length} locations in cache`);
        setLocations(locationData);
        locationIds = locationData.map(l => l.id);
      } else {
        //console.log(' [BUILDINGS FIRESTORE] Fetching locations from Firestore...');
        // Fetch locations from Firestore
        const locationSnapshot = await firestore().collection('locations').get();
        locationIds = locationSnapshot.docs.map((doc) => doc.id);
        
        locationData = locationSnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || doc.id,
        }));
        
        setLocations(locationData);
        
        // Cache locations
        await cacheService.set(locationsCacheKey, locationData, {
          ttl: LOCATIONS_CACHE_TTL,
          userSpecific: false,
        });
        //console.log(` [BUILDINGS CACHE] Cached ${locationData.length} locations`);
      }

      // Check cache for buildings
      const buildingsCacheKey = `buildings_with_nav:${locationIds.join(',')}`;
      //console.log(` [BUILDINGS CACHE] Checking cache for buildings with key: ${buildingsCacheKey.substring(0, 50)}...`);
      
      const cachedBuildings = await cacheService.get<Building[]>(buildingsCacheKey, {
        ttl: BUILDINGS_CACHE_TTL,
        userSpecific: false,
      });

      if (cachedBuildings) {
        //console.log(` [BUILDINGS CACHE] Found ${cachedBuildings.length} buildings in cache`);
        setBuildings(cachedBuildings);
        setIsLoading(false);
        return;
      }

      //console.log(' [BUILDINGS FIRESTORE] Fetching buildings from Firestore...');
      // Fetch buildings from Firestore
      const allBuildings: Building[] = [];
      const buildingsFromRooms = new Map<string, Building>();

      for (const locationId of locationIds) {
        //console.log(` [BUILDINGS] Processing location: ${locationId}`);
        
        // Fetch buildingPOIs
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

        // Fetch buildings from roomPOIs
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

      // Add room-only buildings if they don't exist in buildingPOIs
      buildingsFromRooms.forEach((roomBuilding, buildingId) => {
        const exists = allBuildings.some((b) => b.id === buildingId || b.name === buildingId);
        if (!exists) {
          allBuildings.push(roomBuilding);
        }
      });

      //console.log(` [BUILDINGS] Checking navigation for ${allBuildings.length} buildings...`);
      
      // Check navigation availability for buildings
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
      
      // Cache the buildings
      await cacheService.set(buildingsCacheKey, navigableBuildings, {
        ttl: BUILDINGS_CACHE_TTL,
        userSpecific: false,
      });
      //console.log(` [BUILDINGS CACHE] Cached ${navigableBuildings.length} buildings`);

    } catch (error) {
      ////consoleerror('Error loading buildings:', error);
      setBuildings([]); // Clear buildings on error to avoid stale data
    } finally {
      setIsLoading(false);
    }
  };

  const refreshBuildings = async () => {
    //console.log('[BUILDINGS] Refreshing buildings (bypassing cache)...');
    
    // Clear relevant caches
    await cacheService.remove('buildings_locations_data');
    const locationIds = locations.map(l => l.id);
    if (locationIds.length > 0) {
      const buildingsCacheKey = `buildings_with_nav:${locationIds.join(',')}`;
      await cacheService.remove(buildingsCacheKey);
    }
    
    // Reload
    await loadBuildingsWithNavigation();
  };

  return {
    buildings,
    locations,
    isLoading,
    refreshBuildings,
    // Expose the main loading function for manual refresh
    loadBuildings: loadBuildingsWithNavigation,
  };
};