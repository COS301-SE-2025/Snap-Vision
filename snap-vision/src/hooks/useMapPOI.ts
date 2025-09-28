import { useState, useEffect, useCallback } from 'react';
import firestore from '@react-native-firebase/firestore';
import perf from '@react-native-firebase/perf';
import CacheService from '../services/CacheService';

const cacheService = CacheService.getInstance();

export interface POI {
  id: string;
  name: string;
  location: string;
  centroid: {
    latitude: number;
    longitude: number;
  };
  floors?: number;
  tags?: Record<string, string>;
  [key: string]: any;
}

interface UseMapPOIReturn {
  // State
  pois: POI[];
  poiSuggestions: POI[];
  selectedPOI: POI | null;
  selectedFeature: POI | null;
  destination: string;

  // Functions
  fetchPOIs: () => Promise<void>;
  filterPOIs: (query: string) => void;
  selectPOI: (poi: POI) => void;
  setSelectedPOI: (poi: POI | null) => void;
  setSelectedFeature: (feature: POI | null) => void;
  setDestination: (destination: string) => void;
  clearPOISuggestions: () => void;
  refreshPOIs: () => Promise<void>;

  // Internal for MapScreen
  sendPOIsToWebView: () => void;
}

export const useMapPOI = (
  isMapReady: boolean,
  webViewRef: React.RefObject<any>,
  setError: (error: string | null) => void,
): UseMapPOIReturn => {
  // POI State
  const [pois, setPOIs] = useState<POI[]>([]);
  const [poiSuggestions, setPOISuggestions] = useState<POI[]>([]);
  const [selectedPOI, setSelectedPOI] = useState<POI | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<POI | null>(null);
  const [destination, setDestination] = useState('');

  // Cache configuration
  const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
  const CACHE_KEY = 'map_pois';

  // Fetch all POIs from Firestore with caching
const fetchPOIs = useCallback(async () => {
  try {
    const locationsSnapshot = await firestore().collection('locations').get();
    const allPOIs: POI[] = [];

    for (const locationDoc of locationsSnapshot.docs) {
      const locationId = locationDoc.id;
      //console.log(`Fetching POIs from: locations/${locationId}/buildingPOIs`);

      const buildingPOIsSnapshot = await firestore()
        .collection(`locations/${locationId}/buildingPOIs`)
        .get();

      buildingPOIsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data?.centroid?.latitude && data?.centroid?.longitude) {
          allPOIs.push({
            ...data,
            id: doc.id,
            location: locationId,
          } as POI);
        }
      });
    }

    //console.log('Total POIs fetched:', allPOIs.length);
    setPOIs(allPOIs);
    
    // Immediately update WebView with fresh data if ready
    if (isMapReady && webViewRef.current) {
      const poisWithHiddenLabels = allPOIs.map((poi) => ({
        ...poi,
        showLabel: false,
      }));
      
      // Clear existing POIs first
      webViewRef.current.injectJavaScript(`
        window.clearAllPOIMarkers && window.clearAllPOIMarkers();
        true;
      `);
      
      // Then display fresh POIs
      setTimeout(() => {
        if (webViewRef.current) {
          const jsPOICode = `
            window.poiData = ${JSON.stringify(poisWithHiddenLabels)};
            window.displayPOIs && window.displayPOIs(${JSON.stringify(poisWithHiddenLabels)});
          `;
          webViewRef.current.injectJavaScript(jsPOICode);
        }
      }, 100);
    }
  } catch (e) {
    //console.error('Failed to fetch POIs:', e);
    setError('Failed to load buildings');
  }
}, [isMapReady, webViewRef, setError]);

  // Force refresh POIs (bypass cache)
  const refreshPOIs = useCallback(async () => {
    await cacheService.remove(CACHE_KEY);
    await fetchPOIs(false);
  }, [fetchPOIs]);

  // Filter POIs based on search query
  const filterPOIs = useCallback(
    (query: string) => {
      if (!query.trim()) {
        setPOISuggestions([]);
        return;
      }

      const filtered = pois.filter((poi) =>
        poi.name.toLowerCase().includes(query.toLowerCase()),
      );
      setPOISuggestions(filtered.slice(0, 10)); // Limit to 10 suggestions
    },
    [pois],
  );

  // Select a POI
  const selectPOI = useCallback((poi: POI) => {
    setSelectedPOI(poi);
    setDestination(poi.name);
    setPOISuggestions([]);
  }, []);

  // Clear POI suggestions
  const clearPOISuggestions = useCallback(() => {
    setPOISuggestions([]);
  }, []);

  // Send POIs to WebView
  const sendPOIsToWebView = useCallback(() => {
    if (isMapReady && webViewRef.current && pois.length > 0) {
      const poisData = JSON.stringify(pois);
      webViewRef.current.injectJavaScript(`
        if (window.setPOIs) {
          window.setPOIs(${poisData});
        }
        true;
      `);
    }
  }, [isMapReady, pois]);

  // Load POIs on mount
  useEffect(() => {
    fetchPOIs();
  }, [fetchPOIs]);

  // Send POIs to WebView when ready
  useEffect(() => {
    sendPOIsToWebView();
  }, [sendPOIsToWebView]);

  return {
    // State
    pois,
    poiSuggestions,
    selectedPOI,
    selectedFeature,
    destination,

    // Functions
    fetchPOIs,
    refreshPOIs,
    filterPOIs,
    selectPOI,
    setSelectedPOI,
    setSelectedFeature,
    setDestination,
    clearPOISuggestions,

    // Internal for MapScreen
    sendPOIsToWebView,
  };
};