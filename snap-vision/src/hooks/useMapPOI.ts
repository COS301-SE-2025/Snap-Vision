import { useState, useEffect, useCallback } from 'react';
import firestore from '@react-native-firebase/firestore';

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

  // Fetch all POIs from Firestore
  const fetchPOIs = useCallback(async () => {
    try {
      const locationsSnapshot = await firestore().collection('locations').get();
      const allPOIs: POI[] = [];

      for (const locationDoc of locationsSnapshot.docs) {
        const locationId = locationDoc.id;
        console.log(`📍 Fetching POIs from: locations/${locationId}/buildingPOIs`);

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

      console.log('✅ Total POIs fetched:', allPOIs.length);
      setPOIs(allPOIs);
    } catch (e) {
      console.error('❌ Failed to fetch POIs:', e);
      setError('Failed to load buildings');
    }
  }, [setError]);

  // Filter POIs based on search query
  const filterPOIs = useCallback(
    (query: string) => {
      if (!query.trim()) {
        setPOISuggestions([]);
        return;
      }
      const filtered = pois.filter(
        (poi) => poi.name && poi.name.toLowerCase().includes(query.toLowerCase()),
      );
      setPOISuggestions(filtered);
    },
    [pois],
  );

  // Handle POI selection (simplified - just update state)
  const selectPOI = useCallback((poi: POI) => {
    setDestination(poi.name);
    setPOISuggestions([]);
    setSelectedFeature(poi);
    setSelectedPOI(poi);
  }, []);

  // Clear POI suggestions
  const clearPOISuggestions = useCallback(() => {
    setPOISuggestions([]);
  }, []);

  // Send POIs to WebView
  const sendPOIsToWebView = useCallback(() => {
    if (isMapReady && pois.length > 0 && webViewRef.current) {
      // Modify the POI data to set labels to empty by default
      const poisWithHiddenLabels = pois.map((poi) => ({
        ...poi,
        showLabel: false, // Add property to control label visibility
      }));

      const jsPOICode = `window.displayPOIs && window.displayPOIs(${JSON.stringify(poisWithHiddenLabels)});`;
      webViewRef.current.injectJavaScript(jsPOICode);
    }
  }, [isMapReady, pois, webViewRef]);

  // Initial POI fetch
  useEffect(() => {
    fetchPOIs();
  }, [fetchPOIs]);

  // Send POIs to WebView when they change and WebView is ready
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
    filterPOIs,
    selectPOI,
    setSelectedPOI,
    setSelectedFeature,
    setDestination,
    clearPOISuggestions,

    // Internal
    sendPOIsToWebView,
  };
};
