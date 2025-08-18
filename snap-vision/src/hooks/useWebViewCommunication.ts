import { useCallback, useEffect } from 'react';
import { WebView as WebViewType } from 'react-native-webview';
import { POI } from './useMapPOI';

export interface UseWebViewCommunicationReturn {
  // Main message handler
  handleWebViewMessage: (event: any) => Promise<void>;

  // WebView control functions
  refreshMap: () => void;
  cancelRoute: () => void;
  toggleMapRotation: () => void;

  // JavaScript injection utilities
  injectJavaScript: (code: string) => void;
  clearRoute: () => void;
  showAllPOIMarkers: () => void;
  drawRoute: (coordinates: any[]) => void;
  displayPOIs: (pois: POI[]) => void;
}

export const useWebViewCommunication = (
  // WebView reference
  webViewRef: React.RefObject<any>,

  // Map state
  isMapReady: boolean,
  setIsMapReady: (ready: boolean) => void,

  // Location dependencies
  currentLocation: any,
  sendLocationToWebView: (lat: number, lng: number, center: boolean) => void,
  requestLocation: () => void,
  setCurrentLocation: (location: any) => void,

  // Navigation dependencies
  isNavigating: boolean,
  routeCoordinates: any[],
  stopNavigation: () => void,
  fetchRoute: (coords: [number, number]) => void,

  // POI dependencies
  pois: POI[],
  hookSelectedPOI: POI | null,
  selectPOI: (poi: POI) => void,
  setHookSelectedPOI: (poi: POI | null) => void,
  setSelectedFeature: (feature: any) => void,
  setDestination: (dest: string) => void,
  setDestinationCoords: (coords: [number, number] | null) => void,

  // Navigation state setters
  setRouteProgress: (progress: number) => void,
  setDistanceToDestination: (distance: number | null) => void,
  setEstimatedTime: (time: number | null) => void,
  setSteps: (steps: any[]) => void,
  setCurrentStep: (step: number) => void,
  setDistanceWalked: (distance: number) => void,
  setStartLocation: (location: any) => void,
  setOriginalRouteDistance: (distance: number | null) => void,
  setHasReachedDestination: (reached: boolean) => void,

  // Admin dependencies
  handleAdminWebViewMessage: (
    parsed: any,
    pois: POI[],
    webViewRef: React.RefObject<any>,
  ) => boolean,
  injectAdminHandlers: (webViewRef: React.RefObject<any>, isMapReady: boolean) => void,

  // Indoor navigation
  handleIndoorNavFromMap: (
    parsed: any,
    hookSelectedPOI: POI | null,
    pois: POI[],
    webViewRef: React.RefObject<any>,
    navigation: any,
    setError: (error: string | null) => void,
  ) => void,
  navigation: any,

  // UI state setters
  setStatus: (status: string) => void,
  setError: (error: string | null) => void,
  setTempMessage: (message: string) => void,
  setShowLocationRefreshPopup: (show: boolean) => void,
  setErrorPopupMessage: (message: string) => void,
  setShowErrorPopup: (show: boolean) => void,
): UseWebViewCommunicationReturn => {
  // JavaScript injection utility
  const injectJavaScript = useCallback(
    (code: string) => {
      if (webViewRef.current && isMapReady) {
        webViewRef.current.injectJavaScript(code);
      }
    },
    [webViewRef, isMapReady],
  );

  // Clear route from map
  const clearRoute = useCallback(() => {
    injectJavaScript('window.clearRoute && window.clearRoute();');
  }, [injectJavaScript]);

  // Show all POI markers
  const showAllPOIMarkers = useCallback(() => {
    injectJavaScript('window.showAllPOIMarkers && window.showAllPOIMarkers();');
  }, [injectJavaScript]);

  // Draw route on map
  const drawRoute = useCallback(
    (coordinates: any[]) => {
      if (coordinates.length > 0) {
        const routeCode = `window.drawRoute && window.drawRoute(${JSON.stringify(coordinates)});`;
        injectJavaScript(routeCode);
      }
    },
    [injectJavaScript],
  );

  // Display POIs on map
  const displayPOIs = useCallback(
    (poisToDisplay: POI[]) => {
      const jsPOICode = `window.displayPOIs && window.displayPOIs(${JSON.stringify(poisToDisplay)});`;
      injectJavaScript(jsPOICode);
    },
    [injectJavaScript],
  );

  // Manual map refresh (reload WebView)
  const refreshMap = useCallback(() => {
    setShowLocationRefreshPopup(false); // Close the popup
    setTempMessage('Refreshing map...');
    setIsMapReady(false);
    setCurrentLocation(null);
    setError(null);

    // Reload the WebView
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  }, [
    webViewRef,
    setShowLocationRefreshPopup,
    setTempMessage,
    setIsMapReady,
    setCurrentLocation,
    setError,
  ]);

  // Cancel current route
  const cancelRoute = useCallback(() => {
    // Clear all route-related state
    setDestination('');
    setDestinationCoords(null);
    setSelectedFeature(null);
    setHookSelectedPOI(null);

    // Use hook setters to reset navigation state
    setRouteProgress(0);
    setDistanceToDestination(null);
    setEstimatedTime(null);
    setSteps([]);
    setCurrentStep(0);
    setDistanceWalked(0);
    setStartLocation(null);
    setOriginalRouteDistance(null);
    setHasReachedDestination(false);

    // Stop navigation if it's active
    if (isNavigating) {
      stopNavigation();
    }

    // Clear route from map
    clearRoute();

    // Reset status
    setStatus('Route cancelled');

    // Clear any error messages
    setError(null);

    // Hide POI markers and show all markers again
    showAllPOIMarkers();
  }, [
    setDestination,
    setDestinationCoords,
    setSelectedFeature,
    setHookSelectedPOI,
    setRouteProgress,
    setDistanceToDestination,
    setEstimatedTime,
    setSteps,
    setCurrentStep,
    setDistanceWalked,
    setStartLocation,
    setOriginalRouteDistance,
    setHasReachedDestination,
    isNavigating,
    stopNavigation,
    clearRoute,
    setStatus,
    setError,
    showAllPOIMarkers,
  ]);

  // Toggle map rotation
  const toggleMapRotation = useCallback(() => {
    injectJavaScript(`
      if (window.toggleMapRotation) {
        window.toggleMapRotation();
      }
    `);
    setTempMessage('Toggled map rotation');
  }, [injectJavaScript, setTempMessage]);

  // Main WebView message handler
  const handleWebViewMessage = useCallback(
    async (event: any) => {
      console.log('[WebView message]', event.nativeEvent.data);

      try {
        const data = event.nativeEvent.data;

        // === Handle simple message ===
        if (data === 'MAP_READY') {
          console.log('🗺️ Map is ready!');
          setStatus('Map loaded');
          setIsMapReady(true);

          // If we already have a location, send it to the map immediately
          if (currentLocation) {
            console.log('📍 Sending existing location to newly ready map:', currentLocation);
            sendLocationToWebView(currentLocation.latitude, currentLocation.longitude, true);
          }

          // Request fresh location
          requestLocation();

          if (routeCoordinates.length > 0) {
            drawRoute(routeCoordinates);
          }
          return;
        }

        // === Handle JSON message ===
        const parsed = JSON.parse(data);

        // Try to handle admin messages first
        if (handleAdminWebViewMessage(parsed, pois, webViewRef)) {
          return; // Admin message was handled
        }

        switch (parsed.type) {
          case 'ERROR':
            setError(parsed.message);
            break;

          case 'POI_SELECTED':
            const selectedPOI = parsed.poi;

            if (isNavigating) {
              stopNavigation();
            }

            clearRoute();

            // Use the hook's selectPOI function instead of manual state updates
            selectPOI(selectedPOI);

            if (currentLocation) {
              fetchRoute([selectedPOI.centroid.longitude, selectedPOI.centroid.latitude]);
            }
            break;

          case 'INDOOR_NAV_FROM_MAP': {
            handleIndoorNavFromMap(parsed, hookSelectedPOI, pois, webViewRef, navigation, setError);
            break;
          }

          default:
          // console.log('Unknown message type from WebView:', parsed.type);
        }
      } catch (e) {
        // console.log('WebView message error:', event.nativeEvent.data);
      }
    },
    [
      setStatus,
      setIsMapReady,
      currentLocation,
      sendLocationToWebView,
      requestLocation,
      routeCoordinates,
      drawRoute,
      handleAdminWebViewMessage,
      pois,
      webViewRef,
      setError,
      isNavigating,
      stopNavigation,
      clearRoute,
      selectPOI,
      fetchRoute,
      handleIndoorNavFromMap,
      hookSelectedPOI,
      navigation,
    ],
  );

  // Inject admin handlers and POI display when map is ready
  useEffect(() => {
    if (isMapReady && webViewRef.current) {
      // Use the admin hook's handler injection
      injectAdminHandlers(webViewRef, isMapReady);

      // Re-display POIs to update popups/buttons
      displayPOIs(pois);
    }
  }, [isMapReady, webViewRef, injectAdminHandlers, displayPOIs, pois]);

  return {
    // Main message handler
    handleWebViewMessage,

    // WebView control functions
    refreshMap,
    cancelRoute,
    toggleMapRotation,

    // JavaScript injection utilities
    injectJavaScript,
    clearRoute,
    showAllPOIMarkers,
    drawRoute,
    displayPOIs,
  };
};
