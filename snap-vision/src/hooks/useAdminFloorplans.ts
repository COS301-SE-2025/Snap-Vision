import { useState } from 'react';
import firestore from '@react-native-firebase/firestore';
import { FloorplanMeta, Location, Building } from '../types/floorplan.types';
import perf from '@react-native-firebase/perf';
import CacheService from '../services/CacheService';

const cacheService = CacheService.getInstance();

// Cache TTL configurations
const CACHE_TTL = {
  LOCATIONS: 15 * 60 * 1000, // 15 minutes
  BUILDINGS: 10 * 60 * 1000, // 10 minutes
  FLOORPLANS: 5 * 60 * 1000, // 5 minutes
};

export const useAdminFloorplans = (role: string | null, adminLocations: string[]) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floorplans, setFloorplans] = useState<FloorplanMeta[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLocations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const cacheKey = 'admin_locations';
      //console.log(' [ADMIN CACHE] Checking cache for locations...');
      
      // Check cache first
      const cached = await cacheService.get<Location[]>(cacheKey, {
        ttl: CACHE_TTL.LOCATIONS,
        userSpecific: true,
      });
      
      if (cached) {
        //console.log(` [ADMIN CACHE] Found ${cached.length} locations in cache`);
        setLocations(cached);
        setIsLoading(false);
        return;
      }
      
      //console.log(' [ADMIN FIRESTORE] Fetching locations from Firestore...');
      const locSnap = await firestore().collection('locations').get();
      const allLocations = locSnap.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name || doc.id,
      }));

      const filteredLocations =
        role === 'editor'
          ? allLocations.filter((loc) => adminLocations.includes(loc.id))
          : allLocations;

      setLocations(filteredLocations);
      
      // Cache the result
      await cacheService.set(cacheKey, filteredLocations, {
        ttl: CACHE_TTL.LOCATIONS,
        userSpecific: true,
      });
      //console.log(` [ADMIN CACHE] Cached ${filteredLocations.length} locations`);
      
    } catch (err) {
      ////consoleerror(err);
      setError('Failed to load locations');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBuildings = async (locationId: string) => {
    if (!locationId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const cacheKey = `admin_buildings:${locationId}`;
      //console.log(` [ADMIN CACHE] Checking cache for buildings in location ${locationId}...`);
      
      // Check cache first
      const cached = await cacheService.get<Building[]>(cacheKey, {
        ttl: CACHE_TTL.BUILDINGS,
        userSpecific: false,
      });
      
      if (cached) {
        //console.log(` [ADMIN CACHE] Found ${cached.length} buildings in cache`);
        setBuildings(cached);
        setIsLoading(false);
        return;
      }
      
      //console.log(` [ADMIN FIRESTORE] Fetching buildings for location ${locationId} from Firestore...`);
      const trace = await perf().newTrace('admin_load_buildings_perf');
      await trace.start();

      const buildingSnap = await firestore()
        .collection(`locations/${locationId}/buildingPOIs`)
        .get();

      const buildingList = buildingSnap.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name || doc.id,
      }));

      setBuildings(buildingList);
      
      // Cache the result
      await cacheService.set(cacheKey, buildingList, {
        ttl: CACHE_TTL.BUILDINGS,
        userSpecific: false,
      });
      //console.log(` [ADMIN CACHE] Cached ${buildingList.length} buildings`);
      
      await trace.stop();
    } catch (err) {
      ////consoleerror(err);
      setError('Failed to load buildings');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFloorplans = async (locationId: string, buildingId: string) => {
    if (!locationId || !buildingId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const cacheKey = `admin_floorplans:${locationId}:${buildingId}`;
      //console.log(` [ADMIN CACHE] Checking cache for floorplans in ${locationId}/${buildingId}...`);
      
      // Check cache first
      const cached = await cacheService.get<FloorplanMeta[]>(cacheKey, {
        ttl: CACHE_TTL.FLOORPLANS,
        userSpecific: false,
      });
      
      if (cached) {
        //console.log(` [ADMIN CACHE] Found ${cached.length} floorplans in cache`);
        setFloorplans(cached);
        setIsLoading(false);
        return;
      }
      
      //console.log(` [ADMIN FIRESTORE] Fetching floorplans for ${locationId}/${buildingId} from Firestore...`);
      const trace = await perf().newTrace('admin_load_floorplans_perf');
      await trace.start();
      
      const snap = await firestore()
        .collection(`locations/${locationId}/buildingPOIs/${buildingId}/floorplans`)
        .get();

      const newFloorplans: FloorplanMeta[] = snap.docs.map((doc) => {
        const data = doc.data();
        return {
          locationId,
          buildingId,
          buildingName: buildings.find((b) => b.id === buildingId)?.name || buildingId,
          floorLabel: data.floorLabel || doc.id,
          downloadURL: data.downloadURL,
          timestamp: data.timestamp?.toDate()?.toISOString() || '',
          id: `${buildingId}_${data.floorLabel || doc.id}`,
        };
      });

      ////consolelog('Floorplans loaded:', newFloorplans);
      setFloorplans(newFloorplans);
      
      // Cache the result
      await cacheService.set(cacheKey, newFloorplans, {
        ttl: CACHE_TTL.FLOORPLANS,
        userSpecific: false,
      });
      //console.log(` [ADMIN CACHE] Cached ${newFloorplans.length} floorplans`);
      
      await trace.stop();
    } catch (err) {
      ////consoleerror(err);
      setError('Failed to load floorplans');
    } finally {
      setIsLoading(false);
    }
  };

  const deleteFloorplan = async (floorplan: FloorplanMeta) => {
    try {
      setIsLoading(true);
      const { locationId, buildingId, floorLabel } = floorplan;

      await firestore()
        .doc(`locations/${locationId}/buildingPOIs/${buildingId}/floorplans/${floorLabel}`)
        .delete();

      const roomSnap = await firestore()
        .collection(`locations/${locationId}/roomPOIs`)
        .where('buildingId', '==', buildingId)
        .where('floorId', '==', floorLabel)
        .get();

      const pathSnap = await firestore()
        .collection(`locations/${locationId}/pathPOIs`)
        .where('buildingId', '==', buildingId)
        .where('floorId', '==', floorLabel)
        .get();

      const batch = firestore().batch();
      roomSnap.forEach((doc) => batch.delete(doc.ref));
      pathSnap.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();

      setFloorplans((prev) => prev.filter((fp) => fp.id !== floorplan.id));

      // Invalidate related caches
      //console.log(' [ADMIN CACHE] Invalidating caches after floorplan deletion...');
      await cacheService.remove(`admin_floorplans:${locationId}:${buildingId}`);
      await cacheService.remove(`rooms:${locationId}:${buildingId}`);
      await cacheService.remove(`paths:${locationId}:${buildingId}`);
      
      return { success: true };
    } catch (err) {
      ////consoleerror(err);
      setError('Failed to delete floorplan');
      return { success: false, error: 'Failed to delete floorplan' };
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh methods that bypass cache
  const refreshLocations = async () => {
    await cacheService.remove('admin_locations', true);
    await fetchLocations();
  };

  const refreshBuildings = async (locationId: string) => {
    await cacheService.remove(`admin_buildings:${locationId}`);
    await fetchBuildings(locationId);
  };

  const refreshFloorplans = async (locationId: string, buildingId: string) => {
    await cacheService.remove(`admin_floorplans:${locationId}:${buildingId}`);
    await fetchFloorplans(locationId, buildingId);
  };

  return {
    locations,
    buildings,
    floorplans,
    isLoading,
    error,
    fetchLocations,
    fetchBuildings,
    fetchFloorplans,
    deleteFloorplan,
    // New refresh methods
    refreshLocations,
    refreshBuildings,
    refreshFloorplans,
  };
};