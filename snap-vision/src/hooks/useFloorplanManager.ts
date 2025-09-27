import { useState, useEffect } from 'react';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import CacheService from '../services/CacheService';

const cacheService = CacheService.getInstance();

interface UseFloorplanManagerParams {
  locationId: string;
  buildingId: string;
  selectedFloorId: string;
}

// Cache TTL
const FLOORPLAN_URL_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export function useFloorplanManager({
  locationId,
  buildingId,
  selectedFloorId,
}: UseFloorplanManagerParams) {
  const [floorplanUrl, setFloorplanUrl] = useState<string | null>(null);
  const [floorplanLoading, setFloorplanLoading] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!selectedFloorId) {
        setFloorplanUrl(null);
        return;
      }

      try {
        setFloorplanLoading(true);
        setFloorplanUrl(null);

        const cacheKey = `floorplan_url:${locationId}:${buildingId}:${selectedFloorId}`;
        console.log(`🔍 [FLOORPLAN CACHE] Checking cache for ${cacheKey}`);
        
        // Check cache first
        const cached = await cacheService.get<string>(cacheKey, {
          ttl: FLOORPLAN_URL_CACHE_TTL,
          userSpecific: false,
        });
        
        if (cached && !cancelled) {
          console.log(`✅ [FLOORPLAN CACHE] Found URL in cache`);
          setFloorplanUrl(cached);
          setFloorplanLoading(false);
          return;
        }

        console.log(`🔥 [FLOORPLAN] Fetching from Firestore for ${locationId}/${buildingId}/${selectedFloorId}...`);
        
        const fpSnap = await firestore()
          .collection('locations')
          .doc(locationId)
          .collection('buildingPOIs')
          .doc(buildingId)
          .collection('floorplans')
          .where('floorId', '==', selectedFloorId)
          .limit(1)
          .get();

        let url: string | null = null;
        if (!fpSnap.empty) {
          const data: any = fpSnap.docs[0].data();
          url = data?.imageUrl || data?.url || data?.downloadURL || null;

          // If only a storagePath is stored, resolve it
          const storagePath: string | undefined = data?.storagePath;
          if (!url && storagePath) {
            try {
              console.log(`☁️ [FLOORPLAN] Resolving storage path: ${storagePath}`);
              url = await storage().ref(storagePath).getDownloadURL();
            } catch (e) {
              console.warn('getDownloadURL failed for', storagePath, e);
            }
          }
        }

        if (!url) {
          try {
            console.log(`📁 [FLOORPLAN] Trying storage folder fallback...`);
            const baseRef = storage().ref(`floorplans/${locationId}/${buildingId}`);
            const list = await baseRef.listAll();
            const match =
              list.items.find((it) =>
                it.name.toLowerCase().includes(String(selectedFloorId).toLowerCase()),
              ) || list.items[0];
            if (match) {
              url = await match.getDownloadURL();
              console.log(`✅ [FLOORPLAN] Found via storage folder fallback`);
            }
          } catch (e) {
            console.warn('Storage folder fallback failed', e);
          }
        }

        if (!cancelled) {
          setFloorplanUrl(url ?? null);
          
          // Cache the result if we found a URL
          if (url) {
            await cacheService.set(cacheKey, url, {
              ttl: FLOORPLAN_URL_CACHE_TTL,
              userSpecific: false,
            });
            console.log(`💿 [FLOORPLAN CACHE] Cached URL for ${selectedFloorId}`);
          }
        }
      } catch (e) {
        console.warn('Floorplan fetch failed', e);
        if (!cancelled) setFloorplanUrl(null);
      } finally {
        if (!cancelled) setFloorplanLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [locationId, buildingId, selectedFloorId]);

  const refreshFloorplan = async () => {
    const cacheKey = `floorplan_url:${locationId}:${buildingId}:${selectedFloorId}`;
    await cacheService.remove(cacheKey);
    // The useEffect will automatically re-run and fetch fresh data
  };

  return {
    floorplanUrl,
    floorplanLoading,
    refreshFloorplan,
  };
}