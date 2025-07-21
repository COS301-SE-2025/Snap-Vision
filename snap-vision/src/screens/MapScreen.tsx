// src/screens/MapScreen.tsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Alert,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  PermissionsAndroid,
  Pressable,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import { WebView as WebViewType } from 'react-native-webview';
import firestore from '@react-native-firebase/firestore';
import Tts from 'react-native-tts';
import MapWebView from '../components/organisms/MapWebView';
import CrowdReportModal from '../components/molecules/CrowdReportModal';
import StatusOverlay from '../components/atoms/StatusOverlay';
import DestinationSearch from '../components/molecules/DestinationSearch';
import MapActionsPanel from '../components/organisms/MapActionsPanel';
import NavigationPanel from '../components/organisms/NavigationPanel';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import DirectionsModal from '../components/organisms/DirectionsModal';
import { useRoute } from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import { addRecentlyVisitedPOI, Visit } from '../services/firebase/recentlyVService';

import { useBadges } from '../context/BadgeContext';
import { useAccessibility } from '../context/AccessibilityContext';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import ARNavigationOverlay from '../components/organisms/ARNavigationOverlay';
import { useCompass } from '../hooks/useCompass';
import { requestCameraPermission } from '../utils/cameraPermissions';

type MapScreenParams = {
  lat?: string;
  lng?: string;
};

const ROUTING_API_BASE = 'http://192.168.38.203:3000'; // <-- Use your correct backend IP here

// emulator: 10.0.2.2
// B home:  192.168.56.1
// L wifi: 192.168.0.127
// T home: 192.168.0.133
// T data: 192.168.43.155
// Th home: 10.0.0.9
// T Durban: 192.168.1.93

