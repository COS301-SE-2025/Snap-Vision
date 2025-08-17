import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  PermissionsAndroid,
  Pressable,
  ScrollView,
} from 'react-native';
import { WebView as WebViewType } from 'react-native-webview';
import firestore from '@react-native-firebase/firestore';
import Tts from 'react-native-tts';
import MapWebView from '../components/organisms/MapWebView';
import CrowdReportModal from '../components/molecules/CrowdReportModal';
import AdminPOIModal from '../components/molecules/AdminPOIModal';
import AdminActionsModal from '../components/molecules/AdminActionsModal';
import StatusOverlay from '../components/atoms/StatusOverlay';
import StandardPopup from '../components/atoms/StandardPopup';
import DestinationSearch from '../components/molecules/DestinationSearch';
import MapActionsPanel from '../components/organisms/MapActionsPanel';
import NavigationPanel from '../components/organisms/NavigationPanel';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import DirectionsModal from '../components/organisms/DirectionsModal';
import { useRoute, useNavigation } from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import { addRecentlyVisitedPOI, Visit } from '../services/firebase/recentlyVService';

import { useBadges } from '../context/BadgeContext';
import { useAccessibility } from '../context/AccessibilityContext';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import ARNavigationOverlay from '../components/organisms/ARNavigationOverlay';
import { useCompass } from '../hooks/useCompass'; // Needed for AR navigation functionality
import { useMapLocation } from '../hooks/useMapLocation';
import { useMapNavigation } from '../hooks/useMapNavigation';
import { useMapPOI } from '../hooks/useMapPOI';
import { useMapAdmin } from '../hooks/useMapAdmin';
import { requestCameraPermission } from '../utils/cameraPermissions';
import { Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
// import { ROUTING_API } from '@env';

type MapScreenParams = {
  lat?: string;
  lng?: string;
};

const ROUTING_API_BASE = 'http://192.168.0.197:3000'; // <-- Use your correct backend IP here

// emulator: 10.0.2.2
// B home:  192.168.56.1
// L wifi: 192.168.0.127
// T home: 192.168.0.133
// T data: 192.168.43.155
// Th home: 10.0.0.9
// T Durban: 192.168.1.93
// S home:  192.168.0.197
// L harties: 192.168.101.238

const MapScreen = () => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const { isHapticFeedbackEnabled } = useAccessibility();
  const { setNavigationStartTime } = useBadges();
  const { unlock, incrementRoutes } = useBadges();
  

  const webViewRef = useRef<WebViewType>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showDirectionsSheet, setShowDirectionsSheet] = useState(false);
  const [showDestinationReachedPopup, setShowDestinationReachedPopup] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  
  // share location
  const route = useRoute();
  const params = route.params as MapScreenParams;
  const [hasHandledDeepLink, setHasHandledDeepLink] = useState(false);

  // Use the location hook
  const {
    currentLocation,
    status,
    error,
    isRefreshingLocation,
    shouldCenterMap,
    requestLocation,
    refreshLocation,
    sendLocationToWebView,
    setShouldCenterMap,
    setCurrentLocation,
    setStatus,
    setError,
  } = useMapLocation(isMapReady, webViewRef, isNavigating);

  // Use the POI hook first (needed by navigation hook)
  const {
    pois,
    poiSuggestions,
    selectedPOI: hookSelectedPOI,
    selectedFeature,
    destination,
    fetchPOIs,
    filterPOIs,
    selectPOI,
    setSelectedPOI: setHookSelectedPOI,
    setSelectedFeature,
    setDestination,
    clearPOISuggestions,
  } = useMapPOI(
    isMapReady,
    webViewRef,
    setError,
  );

  // Use the navigation hook
  const {
    steps,
    currentStep,
    routeProgress,
    distanceToDestination,
    estimatedTime,
    hasReachedDestination,
    distanceWalked,
    originalRouteDistance,
    startLocation,
    isRouteLoading,
    destinationCoords,
    routeCoordinates,
    fetchRoute,
    startNavigation,
    stopNavigation,
    destinationReached,
    rerouteFromCurrentLocation,
    updateNavigationProgress,
    startNavigationTracking,
    stopNavigationTracking,
    setSteps,
    setCurrentStep,
    setRouteProgress,
    setDistanceToDestination,
    setEstimatedTime,
    setHasReachedDestination,
    setDistanceWalked,
    setOriginalRouteDistance,
    setStartLocation,
    setDestinationCoords,
  } = useMapNavigation(
    currentLocation,
    isMapReady,
    webViewRef,
    setStatus,
    setError,
    isHapticFeedbackEnabled,
    isVoiceEnabled,
    hookSelectedPOI,
    (badgeId: string) => unlock(badgeId as any),
    incrementRoutes,
    setNavigationStartTime,
    setShowDestinationReachedPopup,
    setShowDirectionsSheet,
    isNavigating,
    setIsNavigating,
  );

  // Helper functions for admin hook
  const showErrorPopupHelper = (message: string) => {
    setErrorPopupMessage(message);
    setShowErrorPopup(true);
  };
  
  const showSuccessPopupHelper = (message: string) => {
    setSuccessPopupMessage(message);
    setShowSuccessPopup(true);
  };
  
  const showConfirmationPopupHelper = (data: { title: string; message: string; onConfirm: () => void }) => {
    setConfirmationPopupData(data);
    setShowConfirmationPopup(true);
  };

  // Use the admin hook
  const {
    isAdmin,
    userRole,
    adminLocations,
    availableLocations,
    selectedLocation,
    showAddPOIModal,
    showEditPOIModal,
    showAdminActions,
    addPOICoords,
    buildingName,
    numberOfFloors,
    editingPOI,
    newName,
    newFloors,
    adminActionPOI,
    openAddBuildingModal,
    openEditBuildingModal,
    confirmDeleteBuilding,
    submitNewBuilding,
    submitEditBuilding,
    deleteBuilding,
    enableAdminPOICreation,
    handleAdminWebViewMessage,
    validateAdminPermission,
    setShowAddPOIModal,
    setShowEditPOIModal,
    setShowAdminActions,
    setBuildingName,
    setNumberOfFloors,
    setNewName,
    setNewFloors,
    setSelectedLocation,
    setAdminActionPOI,
    injectAdminHandlers,
  } = useMapAdmin(
    fetchPOIs,
    setStatus,
    setError,
    showErrorPopupHelper,
    showSuccessPopupHelper,
    showConfirmationPopupHelper,
  );

  const [showCrowdPopup, setShowCrowdPopup] = useState(false);
  const [selectedDensity, setSelectedDensity] = useState('moderate');
  const [showShareTooltip, setShowShareTooltip] = useState(false);
  const [showReportTooltip, setShowReportTooltip] = useState(false);

  // Turn-by-turn state (non-navigation related)
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [shouldStartTTS, setShouldStartTTS] = useState(false);

  //indoor
  // const navigation = useNavigation<any>();

  // crowd reports
  const [crowdReports, setCrowdReports] = useState<Record<string, any>>({});

  const [tempMessage, setTempMessage] = useState<string>('');

  // AR Navigation state
  const [showAR, setShowAR] = useState(false);
  const deviceHeading = useCompass(); // This is needed for AR navigation functionality
  const [isNavigationMinimized, setIsNavigationMinimized] = useState(false);

  //haptic feedback options
  const hapticOptions = {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
  };

  //Indoor

  const [showIndoorPicker, setShowIndoorPicker] = useState(false);
  const [indoorRooms, setIndoorRooms] = useState<any[]>([]);
  const [selectedIndoorRoom, setSelectedIndoorRoom] = useState<any | null>(null);
  const [selectedBuildingForIndoor, setSelectedBuildingForIndoor] = useState<any | null>(null);
  const [selectedStartRoom, setSelectedStartRoom] = useState<any | null>(null);
  const navigation = useNavigation<any>();

  // Popup states
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorPopupMessage, setErrorPopupMessage] = useState('');
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successPopupMessage, setSuccessPopupMessage] = useState('');
  const [showConfirmationPopup, setShowConfirmationPopup] = useState(false);
  const [confirmationPopupData, setConfirmationPopupData] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const [showLocationRefreshPopup, setShowLocationRefreshPopup] = useState(false);

  // Inject admin handlers into the WebView
  useEffect(() => {
    if (isMapReady && webViewRef.current) {
      // Use the admin hook's handler injection
      injectAdminHandlers(webViewRef, isMapReady);

      // Re-display POIs to update popups/buttons
      const jsPOICode = `window.displayPOIs && window.displayPOIs(${JSON.stringify(pois)});`;
      webViewRef.current.injectJavaScript(jsPOICode);

      // Ensures we only hook once
      // Ensures we only hook once
      // webViewRef.current.injectJavaScript(`
      // (function () {
      //   if (window.__svIndoorNavHooked) return;
      //   window.__svIndoorNavHooked = true;

      //   function getPropsFromPopup(popup) {
      //     try {
      //       // Your markers set marker.poiData in displayPOIs()
      //       const src = popup && popup._source;
      //       if (!src) return null;
      //       // Prefer the real source we use (poiData); fall back to GeoJSON if ever used
      //       const props =
      //         (src.poiData) ||
      //         (src.feature && src.feature.properties) ||
      //         null;
      //       return props;
      //     } catch (e) { return null; }
      //   }

      //   function ensureIndoorNavButton(popupEl, props) {
      //     if (!popupEl) return;
      //     if (popupEl.querySelector('#sv-indoor-nav-btn')) return;

      //     // We only need id + name; location is optional (RN will fall back)
      //     if (!props || !(props.id || props.buildingId) || !(props.name || props.buildingName)) {
      //       // Still show the button; RN will use selectedPOI fallback if needed
      //       props = props || {};
      //     }

      //     var container = document.createElement('div');
      //     container.style.marginTop = '8px';

      //     var btn = document.createElement('button');
      //     btn.id = 'sv-indoor-nav-btn';
      //     btn.textContent = 'Indoor navigation';
      //     btn.style.width = '100%';
      //     btn.style.padding = '10px';
      //     btn.style.border = 'none';
      //     btn.style.borderRadius = '8px';
      //     btn.style.fontWeight = 'bold';
      //     btn.style.cursor = 'pointer';
      //     btn.style.background = '#5E5CE6';
      //     btn.style.color = '#fff';

      //     btn.onclick = function () {
      //       try {
      //         window.ReactNativeWebView.postMessage(JSON.stringify({
      //           type: 'INDOOR_NAV_FROM_MAP',
      //           payload: {
      //             id: props.id || props.buildingId || null,
      //             name: props.name || props.buildingName || null,
      //             locationId: props.location || props.locationId || null
      //           }
      //         }));
      //       } catch (e) {
      //         // no-op
      //       }
      //     };

      //     container.appendChild(btn);
      //     popupEl.appendChild(container);
      //   }

      //   if (typeof map !== 'undefined' && map && map.on) {
      //     map.on('popupopen', function (e) {
      //       try {
      //         var popupEl = e && e.popup && e.popup.getElement
      //           ? e.popup.getElement().querySelector('.leaflet-popup-content')
      //           : null;
      //         var props = getPropsFromPopup(e.popup);
      //         ensureIndoorNavButton(popupEl, props);
      //       } catch (err) {}
      //     });
      //   }
      // })();
      // `);
    }
  }, [isAdmin, isMapReady, pois]);

  // AR Navigation functions
  const handleARToggle = async () => {
    if (!showAR) {
      // Request camera permission before enabling AR
      const hasPermission = await requestCameraPermission();
      if (hasPermission) {
        setShowAR(true);
        setStatus('AR Navigation enabled');
      }
    } else {
      setShowAR(false);
      setStatus('AR Navigation disabled');
    }
  };

  const handleNavigationMinimize = () => {
    setIsNavigationMinimized(!isNavigationMinimized);
  };

  // Manual map refresh (reload WebView)
  const refreshMap = () => {
    setShowLocationRefreshPopup(false); // Close the popup
    setTempMessage('Refreshing map...');
    setIsMapReady(false);
    setCurrentLocation(null);
    setError(null);

    // Reload the WebView
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  const handleWebViewMessage = async (event: any) => {
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
          const reinject = `window.drawRoute && window.drawRoute(${JSON.stringify(routeCoordinates)});`;
          webViewRef.current?.injectJavaScript(reinject);
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

          webViewRef.current?.injectJavaScript('window.clearRoute && window.clearRoute();');

          // Use the hook's selectPOI function instead of manual state updates
          selectPOI(selectedPOI);

          // 👉 Inject an "Indoor navigation" button into the current popup
          // webViewRef.current?.injectJavaScript(`
          //   (function() {
          //     try {
          //       const popup = document.querySelector('.leaflet-popup-content');
          //       if (!popup) return;

          //       const btnId = 'sv-indoor-nav-btn';
          //       if (!document.getElementById(btnId)) {
          //         const container = document.createElement('div');
          //         container.style.marginTop = '8px';

          //         const btn = document.createElement('button');
          //         btn.id = btnId;
          //         btn.textContent = 'Indoor navigation';
          //         btn.style.width = '100%';
          //         btn.style.padding = '10px';
          //         btn.style.border = 'none';
          //         btn.style.borderRadius = '8px';
          //         btn.style.fontWeight = 'bold';
          //         btn.style.cursor = 'pointer';
          //         btn.style.background = '#5E5CE6';   // matches your primary vibe
          //         btn.style.color = '#fff';

          //         btn.onclick = function() {
          //           window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'INDOOR_NAV_FROM_MAP' }));
          //         };

          //         container.appendChild(btn);
          //         popup.appendChild(container);
          //       }
          //     } catch (e) { /* no-op */ }
          //   })();
          // `);

          if (currentLocation) {
            fetchRoute([selectedPOI.centroid.longitude, selectedPOI.centroid.latitude]);
          }
          break;

        case 'INDOOR_NAV_FROM_MAP': {
          const p = parsed.payload || {};
          // Prefer payload; fall back to the current selectedPOI from state; last resort: find by id in pois
          const fallbackPOI = hookSelectedPOI || pois.find((x) => x.id === p.id);

          const buildingId = p.id || p.buildingId || fallbackPOI?.id || fallbackPOI?.buildingId;
          const buildingName =
            p.name || p.buildingName || fallbackPOI?.name || fallbackPOI?.title || 'Building';
          const locationId = p.locationId || p.location || fallbackPOI?.location || 'up-campus'; // update default if needed
          const floorId = '1';

          console.log('[IndoorNav] payload:', p);
          console.log('[IndoorNav] resolved ->', { buildingId, buildingName, locationId });

          if (!buildingId) {
            setError('Indoor navigation is only available for building POIs.');
            break;
          }

          // Close popup so UI looks clean
          webViewRef.current?.injectJavaScript(
            'try{map && map.closePopup && map.closePopup();}catch(e){}',
          );

          navigation.navigate('IndoorSchematicNav', {
            buildingId,
            buildingName,
            locationId,
            floorId,
          });
          break;
        }

        default:
        // console.log('Unknown message type from WebView:', parsed.type);
      }
    } catch (e) {
      // console.log('WebView message error:', event.nativeEvent.data);
    }
  };



  const cancelRoute = () => {
    // console.log('cancelRoute called');

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
    if (isMapReady && webViewRef.current) {
      webViewRef.current.injectJavaScript('window.clearRoute && window.clearRoute();');
    }

    // Reset status
    setStatus('Route cancelled');

    // Clear any error messages
    setError(null);

    // Hide POI markers and show all markers again
    if (isMapReady && webViewRef.current) {
      webViewRef.current.injectJavaScript(
        'window.showAllPOIMarkers && window.showAllPOIMarkers();',
      );
    }
  };

  const shareLocation = async () => {
    if (!currentLocation) {
      setErrorPopupMessage('Your location is not available yet.');
      setShowErrorPopup(true);
      return;
    }
    try {
      const url = `https://snap-vision-f6954.web.app/location?lat=${currentLocation.latitude}&lng=${currentLocation.longitude}`;
      const message = `Check out my location: ${url}`;
      await Share.share({ message, url, title: 'Share Location' });
      setStatus('Location shared successfully');
      unlock('share-location');
    } catch {
      setError('Failed to share location');
    }
  };

  const handleDestinationSearch = () => {
    if (!currentLocation || !destinationCoords) {
      setError('Please select a valid destination');
      return;
    }
    fetchRoute(destinationCoords);
  };

  //add this function to handle report submission
  const submitCrowdReport = async () => {
    if (!hookSelectedPOI || !selectedDensity) {
      setError('Please select a building and density level');
      return;
    }

    try {
      // Save report to Firestore
      await firestore()
        .collection('crowdReports')
        .add({
          buildingId: hookSelectedPOI.id,
          buildingName: hookSelectedPOI.name,
          density: selectedDensity,
          timestamp: firestore.FieldValue.serverTimestamp(),
          reportedBy: auth().currentUser?.uid || 'anonymous',
          centroid: hookSelectedPOI.centroid,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        });

      // Update UI
      if (isMapReady && webViewRef.current) {
        const jsCrowdCode = `window.updateCrowdDensity && window.updateCrowdDensity(${hookSelectedPOI.centroid.latitude}, ${hookSelectedPOI.centroid.longitude}, '${selectedDensity}', '${hookSelectedPOI.id}');`;
        webViewRef.current.injectJavaScript(jsCrowdCode);
      }
      setShowCrowdPopup(false);
      setStatus(`Crowd density reported for ${hookSelectedPOI.name}`);
    } catch (error) {
      console.error('Error saving crowd report:', error);
      setError('Failed to submit crowd report');
    }
  };

  //  function to fetch recent crowd reports
  const fetchRecentCrowdReports = async () => {
    try {
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);

      const snapshot = await firestore()
        .collection('crowdReports')
        .where('timestamp', '>', oneHourAgo)
        .get();

      const reports: Record<string, any> = {};
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        // If multiple reports exist for the same building, take the most recent
        if (!reports[data.buildingId] || reports[data.buildingId].timestamp < data.timestamp) {
          reports[data.buildingId] = data;
        }
      });

      setCrowdReports(reports);

      // Update crowd indicators on map
      if (isMapReady && webViewRef.current) {
        Object.values(reports).forEach((report) => {
          if (report.centroid) {
            const jsCrowdCode = `window.updateCrowdDensity && window.updateCrowdDensity(${report.centroid.latitude}, ${report.centroid.longitude}, '${report.density}', '${report.buildingId}');`;
            if (webViewRef.current) {
              webViewRef.current.injectJavaScript(jsCrowdCode);
            }
          }
        });
      }
    } catch (error) {
      console.error('Error fetching crowd reports:', error);
      // More informative error handling
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error as any).code === 'firestore/permission-denied'
      ) {
        setError('Crowd reports feature unavailable: Permission error');
      }
    }
  };

  // ] useEffect to fetch crowd reports periodically
  useEffect(() => {
    if (isMapReady) {
      fetchRecentCrowdReports();
      const interval = setInterval(fetchRecentCrowdReports, 5 * 60 * 1000); // Refresh every 5 minutes

      return () => clearInterval(interval);
    }
  }, [isMapReady]);

  //  a function to handle opening the crowd report modal
  const openCrowdReportModal = () => {
    // If user has selected a POI on map, use that as default
    if (selectedFeature) {
      setHookSelectedPOI(selectedFeature);
    } else if (destination && destinationCoords) {
      // If user has a destination set in the search bar but no selected feature,
      // find the corresponding POI
      const matchingPOI = pois.find(
        (poi) =>
          poi.name === destination ||
          (poi.centroid &&
            poi.centroid.longitude === destinationCoords[0] &&
            poi.centroid.latitude === destinationCoords[1]),
      );

      if (matchingPOI) {
        setHookSelectedPOI(matchingPOI);
      }
    }

    setShowCrowdPopup(true);
  };

  useEffect(() => {
    if (tempMessage) {
      const timer = setTimeout(() => {
        setTempMessage('');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [tempMessage]);

  //step changes with haptic feedback and TTS
  useEffect(() => {
    if (isNavigating && shouldStartTTS && steps.length > 0 && currentStep < steps.length) {
      const instruction = steps[currentStep]?.instruction;
      if (instruction) {
        // Trigger haptic feedback for new direction
        if (isHapticFeedbackEnabled) {
          ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
        }

        // console.log('TTS should speak:', instruction);
        if (isVoiceEnabled) {
          try {
            Tts.stop();
            setTimeout(() => {
              Tts.speak(instruction);
            }, 500);
          } catch (e) {
            console.error('TTS Error:', e);
            setError('Voice guidance is not available.');
          }
        }
      }
    }
  }, [isNavigating, steps, currentStep]);

  // Handle POI selection with navigation integration
  const handleSelectPOI = (poi: any) => {
    setHasHandledDeepLink(true); // Prevent deep link from overriding
    
    // Stop navigation if currently navigating
    if (isNavigating) {
      stopNavigation();
    }

    // Clear any existing route
    webViewRef.current?.injectJavaScript('window.clearRoute && window.clearRoute();');

    // Reset enhanced progress tracking for new destination
    setDistanceWalked(0);
    setStartLocation(null);
    setOriginalRouteDistance(null);

    // Use POI hook for basic selection
    selectPOI(poi);
    
    // Set navigation destination
    setDestinationCoords([poi.centroid.longitude, poi.centroid.latitude]);

    // Automatically fetch route when POI is selected from search
    if (currentLocation) {
      fetchRoute([poi.centroid.longitude, poi.centroid.latitude]);
    }
  };

  // Count how many paths touch each room (higher = better default start)
  async function getRoomDegrees(locationId: string, buildingId: string, floorId?: string) {
    let q: any = firestore()
      .collection(`locations/${locationId}/pathPOIs`)
      .where('buildingId', '==', buildingId);
    if (floorId) q = q.where('floorId', '==', floorId);
    const snap = await q.get();
    const deg: Record<string, number> = {};
    snap.docs.forEach((d: any) => {
      const p = d.data() as any;
      [p.startRoomId, p.endRoomId].forEach((id: string) => {
        deg[id] = (deg[id] ?? 0) + 1;
      });
    });
    return deg;
  }

  // Quick connectivity check (BFS) before you navigate
  async function areRoomsConnected(
    locationId: string,
    buildingId: string,
    startRoomId: string,
    endRoomId: string,
    floorId?: string,
  ): Promise<boolean> {
    // Build graph from pathPOIs
    let q: any = firestore()
      .collection(`locations/${locationId}/pathPOIs`)
      .where('buildingId', '==', buildingId);
    if (floorId) q = q.where('floorId', '==', floorId);
    const pathSnap = await q.get();
    const edges: Record<string, string[]> = {};
    pathSnap.docs.forEach((d: any) => {
      const p = d.data() as any;
      edges[p.startRoomId] = [...(edges[p.startRoomId] || []), p.endRoomId];
      edges[p.endRoomId] = [...(edges[p.endRoomId] || []), p.startRoomId];
    });

    // Cross-floor links via connectorGroupId on stairs/elevators
    const roomSnap = await firestore()
      .collection(`locations/${locationId}/roomPOIs`)
      .where('buildingId', '==', buildingId)
      .get();
    const rooms = roomSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
    const byGroup: Record<string, string[]> = {};
    rooms.forEach((r) => {
      if (r.connectorGroupId && (r.type === 'stairs' || r.type === 'elevator')) {
        byGroup[r.connectorGroupId] = [...(byGroup[r.connectorGroupId] || []), r.id];
      }
    });
    Object.values(byGroup).forEach((ids) => {
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          edges[ids[i]] = [...(edges[ids[i]] || []), ids[j]];
          edges[ids[j]] = [...(edges[ids[j]] || []), ids[i]];
        }
      }
    });

    // BFS
    const seen = new Set<string>();
    const queue = [startRoomId];
    while (queue.length) {
      const node = queue.shift()!;
      if (node === endRoomId) return true;
      if (seen.has(node)) continue;
      seen.add(node);
      (edges[node] || []).forEach((n) => {
        if (!seen.has(n)) queue.push(n);
      });
    }
    return false;
  }

  // Handle deep link params if they exist
  useEffect(() => {
    // Only process params once and if they exist
    if (!hasHandledDeepLink && params && params.lat && params.lng && currentLocation) {
      const lat = parseFloat(params.lat);
      const lng = parseFloat(params.lng);
      setDestination("Friend's Location");
      setDestinationCoords([lng, lat]);
      fetchRoute([lng, lat]);
      setHasHandledDeepLink(true);
    }
  }, [params, currentLocation, hasHandledDeepLink]);

  // Check for location availability after map loads
  useEffect(() => {
    if (isMapReady && !currentLocation && !isRefreshingLocation) {
      // Wait 5 seconds after map is ready, then show location prompt if still no location
      const locationTimeout = setTimeout(() => {
        if (!currentLocation && !showLocationRefreshPopup) {
          setShowLocationRefreshPopup(true);
        }
      }, 5000);

      return () => clearTimeout(locationTimeout);
    }
  }, [isMapReady, currentLocation, isRefreshingLocation, showLocationRefreshPopup]);
  function toggleMapRotation(): void {
    if (webViewRef.current && isMapReady) {
      webViewRef.current.injectJavaScript(`
        if (window.toggleMapRotation) {
          window.toggleMapRotation();
        }
      `);
      setTempMessage('Toggled map rotation');
    }
  }
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {showCrowdPopup && (
        <CrowdReportModal
          visible={showCrowdPopup}
          selectedDensity={selectedDensity}
          selectedPOI={hookSelectedPOI}
          availablePOIs={pois}
          onChangeDensity={setSelectedDensity}
          onChangePOI={setHookSelectedPOI}
          onSubmit={submitCrowdReport}
          onCancel={() => setShowCrowdPopup(false)}
        />
      )}

      <AdminPOIModal
        visible={showAddPOIModal}
        mode="add"
        onClose={() => setShowAddPOIModal(false)}
        onSubmit={submitNewBuilding}
        buildingName={buildingName}
        setBuildingName={setBuildingName}
        numberOfFloors={numberOfFloors}
        setNumberOfFloors={setNumberOfFloors}
        selectedLocation={selectedLocation}
        setSelectedLocation={setSelectedLocation}
        availableLocations={availableLocations}
      />

      <AdminPOIModal
        visible={showEditPOIModal}
        mode="edit"
        onClose={() => setShowEditPOIModal(false)}
        onSubmit={submitEditBuilding}
        newName={newName}
        setNewName={setNewName}
        newFloors={newFloors}
        setNewFloors={setNewFloors}
        editingPOI={editingPOI}
      />

      <AdminActionsModal
        visible={showAdminActions}
        adminActionPOI={adminActionPOI}
        onEdit={openEditBuildingModal}
        onDelete={(poi) => confirmDeleteBuilding(poi, () => setShowAdminActions(false))}
        onClose={() => setShowAdminActions(false)}
      />



      <DirectionsModal
        visible={showDirectionsSheet}
        onClose={() => {
          console.log('[DirectionsModal] onClose pressed');
          setShowDirectionsSheet(false);
        }}
        onStart={() => {
          console.log('[DirectionsModal] Start pressed');
          console.log('Current destination:', destination);
          console.log('Current steps:', steps);
          console.log('CurrentStep:', currentStep);
          console.log('CurrentLocation:', currentLocation);
          setIsNavigating(true);
          setShouldStartTTS(true);
          setCurrentStep(0);
          setShowDirectionsSheet(false);
        }}
        destination={destination}
        steps={steps}
        currentStep={currentStep}
        isNavigating={isNavigating}
      />
      {!isNavigating && (
        <DestinationSearch
          value={destination}
          onChange={(text) => {
            setDestination(text);
            filterPOIs(text);
            if (!text.trim()) {
              if (isNavigating) {
                stopNavigation();
              }
              webViewRef.current?.injectJavaScript('window.clearRoute && window.clearRoute();');
              setDestinationCoords(null);
            }
          }}
          onSearch={handleDestinationSearch}
          suggestions={poiSuggestions}
          onSelectSuggestion={handleSelectPOI}
        />
      )}

      <View style={{ flex: 1 }}>
        <MapWebView ref={webViewRef} onMessage={handleWebViewMessage} />
      </View>

      {destination && destinationCoords && (
        <NavigationPanel
          isNavigating={isNavigating}
          isLoading={isRouteLoading}
          onStartNavigation={startNavigation}
          onStopNavigation={stopNavigation}
          onCancelRoute={cancelRoute}
          progress={routeProgress}
          distance={distanceToDestination}
          distanceWalked={distanceWalked}
          originalRouteDistance={originalRouteDistance}
          time={estimatedTime}
          destination={destination}
          isVoiceEnabled={isVoiceEnabled}
          onToggleVoice={() => setIsVoiceEnabled(!isVoiceEnabled)}
          currentInstruction={steps[currentStep]?.instruction}
          onSpeakingChange={setIsSpeaking}
          showAR={showAR}
          onToggleAR={handleARToggle}
          destinationCoords={destinationCoords}
          isMinimized={isNavigationMinimized}
          onToggleMinimize={handleNavigationMinimize}
        />
      )}

      {selectedBuildingForIndoor && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            bottom: 120,
            left: 20,
            right: 20,
            backgroundColor: colors.card,
            borderRadius: 8,
            padding: 12,
            alignItems: 'center',
            elevation: 4,
          }}
          onPress={async () => {
            const b = selectedBuildingForIndoor;
            // b.location is how you store location id on buildingPOI in fetchPOIs()
            const locationId = b.location;
            const buildingId = b.id;

            // TODO: Implement proper room fetching
            const rooms: any[] = []; // Placeholder - no rooms available
            if (!rooms.length) {
              setErrorPopupMessage('No rooms available for indoor navigation');
              setShowErrorPopup(true);
              return;
            }

            setIndoorRooms(rooms);

            // Default destination = previously chosen or first
            const defaultDest: any = selectedIndoorRoom
              ? rooms.find((r: any) => r.id === selectedIndoorRoom.id)
              : rooms[0];

            // Smart default start: entrance on same floor → any entrance → most connected → first
            const entrances = rooms.filter((r: any) => r.isEntrance);
            const sameFloorEntrance = defaultDest?.floorId
              ? entrances.find((e: any) => e.floorId === defaultDest.floorId)
              : null;
            const degreeByRoom = await getRoomDegrees(locationId, buildingId, defaultDest?.floorId);
            const mostConnected = [...rooms].sort(
              (a: any, b: any) => (degreeByRoom[b.id] || 0) - (degreeByRoom[a.id] || 0),
            )[0];

            setSelectedStartRoom(sameFloorEntrance || entrances[0] || mostConnected || rooms[0]);
            setSelectedIndoorRoom(defaultDest);
            setShowIndoorPicker(true);
          }}
        >
          <Text style={{ color: colors.text, fontWeight: 'bold' }}>Navigate Indoors</Text>
        </TouchableOpacity>
      )}

      {showIndoorPicker && (
        <Modal transparent visible animationType="slide">
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.5)',
              padding: 20,
            }}
          >
            <View style={{ backgroundColor: colors.card, borderRadius: 10, padding: 16 }}>
              <Text style={{ fontWeight: 'bold', color: colors.text, marginBottom: 8 }}>Start</Text>
              <View style={{ maxHeight: 140 }}>
                <ScrollView>
                  {indoorRooms.map((r) => (
                    <TouchableOpacity
                      key={`start-${r.id}`}
                      onPress={() => setSelectedStartRoom(r)}
                      style={{
                        padding: 10,
                        borderRadius: 6,
                        backgroundColor:
                          selectedStartRoom?.id === r.id ? colors.primary : 'transparent',
                        marginBottom: 6,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Text
                        style={{ color: selectedStartRoom?.id === r.id ? '#fff' : colors.text }}
                      >
                        {r.name}
                        {r.isEntrance ? ' · Entrance' : ''}
                        {r.type ? ` · ${r.type}` : ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Text style={{ fontWeight: 'bold', color: colors.text, marginVertical: 8 }}>
                Destination
              </Text>
              <View style={{ maxHeight: 180 }}>
                <ScrollView>
                  {indoorRooms.map((r) => (
                    <TouchableOpacity
                      key={`dest-${r.id}`}
                      onPress={() => setSelectedIndoorRoom(r)}
                      style={{
                        padding: 10,
                        borderRadius: 6,
                        backgroundColor:
                          selectedIndoorRoom?.id === r.id ? colors.primary : 'transparent',
                        marginBottom: 6,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }}
                    >
                      <Text
                        style={{ color: selectedIndoorRoom?.id === r.id ? '#fff' : colors.text }}
                      >
                        {r.name}
                        {r.type ? ` · ${r.type}` : ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View
                style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}
              >
                <Pressable onPress={() => setShowIndoorPicker(false)}>
                  <Text style={{ color: colors.text }}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={async () => {
                    if (!selectedStartRoom || !selectedIndoorRoom || !selectedBuildingForIndoor)
                      return;
                    const b = selectedBuildingForIndoor;
                    const connected = await areRoomsConnected(
                      b.location,
                      b.id,
                      selectedStartRoom.id,
                      selectedIndoorRoom.id,
                      selectedIndoorRoom.floorId,
                    );
                    if (!connected) {
                      setShowIndoorPicker(false);
                      setErrorPopupMessage(
                        'No saved path between those rooms. Try a different start (e.g., an Entrance) or add missing paths in the floor editor.',
                      );
                      setShowErrorPopup(true);
                      return;
                    }
                    setShowIndoorPicker(false);

                    console.log('Navigating to IndoorNavigation with:', {
                      locationId: b.location,
                      buildingId: b.id,
                      startRoomId: selectedStartRoom.id,
                      endRoomId: selectedIndoorRoom.id,
                      floorId: selectedIndoorRoom.floorId,
                    });
                    navigation.navigate('IndoorNavigation', {
                      locationId: b.location,
                      buildingId: b.id,
                      startRoomId: selectedStartRoom.id,
                      endRoomId: selectedIndoorRoom.id,
                      // floorId: selectedIndoorRoom.floorId, // optional
                    });
                  }}
                >
                  <Text style={{ fontWeight: 'bold', color: colors.primary }}>Start</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      <MapActionsPanel
        currentLocation={!!currentLocation}
        onShare={shareLocation}
        onReport={openCrowdReportModal}
        isAdmin={isAdmin}
        onAddPOI={() => enableAdminPOICreation(webViewRef, setTempMessage)}
        shareTooltip={showShareTooltip}
        reportTooltip={showReportTooltip}
        onShareIn={() => setShowShareTooltip(true)}
        onShareOut={() => setShowShareTooltip(false)}
        onReportIn={() => setShowReportTooltip(true)}
        onReportOut={() => setShowReportTooltip(false)}
        color={colors.primary}
      />

      {/* Location Refresh Button - shown when no location available */}
      {!currentLocation && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            bottom: 160, // Above the MapActionsPanel
            right: 20,
            backgroundColor: colors.primary,
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 8,
            elevation: 4,
            flexDirection: 'row',
            alignItems: 'center',
          }}
          onPress={refreshLocation}
          disabled={isRefreshingLocation}
        >
          <Text style={{ color: 'white', fontWeight: 'bold', marginRight: 8 }}>
            {isRefreshingLocation ? 'Finding Location...' : '📍 Find My Location'}
          </Text>
        </TouchableOpacity>
      )}

      {/* AR Navigation Overlay */}
      {showAR && isNavigating && destinationCoords && currentLocation && (
        <ARNavigationOverlay
          currentLocation={{
            x: currentLocation.longitude,
            y: currentLocation.latitude,
          }}
          destinationCoords={{
            x: destinationCoords[0],
            y: destinationCoords[1],
          }}
          deviceHeading={deviceHeading}
          navigationSteps={steps}
          routeCoordinates={routeCoordinates} // Pass the actual route
          currentRouteIndex={Math.floor((routeProgress / 100) * (routeCoordinates.length - 1))} // Current position on route
          showMiniMap={true} // Enable mini map overlay
        />
      )}

      {isNavigating && steps.length > 0 && (
        <Pressable
          onPress={() => setShowDirectionsSheet(true)}
          style={{
            position: 'absolute',
            top: 20, // Moved back up to original position
            left: 20,
            right: 20,
            backgroundColor: colors.card,
            borderRadius: 8,
            padding: 12,
            alignItems: 'center',
            elevation: 4,
            zIndex: 1001,
          }}
        >
          <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 16 }}>
            {steps[currentStep]?.instruction}
          </Text>
        </Pressable>
      )}

      {error && <StatusOverlay status={error} />}

      {/* {isAdmin && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            bottom: 100,
            right: 20,
            backgroundColor: '#007bff',
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderRadius: 8,
            elevation: 4,
          }}
          onPress={() => {
            webViewRef.current?.injectJavaScript(`window.enableAdminPOICreation();`);
          }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>+ Add POI</Text>
        </TouchableOpacity>
      )} */}

      {tempMessage ? (
        <View
          style={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            right: 20,
            backgroundColor: colors.card,
            padding: 10,
            borderRadius: 8,
            alignItems: 'center',
            elevation: 4,
          }}
        >
          <Text style={{ color: colors.text, fontWeight: 'bold' }}>{tempMessage}</Text>
        </View>
      ) : null}

      {/* Error Popup */}
      <StandardPopup
        visible={showErrorPopup}
        title="Error"
        message={errorPopupMessage}
        onConfirm={() => setShowErrorPopup(false)}
        showCancel={false}
      />

      {/* Success Popup */}
      <StandardPopup
        visible={showSuccessPopup}
        title="Success"
        message={successPopupMessage}
        onConfirm={() => setShowSuccessPopup(false)}
        showCancel={false}
      />

      {/* Confirmation Popup */}
      <StandardPopup
        visible={showConfirmationPopup}
        title={confirmationPopupData?.title || ''}
        message={confirmationPopupData?.message || ''}
        onConfirm={confirmationPopupData?.onConfirm}
        onCancel={() => setShowConfirmationPopup(false)}
        confirmText="Delete"
        cancelText="Cancel"
        showCancel={true}
      />

      {/* Destination Reached Popup */}
      <StandardPopup
        visible={showDestinationReachedPopup}
        title="Destination Reached"
        message="You have arrived at your destination!"
        onConfirm={() => {
          setShowDestinationReachedPopup(false);
          setHasReachedDestination(false);
          // Clear destination and navigation state to hide the progress bar
          setDestination('');
          setDestinationCoords(null);
          setRouteProgress(0);
          setDistanceToDestination(null);
          setEstimatedTime(null);
          setSelectedFeature(null);
          setHookSelectedPOI(null);
          setSteps([]);
          setCurrentStep(0);
          // Reset enhanced progress tracking
          setDistanceWalked(0);
          setStartLocation(null);
          setOriginalRouteDistance(null);

          // Clear the route from the map
          if (isMapReady && webViewRef.current) {
            webViewRef.current.injectJavaScript('window.clearRoute && window.clearRoute();');
          }
          setStatus('Ready for navigation');
        }}
        showCancel={false}
      />

      {/* Location Error Banner - Non-modal but centered like a popup */}
      {showLocationRefreshPopup && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1003,
            pointerEvents: 'box-none', // Allow touches through the transparent area
          }}
        >
          <View
            style={{
              backgroundColor: isDark ? '#2c2c2c' : 'white',
              borderRadius: 16,
              padding: 24,
              marginHorizontal: 48, // Increased from 32 to add more space from edges
              maxWidth: 360, // Reduced from 400 to make it narrower
              width: '100%',
              elevation: 8,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              pointerEvents: 'auto', // Block touches on the popup itself
            }}
          >
            {/* Close button */}
            <TouchableOpacity
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                padding: 8,
                zIndex: 1,
              }}
              onPress={() => setShowLocationRefreshPopup(false)}
            >
              <Text
                style={{
                  color: isDark ? '#ccc' : '#666',
                  fontSize: 20,
                  fontWeight: 'bold',
                }}
              >
                ×
              </Text>
            </TouchableOpacity>

            {/* Title */}
            <Text
              style={{
                color: isDark ? 'white' : colors.text,
                fontSize: 18,
                fontWeight: 'bold',
                marginBottom: 12,
                textAlign: 'center',
                paddingRight: 32, // Space for close button
              }}
            >
              Location Not Found
            </Text>

            {/* Message */}
            <Text
              style={{
                color: isDark ? '#ccc' : colors.text,
                fontSize: 14,
                marginBottom: 20,
                lineHeight: 20,
                textAlign: 'center',
              }}
            >
              Unable to find your location. This can happen indoors or in areas with poor GPS
              signal.
            </Text>

            {/* Action buttons in vertical layout */}
            <View style={{ flexDirection: 'column', gap: 12 }}>
              <TouchableOpacity
                style={{
                  backgroundColor: colors.primary,
                  paddingVertical: 14,
                  paddingHorizontal: 24,
                  borderRadius: 8,
                }}
                onPress={refreshLocation}
              >
                <Text
                  style={{
                    color: 'white',
                    fontSize: 16,
                    fontWeight: '600',
                    textAlign: 'center',
                  }}
                >
                  Retry Location
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  backgroundColor: 'transparent',
                  paddingVertical: 14,
                  paddingHorizontal: 24,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors.primary,
                }}
                onPress={refreshMap}
              >
                <Text
                  style={{
                    color: colors.primary,
                    fontSize: 16,
                    fontWeight: '600',
                    textAlign: 'center',
                  }}
                >
                  Refresh Map
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Location Refresh Popup */}
      <StandardPopup
        visible={false} // Disabled - using custom non-modal popup instead
        title="Location Not Found"
        message="Unable to find your location. This can happen indoors or in areas with poor GPS signal. Try 'Retry Location' or 'Refresh Map' for a complete reset."
        onConfirm={refreshLocation}
        onCancel={refreshMap}
        confirmText="Retry Location"
        cancelText="Refresh Map"
        showCancel={true}
        verticalButtons={true}
      />
    </View>
  );
};

export default MapScreen;