const MapScreen = () => {
  const lastRoute = useRef<any[]>([]);
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const watchIdRef = useRef<number | null>(null);
  const { isHapticFeedbackEnabled } = useAccessibility();

  const [status, setStatus] = useState('Loading map...');
  const [error, setError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [showCrowdPopup, setShowCrowdPopup] = useState(false);
  const [selectedDensity, setSelectedDensity] = useState('moderate');
  const [destination, setDestination] = useState('');
  const [showShareTooltip, setShowShareTooltip] = useState(false);
  const [showReportTooltip, setShowReportTooltip] = useState(false);
  const webViewRef = useRef<WebViewType>(null);
  const [isMapReady, setIsMapReady] = useState(false);

  // Turn-by-turn state
  const [steps, setSteps] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [shouldStartTTS, setShouldStartTTS] = useState(false);
  const [showDirectionsSheet, setShowDirectionsSheet] = useState(false);

  // Navigation state
  const [isNavigating, setIsNavigating] = useState(false);
  const [routeProgress, setRouteProgress] = useState(0);
  const [distanceToDestination, setDistanceToDestination] = useState<number | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);

  const [destinationCoords, setDestinationCoords] = useState<[number, number] | null>(null);
  const [pois, setPOIs] = useState<any[]>([]);
  const [poiSuggestions, setPOISuggestions] = useState<any[]>([]);

  // share location
  const route = useRoute();
  const params = route.params as MapScreenParams;
  const [hasHandledDeepLink, setHasHandledDeepLink] = useState(false);

  const { unlock, incrementRoutes } = useBadges();
  const { setNavigationStartTime } = useBadges();

  // crowd reports
  const [selectedPOI, setSelectedPOI] = useState<any>(null);
  const [crowdReports, setCrowdReports] = useState<Record<string, any>>({});
  const [selectedFeature, setSelectedFeature] = useState<any>(null);

  //Admin
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAddPOIModal, setShowAddPOIModal] = useState(false);
  const [addPOICoords, setAddPOICoords] = useState<{ lat: number; lon: number } | null>(null);
  const [buildingName, setBuildingName] = useState('');
  const [numberOfFloors, setNumberOfFloors] = useState('');
  const [showEditPOIModal, setShowEditPOIModal] = useState(false);
  const [editingPOI, setEditingPOI] = useState<any>(null);
  const [newName, setNewName] = useState('');
  const [newFloors, setNewFloors] = useState('');
  const [showAdminActions, setShowAdminActions] = useState(false);
  const [adminActionPOI, setAdminActionPOI] = useState<any>(null);
  const [tempMessage, setTempMessage] = useState<string>('');

  // AR Navigation state
  const [showAR, setShowAR] = useState(false);
  const deviceHeading = useCompass();

  //haptic feedback options
  const hapticOptions = {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
  };

  //Check if user is admin
  useEffect(() => {
    const fetchRole = async () => {
      const userId = auth().currentUser?.uid;
      if (!userId) return;
      const userDoc = await firestore().collection('userInformation').doc(userId).get();
      const role = userDoc.data()?.role;
      setIsAdmin(role === 'admin');
    };
    fetchRole();
  }, []);

  // Inject admin handlers into the WebView
  useEffect(() => {
    if (isMapReady && webViewRef.current) {
      // Set admin mode in the WebView
      const setAdminJS = `window.setAdminMode && window.setAdminMode(${isAdmin ? 'true' : 'false'});`;
      webViewRef.current.injectJavaScript(setAdminJS);

      // Re-display POIs to update popups/buttons
      const jsPOICode = `window.displayPOIs && window.displayPOIs(${JSON.stringify(pois)});`;
      webViewRef.current.injectJavaScript(jsPOICode);

      // (Optional) Re-inject admin handlers if needed
      const injectedJS = `
        window.editPOI = function(poiId) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'EDIT_POI',
            poiId: poiId
          }));
        };
        window.deletePOI = function(poiId) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'DELETE_POI',
            poiId: poiId
          }));
        };
      `;
      webViewRef.current.injectJavaScript(injectedJS);
    }
  }, [isAdmin, isMapReady, pois]);

  const sendLocationToWebView = (lat: number, lon: number, centerMap = false) => {
    setCurrentLocation({ latitude: lat, longitude: lon });

    const zoomLevel = isNavigating ? 18 : 16;

    const jsCode = `window.updateUserLocation && window.updateUserLocation(${lat}, ${lon}, ${centerMap}, ${zoomLevel});`;
    webViewRef.current?.injectJavaScript(jsCode);

    if (isNavigating && lastRoute.current && lastRoute.current.length > 0) {
      setStatus(`Updating location: ${lat.toFixed(6)}, ${lon.toFixed(6)}`);
      updateNavigationProgress(lat, lon);
    }
  };

  const requestLocation = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        setStatus('Getting your location...');
        Geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            sendLocationToWebView(latitude, longitude, true);
            setStatus('Location found');
          },
          (error) => {
            setError('Failed to get location');
          },
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 },
        );
      } else {
        setError('Location permission denied');
      }
    } catch (err) {
      setError('Permission request failed');
    }
  };

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

  // Helper: Open modal to add new POI
  const openAddBuildingModal = (lat: number, lon: number) => {
    setAddPOICoords({ lat, lon });
    setShowAddPOIModal(true);
  };

  // Helper: Open modal to edit existing POI
  const openEditBuildingModal = (poi: any) => {
    setEditingPOI(poi);
    setNewName(poi.name || '');
    setNewFloors(poi.floors?.toString() || '');
    setShowEditPOIModal(true);
  };

  const confirmDeleteBuilding = (poi: any) => {
    Alert.alert('Delete Building', `Are you sure you want to delete "${poi.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            // Store POI ID before deletion for cleanup
            const deletedPoiId = poi.id;

            // First handle document IDs that might contain slashes
            await firestore().doc(`UPcampusPOIs/${poi.id}`).delete();

            // Direct removal of the specific marker
            if (webViewRef.current && isMapReady) {
              // First try direct removal
              webViewRef.current.injectJavaScript(`
                    window.removePOIById("${deletedPoiId}");
                    map.closePopup();
                  `);

              // Clear route if it exists
              webViewRef.current.injectJavaScript('window.clearRoute && window.clearRoute();');

              // Update state
              await fetchPOIs();
              setStatus(`Building "${poi.name}" deleted`);

              // Clear UI elements related to the deleted POI
              if (destination === poi.name) {
                setDestination('');
                setDestinationCoords(null);
                setRouteProgress(0);

                // Stop navigation if currently navigating
                if (isNavigating) {
                  stopNavigation();
                }

                // Clear any stored route
                lastRoute.current = [];
              }
            }
          } catch (error) {
            console.error('Error deleting building:', error);
            setError('Failed to delete building');
          }
        },
      },
    ]);
  };

  const handleWebViewMessage = async (event: any) => {
    try {
      const data = event.nativeEvent.data;

      // === Handle simple message ===
      if (data === 'MAP_READY') {
        setStatus('Map loaded');
        setIsMapReady(true);
        requestLocation();

        if (lastRoute.current.length > 0) {
          const reinject = `window.drawRoute && window.drawRoute(${JSON.stringify(lastRoute.current)});`;
          webViewRef.current?.injectJavaScript(reinject);
        }
        return;
      }

      // === Handle JSON message ===
      const parsed = JSON.parse(data);

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
          lastRoute.current = [];

          setDestination(selectedPOI.name);
          setDestinationCoords([selectedPOI.centroid.longitude, selectedPOI.centroid.latitude]);
          setStatus(`Selected: ${selectedPOI.name}`);
          setSelectedFeature(selectedPOI);
          setSelectedPOI(selectedPOI);

          if (currentLocation) {
            fetchRoute([selectedPOI.centroid.longitude, selectedPOI.centroid.latitude]);
          }
          break;

        case 'ADMIN_ADD_POI':
          openAddBuildingModal(parsed.lat, parsed.lon);
          break;

        case 'EDIT_POI':
          const poiToEdit = pois.find((p) => p.id === parsed.poiId);
          if (poiToEdit) {
            openEditBuildingModal(poiToEdit);
          }
          break;

        case 'DELETE_POI':
          const poiToDelete = pois.find((p) => p.id === parsed.poiId);
          if (poiToDelete) {
            confirmDeleteBuilding(poiToDelete);
            webViewRef.current?.injectJavaScript('map.closePopup();');
          }
          break;

        case 'ADMIN_POI_SELECTED':
          const adminPOI = pois.find((p) => p.id === parsed.poi.id);
          if (adminPOI) {
            setAdminActionPOI(adminPOI);
            setShowAdminActions(true);
            webViewRef.current?.injectJavaScript('map.closePopup();');
          }
          break;

        default:
          console.log('Unknown message type from WebView:', parsed.type);
      }
    } catch (e) {
      console.log('WebView message error:', event.nativeEvent.data);
    }
  };

  //Add building (admin only)
  const submitNewBuilding = async () => {
    if (!addPOICoords) return;
    if (!buildingName.trim()) return Alert.alert('Building name required');
    if (!numberOfFloors.trim() || isNaN(Number(numberOfFloors)))
      return Alert.alert('Please enter a valid number of floors');
    try {
      const newDoc = {
        name: buildingName,
        centroid: {
          latitude: addPOICoords.lat,
          longitude: addPOICoords.lon,
        },
        floors: Number(numberOfFloors),
        tags: {
          building: 'yes',
        },
      };
      await firestore().collection('UPcampusPOIs').add(newDoc);
      setShowAddPOIModal(false);
      setStatus('Building added!');
      fetchPOIs(); // Refresh markers
    } catch (e) {
      setError('Failed to add building');
    }
  };

  const submitEditBuilding = async () => {
    if (!newName.trim()) return Alert.alert('Building name required');
    if (!newFloors.trim() || isNaN(Number(newFloors)))
      return Alert.alert('Please enter a valid number of floors');

    if (!editingPOI || !editingPOI.id) {
      console.error('No valid POI ID found:', editingPOI);
      setError('Invalid building data');
      return;
    }

    try {
      // Update the document in Firestore
      const docId = await getPOIDocIdByCentroidId(editingPOI.id);

      if (docId) {
        await firestore()
          .collection('UPcampusPOIs')
          .doc(docId)
          .update({
            name: newName,
            floors: Number(newFloors),
          });
      } else {
        await firestore()
          .doc(`UPcampusPOIs/${editingPOI.id}`)
          .update({
            name: newName,
            floors: Number(newFloors),
          });
      }

      setShowEditPOIModal(false);
      setStatus('Building updated!');

      // Refresh POIs immediately after Firestore update
      await fetchPOIs();

      // Nuclear option: Force complete WebView reload
      setIsMapReady(false);
      setStatus('Refreshing map...');

      // Small delay to ensure the modal closes and POIs are updated
      setTimeout(() => {
        // Force WebView to reload completely
        if (webViewRef.current) {
          webViewRef.current.reload();
        }
      }, 100);

      Alert.alert('Success', 'Building information updated successfully.');
    } catch (error) {
      console.error('Error updating building:', error);
      setError('Failed to update');
    }
  };

  // Helper function to get document ID from centroid ID
  const getPOIDocIdByCentroidId = async (buildingId) => {
    try {
      const querySnapshot = await firestore()
        .collection('UPcampusPOIs')
        .where('id', '==', buildingId)
        .get();

      if (querySnapshot.empty) {
        console.warn('No building found for this centroid id:', buildingId);
        return null;
      }

      // Assuming only one document matches
      const doc = querySnapshot.docs[0];
      //console.log("doc: "+ doc.id);
      return doc.id;
    } catch (error) {
      console.error('Error querying POI by centroid id:', error);
      return null;
    }
  };

  const cancelRoute = () => {
    console.log('cancelRoute called');

    // Stop any ongoing route loading
    setIsRouteLoading(false);

    // Clear all route-related state
    setDestination('');
    setDestinationCoords(null);
    setRouteProgress(0);
    setDistanceToDestination(null);
    setEstimatedTime(null);
    setSelectedFeature(null);
    setSelectedPOI(null);
    setSteps([]);
    setCurrentStep(0);

    // Stop navigation if it's active
    if (isNavigating) {
      stopNavigation();
    }

    // Clear route from map
    webViewRef.current?.injectJavaScript('window.clearRoute && window.clearRoute();');
    lastRoute.current = [];

    // Reset status
    setStatus('Route cancelled');

    // Clear any error messages
    setError(null);

    // Hide POI markers and show all markers again
    webViewRef.current?.injectJavaScript('window.showAllPOIMarkers && window.showAllPOIMarkers();');
  };

  const shareLocation = async () => {
    if (!currentLocation) {
      Alert.alert('No Location', 'Your location is not available yet.');
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

  const fetchRoute = async (destCoords: [number, number]) => {
    if (!currentLocation) {
      setError('Your location is not available yet');
      return;
    }

    setIsRouteLoading(true);
    setStatus('Calculating route...');

    try {
      const start = `${currentLocation.longitude},${currentLocation.latitude}`;
      const end = `${destCoords[0]},${destCoords[1]}`;

      // Clear any existing route first
      webViewRef.current?.injectJavaScript('window.clearRoute && window.clearRoute();');

      const url = `${ROUTING_API_BASE}/api/directions?start=${start}&end=${end}`;
      const response = await fetch(url);
      const data = await response.json();

      const coordinates = data.features?.[0]?.geometry?.coordinates;
      if (!coordinates || coordinates.length === 0) throw new Error('No route found');

      lastRoute.current = coordinates;

      // Calculate distance and time for the route
      let totalDistance = 0;
      for (let i = 0; i < coordinates.length - 1; i++) {
        const point1 = coordinates[i];
        const point2 = coordinates[i + 1];
        totalDistance += getDistanceMeters(point1[1], point1[0], point2[1], point2[0]);
      }

      // Set the total distance
      setDistanceToDestination(totalDistance);

      // Estimate time (assuming average walking speed of 5 km/h = 1.4 m/s)
      const timeMinutes = Math.round(totalDistance / (1.4 * 60));
      setEstimatedTime(timeMinutes);

      const jsRouteCode = `window.drawRoute && window.drawRoute(${JSON.stringify(coordinates)});`;
      webViewRef.current?.injectJavaScript(jsRouteCode);
      setStatus('Route found!');
      const stepsArr = data.features?.[0]?.properties?.segments?.[0]?.steps || [];
      setSteps(stepsArr);
      setCurrentStep(0);
      setShowDirectionsSheet(true);

      // Reset progress
      setRouteProgress(0);
    } catch (error) {
      console.error('Route fetch error:', error);
      setError('Failed to fetch or draw route');
    } finally {
      setIsRouteLoading(false);
    }
  };

  // Start navigation function with haptic feedback
  const startNavigation = () => {
    if (!currentLocation || !destinationCoords || lastRoute.current.length === 0) {
      setError('Cannot start navigation without a route');
      return;
    }

    // Haptic feedback when starting navigation
    if (isHapticFeedbackEnabled) {
      ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    }

    setIsNavigating(true);
    setStatus('Navigation started');
    setRouteProgress(0);
    setNavigationStartTime(Date.now());

    // Start watching position with higher frequency
    if (watchIdRef.current) {
      Geolocation.clearWatch(watchIdRef.current);
    }

    watchIdRef.current = Geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        sendLocationToWebView(latitude, longitude, true);
      },
      (error) => {
        setError('Failed to track location');
      },
      {
        enableHighAccuracy: true,
        distanceFilter: 5, // Update every 5 meters
        interval: 1000, // Update every second
      },
    );
  };

  // Stop navigation function with haptic feedback
  const stopNavigation = () => {
    if (watchIdRef.current) {
      Geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    // Haptic feedback when stopping navigation
    if (isHapticFeedbackEnabled) {
      ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    }

    setIsNavigating(false);
    setStatus('Navigation stopped');
    webViewRef.current?.injectJavaScript(
      'window.setNavigationState && window.setNavigationState(false);',
    );

    if (currentLocation) {
      sendLocationToWebView(currentLocation.latitude, currentLocation.longitude, true);
    }

    // Clear progress line
    webViewRef.current?.injectJavaScript(
      'if (window.progressLine) { map.removeLayer(window.progressLine); window.progressLine = null; }',
    );
  };

  // Update the updateNavigationProgress function to check for destination arrival
  const updateNavigationProgress = (latitude: number, longitude: number) => {
    if (!lastRoute.current || lastRoute.current.length === 0) {
      return;
    }

    // Find closest point on the route
    let minDist = Infinity;
    let closestPointIndex = 0;

    for (let i = 0; i < lastRoute.current.length; i++) {
      const routePoint = lastRoute.current[i];
      const distance = getDistanceMeters(
        latitude,
        longitude,
        routePoint[1], // Latitude
        routePoint[0], // Longitude
      );

      if (distance < minDist) {
        minDist = distance;
        closestPointIndex = i;
      }
    }

    // Calculate a more precise progress
    // Consider not just the closest point, but also the percentage between points
    let progressValue;

    if (closestPointIndex < lastRoute.current.length - 1) {
      // Calculate distance between current point and next point
      const currentPoint = lastRoute.current[closestPointIndex];
      const nextPoint = lastRoute.current[closestPointIndex + 1];

      // Distance from user to closest point
      const distToClosest = getDistanceMeters(
        latitude,
        longitude,
        currentPoint[1],
        currentPoint[0],
      );

      // Distance from user to next point
      const distToNext = getDistanceMeters(latitude, longitude, nextPoint[1], nextPoint[0]);

      // Distance between closest and next point
      const segmentLength = getDistanceMeters(
        currentPoint[1],
        currentPoint[0],
        nextPoint[1],
        nextPoint[0],
      );

      // If we're between two points, calculate the fractional position
      if (distToClosest + distToNext <= segmentLength * 1.2) {
        // Allow some margin
        const segmentProgress = distToClosest / (distToClosest + distToNext);
        const fractionalIndex = closestPointIndex + segmentProgress;
        progressValue = (fractionalIndex / (lastRoute.current.length - 1)) * 100;
      } else {
        // Just use the closest point index
        progressValue = (closestPointIndex / (lastRoute.current.length - 1)) * 100;
      }
    } else {
      // At the last point
      progressValue = 100;
    }

    if (steps.length > 0) {
      let stepIndex = 0;
      let minDist = Infinity;
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        const [lon, lat] = step.way_points
          ? lastRoute.current[step.way_points[0]]
          : lastRoute.current[0];
        const dist = getDistanceMeters(latitude, longitude, lat, lon);
        if (dist < minDist) {
          minDist = dist;
          stepIndex = i;
        }
      }
      if (stepIndex !== currentStep) {
        setCurrentStep(stepIndex);
      }
    }

    // Update progress with a more precise value
    const newProgress = Math.min(Math.round(progressValue), 100);
    setRouteProgress(newProgress);

    // Check if we've reached the destination point
    const destinationPoint = lastRoute.current[lastRoute.current.length - 1];
    const distanceToEnd = getDistanceMeters(
      latitude,
      longitude,
      destinationPoint[1],
      destinationPoint[0],
    );

    // Update distance to destination
    setDistanceToDestination(distanceToEnd);

    // Keep status update brief to avoid UI clutter
    setStatus(`Progress: ${newProgress}%`);

    // Update route progress visually
    if (webViewRef.current) {
      const jsProgressCode = `
        if (window.updateRouteProgress) {
          window.updateRouteProgress(${closestPointIndex}, ${progressValue / 100});
        }
      `;
      webViewRef.current.injectJavaScript(jsProgressCode);
    }

    // Check destination arrival based on either:
    // 1. Progress is 100%
    // 2. Distance to destination is less than 3 meters
    if ((newProgress >= 100 || distanceToEnd < 3) && isNavigating) {
      destinationReached();
    }
  };

  // Destination reached function with haptic feedback
  const destinationReached = async () => {
    if (!isNavigating) return; // Only handle if actually navigating

    // Stop navigation FIRST to prevent repeated calls
    stopNavigation();

    try {
      // Trigger success haptic feedback
      if (isHapticFeedbackEnabled) {
        ReactNativeHapticFeedback.trigger('notificationSuccess', hapticOptions);
      }

      await unlock('destination-reached');
      await incrementRoutes();

      const userId = auth().currentUser?.uid;
      if (!userId) {
        console.warn('User not authenticated.');
        return;
      }

      const visit: Visit = {
        userId,
        poiId: selectedPOI.id,
        name: selectedPOI.name,
        timestamp: firestore.Timestamp.now(),
        centroid: selectedPOI.centroid,
      };

      await addRecentlyVisitedPOI(visit);
      console.log('Visit recorded:', selectedPOI.name);
    } catch (error) {
      console.error('Failed to record visit:', error);
    }

    // Clear destination and navigation state to hide the progress bar
    setDestination('');
    setDestinationCoords(null);
    setRouteProgress(0);
    setDistanceToDestination(null);
    setEstimatedTime(null);
    setSelectedFeature(null);
    setSelectedPOI(null);

    // Clear the route from the map
    webViewRef.current?.injectJavaScript('window.clearRoute && window.clearRoute();');
    lastRoute.current = [];

    // Show destination reached message
    setStatus('You have reached your destination!');
    setRouteProgress(100);

    if (isVoiceEnabled) {
      Tts.stop();
      setTimeout(() => {
        Tts.speak('You have reached your destination');
      }, 500);
    }

    // Show alert only once
    Alert.alert('Destination Reached', 'You have arrived at your destination!', [
      { text: 'OK', onPress: () => setStatus('Ready for navigation') },
    ]);
  };

  //add this function to handle report submission
  const submitCrowdReport = async () => {
    if (!selectedPOI || !selectedDensity) {
      setError('Please select a building and density level');
      return;
    }

    try {
      // Save report to Firestore
      await firestore()
        .collection('crowdReports')
        .add({
          buildingId: selectedPOI.id,
          buildingName: selectedPOI.name,
          density: selectedDensity,
          timestamp: firestore.FieldValue.serverTimestamp(),
          reportedBy: auth().currentUser?.uid || 'anonymous',
          centroid: selectedPOI.centroid,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        });

      // Update UI
      const jsCrowdCode = `window.updateCrowdDensity && window.updateCrowdDensity(${selectedPOI.centroid.latitude}, ${selectedPOI.centroid.longitude}, '${selectedDensity}', '${selectedPOI.id}');`;
      webViewRef.current?.injectJavaScript(jsCrowdCode);
      setShowCrowdPopup(false);
      setStatus(`Crowd density reported for ${selectedPOI.name}`);
    } catch (error) {
      console.error('Error saving crowd report:', error);
      setError('Failed to submit crowd report');
    }
  };

  //IMP: temp test to take out later
  const simulateDestinationReached = async () => {
    if (!selectedPOI) {
      console.warn('No POI selected to simulate destination reached.');
      return;
    }

    try {
      const userId = auth().currentUser?.uid;
      if (!userId) return;

      const visit: Visit = {
        userId,
        poiId: selectedPOI.id,
        name: selectedPOI.name,
        timestamp: firestore.Timestamp.now(),
        centroid: selectedPOI.centroid,
      };

      await addRecentlyVisitedPOI(visit);
      console.log('Simulated visit recorded:', selectedPOI.name);
      Alert.alert('Test Successful', `Simulated visit to: ${selectedPOI.name}`);
    } catch (error) {
      console.error('Failed to simulate visit:', error);
      Alert.alert('Error', 'Failed to simulate visit. Please try again.');
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
      setSelectedPOI(selectedFeature);
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
        setSelectedPOI(matchingPOI);
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

        console.log('TTS should speak:', instruction);
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

  const fetchPOIs = async () => {
    try {
      const snapshot = await firestore().collection('UPcampusPOIs').get();
      const poiList = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setPOIs(poiList);
    } catch (e) {
      console.error('Failed to fetch POIs:', e);
    }
  };

  useEffect(() => {
    fetchPOIs();
  }, []);

  // Send POIs to WebView when they change and WebView is ready
  useEffect(() => {
    if (isMapReady && pois.length > 0 && webViewRef.current) {
      // Modify the POI data to set labels to empty by default
      const poisWithHiddenLabels = pois.map((poi) => ({
        ...poi,
        showLabel: false, // Add property to control label visibility
      }));

      const jsPOICode = `window.displayPOIs && window.displayPOIs(${JSON.stringify(poisWithHiddenLabels)});`;
      webViewRef.current.injectJavaScript(jsPOICode);
    }
  }, [isMapReady, pois]);

  const filterPOIs = (query: string) => {
    if (!query.trim()) {
      setPOISuggestions([]);
      return;
    }
    const filtered = pois.filter(
      (poi) => poi.name && poi.name.toLowerCase().includes(query.toLowerCase()),
    );
    setPOISuggestions(filtered);
  };

  const handleSelectPOI = (poi: any) => {
    setHasHandledDeepLink(true); // Prevent deep link from overriding
    // Stop navigation if currently navigating
    if (isNavigating) {
      stopNavigation();
    }

    // Clear any existing route
    webViewRef.current?.injectJavaScript('window.clearRoute && window.clearRoute();');
    lastRoute.current = [];

    setDestination(poi.name);
    setDestinationCoords([poi.centroid.longitude, poi.centroid.latitude]);
    setPOISuggestions([]);

    // Update selected POI and feature for crowd reporting
    setSelectedFeature(poi);
    setSelectedPOI(poi);

    // Automatically fetch route when POI is selected from search
    if (currentLocation) {
      fetchRoute([poi.centroid.longitude, poi.centroid.latitude]);
    }
  };

  // Dynamically request location updates
  useEffect(() => {
    let watchId: number | null = null;

    const startWatchingLocation = async () => {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        watchId = Geolocation.watchPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            sendLocationToWebView(latitude, longitude);
          },
          (error) => {
            setError('Failed to get location');
          },
          { enableHighAccuracy: true, distanceFilter: 5, interval: 2000 },
        );
      } else {
        setError('Location permission denied');
      }
    };

    startWatchingLocation();

    return () => {
      if (watchId !== null) {
        Geolocation.clearWatch(watchId);
      }
    };
  }, []);

  // Helper to calculate distance between two lat/lon points (Haversine formula)
  function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
    const toRad = (x: number) => (x * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Dynamic rerouting if user deviates from route
  useEffect(() => {
    if (
      !isNavigating ||
      !currentLocation ||
      !destinationCoords ||
      !lastRoute.current ||
      lastRoute.current.length === 0 ||
      isRouteLoading
    )
      return;

    // Find nearest point on route
    let minDist = Infinity;
    for (const coord of lastRoute.current) {
      // route is [lng, lat]
      const dist = getDistanceMeters(
        currentLocation.latitude,
        currentLocation.longitude,
        coord[1],
        coord[0],
      );
      if (dist < minDist) minDist = dist;
    }

    // If user is more than 30 meters from the route, reroute
    if (minDist > 30) {
      setStatus('Re-routing...');
      rerouteFromCurrentLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLocation, isNavigating]);

  //Reroute function with haptic feedback
  const rerouteFromCurrentLocation = async () => {
    if (!currentLocation || !destinationCoords || isRouteLoading) return;

    setIsRouteLoading(true);

    try {
      // Trigger haptic feedback when rerouting
      if (isHapticFeedbackEnabled) {
        ReactNativeHapticFeedback.trigger('impactHeavy', hapticOptions);
      }

      const start = `${currentLocation.longitude},${currentLocation.latitude}`;
      const end = `${destinationCoords[0]},${destinationCoords[1]}`;

      // Clear any existing route first
      webViewRef.current?.injectJavaScript('window.clearRoute && window.clearRoute();');

      const url = `${ROUTING_API_BASE}/api/directions?start=${start}&end=${end}`;
      const response = await fetch(url);
      const data = await response.json();

      const coordinates = data.features?.[0]?.geometry?.coordinates;
      if (!coordinates || coordinates.length === 0) throw new Error('No route found');

      lastRoute.current = coordinates;

      // Calculate distance and time for the new route
      let totalDistance = 0;
      for (let i = 0; i < coordinates.length - 1; i++) {
        const point1 = coordinates[i];
        const point2 = coordinates[i + 1];
        totalDistance += getDistanceMeters(point1[1], point1[0], point2[1], point2[0]);
      }

      setDistanceToDestination(totalDistance);
      // Estimate time (assuming average walking speed of 5 km/h = 1.4 m/s)
      const timeMinutes = Math.round(totalDistance / (1.4 * 60));
      setEstimatedTime(timeMinutes);

      const jsRouteCode = `window.drawRoute && window.drawRoute(${JSON.stringify(coordinates)});`;
      webViewRef.current?.injectJavaScript(jsRouteCode);
      setStatus('Route updated!');
    } catch (error) {
      console.error('Route fetch error:', error);
      setError('Failed to fetch or draw route');
    } finally {
      setIsRouteLoading(false);
    }
  };

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

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current) {
        Geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Add this new useEffect after your other useEffects
  useEffect(() => {
    // Only run when navigating
    if (!isNavigating || !currentLocation) return;

    // Force update progress every 0.5 seconds
    const progressInterval = setInterval(() => {
      if (currentLocation && lastRoute.current && lastRoute.current.length > 0) {
        updateNavigationProgress(currentLocation.latitude, currentLocation.longitude);
      }
    }, 500);

    return () => clearInterval(progressInterval);
  }, [isNavigating, currentLocation]);

  // Dynamically request location updates every 3 seconds
  useEffect(() => {
    let watchId: number | null = null;

    const startWatchingLocation = async () => {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        watchId = Geolocation.watchPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            sendLocationToWebView(latitude, longitude);
          },
          (error) => {
            setError('Failed to get location');
          },
          { enableHighAccuracy: true, distanceFilter: 0, interval: 3000, fastestInterval: 3000 },
        );
      } else {
        setError('Location permission denied');
      }
    };

    startWatchingLocation();

    return () => {
      if (watchId !== null) {
        Geolocation.clearWatch(watchId);
      }
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {showCrowdPopup && (
        <CrowdReportModal
          visible={showCrowdPopup}
          selectedDensity={selectedDensity}
          selectedPOI={selectedPOI}
          availablePOIs={pois}
          onChangeDensity={setSelectedDensity}
          onChangePOI={setSelectedPOI}
          onSubmit={submitCrowdReport}
          onCancel={() => setShowCrowdPopup(false)}
        />
      )}

      {showAddPOIModal && (
        <Modal transparent visible animationType="slide">
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.5)',
              padding: 20,
            }}
          >
            <View style={{ backgroundColor: 'white', borderRadius: 10, padding: 20 }}>
              <Text style={{ fontWeight: 'bold' }}>Add Building</Text>
              <Text>Name:</Text>
              <TextInput
                value={buildingName}
                onChangeText={setBuildingName}
                placeholder="Building Name"
                style={{ borderBottomWidth: 1, marginBottom: 10 }}
              />
              <Text>Floors:</Text>
              <TextInput
                value={numberOfFloors}
                onChangeText={setNumberOfFloors}
                placeholder="e.g. 3"
                keyboardType="numeric"
                style={{ borderBottomWidth: 1, marginBottom: 10 }}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Pressable onPress={() => setShowAddPOIModal(false)}>
                  <Text>Cancel</Text>
                </Pressable>
                <Pressable onPress={submitNewBuilding}>
                  <Text style={{ fontWeight: 'bold' }}>Add</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {showEditPOIModal && (
        <Modal transparent visible animationType="slide">
          <View
            style={{
              flex: 1,
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.5)',
              padding: 20,
            }}
          >
            <View style={{ backgroundColor: 'white', borderRadius: 10, padding: 20 }}>
              <Text style={{ fontWeight: 'bold' }}>Edit Building</Text>
              <Text>Name:</Text>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="New Name"
                style={{ borderBottomWidth: 1, marginBottom: 10 }}
              />
              <Text>Floors:</Text>
              <TextInput
                value={newFloors}
                onChangeText={setNewFloors}
                placeholder="e.g. 4"
                keyboardType="numeric"
                style={{ borderBottomWidth: 1, marginBottom: 10 }}
              />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Pressable onPress={() => setShowEditPOIModal(false)}>
                  <Text>Cancel</Text>
                </Pressable>
                <Pressable onPress={submitEditBuilding}>
                  <Text style={{ fontWeight: 'bold' }}>Save</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      )}

      <DirectionsModal
        visible={showDirectionsSheet}
        onClose={() => setShowDirectionsSheet(false)}
        onStart={() => {
          setIsNavigating(true);
          setShouldStartTTS(true);
          setCurrentStep(0);
          setShowDirectionsSheet(false);
          console.log('Navigation started');
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
              lastRoute.current = [];
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
          time={estimatedTime}
          destination={destination}
          isVoiceEnabled={isVoiceEnabled}
          onToggleVoice={() => setIsVoiceEnabled(!isVoiceEnabled)}
          currentInstruction={steps[currentStep]?.instruction}
          onSpeakingChange={setIsSpeaking}
        />
      )}

      <MapActionsPanel
        currentLocation={!!currentLocation}
        onShare={shareLocation}
        onReport={openCrowdReportModal}
        isAdmin={isAdmin}
        onAddPOI={() => {
          webViewRef.current?.injectJavaScript(`window.enableAdminPOICreation();`);
          setTempMessage('Click on the map to add a new POI');
        }}
        shareTooltip={showShareTooltip}
        reportTooltip={showReportTooltip}
        onShareIn={() => setShowShareTooltip(true)}
        onShareOut={() => setShowShareTooltip(false)}
        onReportIn={() => setShowReportTooltip(true)}
        onReportOut={() => setShowReportTooltip(false)}
        color={colors.primary}
      />

      {/* AR Navigation Toggle Button */}
      {isNavigating && destinationCoords && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            bottom: 120,
            right: 20,
            backgroundColor: showAR ? colors.primary : colors.card,
            width: 56,
            height: 56,
            borderRadius: 28,
            justifyContent: 'center',
            alignItems: 'center',
            elevation: 6,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
          }}
          onPress={handleARToggle}
        >
          <Text
            style={{
              color: showAR ? 'white' : colors.text,
              fontSize: 12,
              fontWeight: 'bold',
            }}
          >
            AR
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
        />
      )}

      {isNavigating && steps.length > 0 && (
        <Pressable
          onPress={() => setShowDirectionsSheet(true)}
          style={{
            position: 'absolute',
            top: 59,
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
      {/* Admin Actions Modal */}
      {showAdminActions && adminActionPOI && (
        <Modal
          transparent
          visible={true}
          animationType="fade"
          statusBarTranslucent={true}
          onRequestClose={() => setShowAdminActions(false)}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.5)',
              justifyContent: 'center',
              alignItems: 'center',
              padding: 24,
              zIndex: 9999,
            }}
          >
            <View
              style={{
                backgroundColor: '#fff',
                borderRadius: 12,
                padding: 24,
                alignItems: 'center',
                minWidth: 250,
              }}
            >
              <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 16 }}>
                Building: {adminActionPOI.name}
              </Text>

              {/* Edit Building Button */}
              <TouchableOpacity
                style={{
                  backgroundColor: '#FF9800',
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                  borderRadius: 8,
                  marginBottom: 12,
                  width: 200,
                  alignItems: 'center',
                }}
                onPress={() => {
                  openEditBuildingModal(adminActionPOI);
                  setShowAdminActions(false);
                }}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Edit</Text>
              </TouchableOpacity>

              {/* Delete Building Button */}
              <TouchableOpacity
                style={{
                  backgroundColor: '#D32F2F',
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                  borderRadius: 8,
                  marginBottom: 12,
                  width: 200,
                  alignItems: 'center',
                }}
                onPress={() => {
                  confirmDeleteBuilding(adminActionPOI);
                  setShowAdminActions(false);
                }}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Delete</Text>
              </TouchableOpacity>

              {/* Cancel Button */}
              <TouchableOpacity
                style={{
                  backgroundColor: '#B0B0B0',
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                  borderRadius: 8,
                  width: 200,
                  alignItems: 'center',
                }}
                onPress={() => setShowAdminActions(false)}
              >
                <Text style={{ color: 'white', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
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

      <TouchableOpacity //IMP: test to take out laters
        style={{
          position: 'absolute',
          bottom: 50, // Adjust position to avoid overlap with the admin button
          right: 20,
          backgroundColor: 'blue',
          paddingVertical: 10,
          paddingHorizontal: 16,
          borderRadius: 8,
          elevation: 4,
        }}
        onPress={simulateDestinationReached}
      >
        <Text style={{ color: 'white', textAlign: 'center' }}>Simulate Destination Reached</Text>
      </TouchableOpacity>
    </View>
  );
};

export default MapScreen;
