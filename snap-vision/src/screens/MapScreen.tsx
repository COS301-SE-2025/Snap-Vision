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

import { useBadges } from '../context/BadgeContext';

type MapScreenParams = {
  lat?: string;
  lng?: string;
};

const ROUTING_API_BASE = 'http://10.0.2.2:3000'; // <-- Use your correct backend IP here
// emulator: 10.0.2.2
// B home:  192.168.56.1
// L wifi: 192.168.0.127
// T home: 192.168.0.133
// T data: 192.168.43.155
// Th home: 10.0.0.9

const MapScreen = () => {
  const lastRoute = useRef<any[]>([]);
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const watchIdRef = useRef<number | null>(null);

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

  // share location things
  const route = useRoute();
  const params = route.params as MapScreenParams;
  const [hasHandledDeepLink, setHasHandledDeepLink] = useState(false);

  const { unlock, incrementRoutes } = useBadges();
  const { setNavigationStartTime } = useBadges();

  // crowd reports
  const [selectedPOI, setSelectedPOI] = useState<any>(null);
  const [crowdReports, setCrowdReports] = useState<Record<string, any>>({});
  const [selectedFeature, setSelectedFeature] = useState<any>(null);

  //Admin stuff
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAddPOIModal, setShowAddPOIModal] = useState(false);
  const [addPOICoords, setAddPOICoords] = useState<{ lat: number; lon: number } | null>(null);
  const [buildingName, setBuildingName] = useState('');
  const [numberOfFloors, setNumberOfFloors] = useState('');
  const [showEditPOIModal, setShowEditPOIModal] = useState(false);
  const [editingPOI, setEditingPOI] = useState<any>(null);
  const [newName, setNewName] = useState('');
  const [newFloors, setNewFloors] = useState('');

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
    const jsCode = `window.updateUserLocation && window.updateUserLocation(${lat}, ${lon}, ${centerMap});`;
    webViewRef.current?.injectJavaScript(jsCode);

    // Always update progress when navigating - force this to run
    if (isNavigating && lastRoute.current && lastRoute.current.length > 0) {
      // Add visual feedback that we're updating
      setStatus(`Updating location: ${lat.toFixed(6)}, ${lon.toFixed(6)}`);

      // Call updateNavigationProgress directly
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

  const handleWebViewMessage = (event: any) => {
    try {
      const data = event.nativeEvent.data;

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

      // Helper: Confirm delete
      const confirmDeleteBuilding = (poi: any) => {
        Alert.alert('Delete Building', `Are you sure you want to delete "${poi.name}"?`, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await firestore().collection('UPcampusPOIs').doc(poi.id).delete();
              fetchPOIs(); // refresh POI list
            },
          },
        ]);
      };

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

          if (isAdmin) {
            Alert.alert(`Building: ${selectedPOI.name}`, 'Admin Actions', [
              { text: 'Edit', onPress: () => openEditBuildingModal(selectedPOI) },
              { text: 'Delete', onPress: () => confirmDeleteBuilding(selectedPOI) },
              { text: 'Cancel', style: 'cancel' },
            ]);
          }

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

  //Edit Building(name and floors)
  const submitEditBuilding = async () => {
    if (!newName.trim()) return Alert.alert('Building name required');
    if (!newFloors.trim() || isNaN(Number(numberOfFloors)))
      return Alert.alert('Please enter a valid number of floors');
    try {
      await firestore()
        .collection('UPcampusPOIs')
        .doc(editingPOI.id)
        .update({
          name: newName,
          floors: Number(newFloors),
        });
      setShowEditPOIModal(false);
      fetchPOIs();
      setStatus('Building updated!');
    } catch {
      setError('Failed to update');
    }
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

  // const submitCrowdReport = () => {
  //   if (!currentLocation) return;
  //   const jsCrowdCode = `window.updateCrowdDensity && window.updateCrowdDensity(${currentLocation.latitude}, ${currentLocation.longitude}, '${selectedDensity}');`;
  //   webViewRef.current?.injectJavaScript(jsCrowdCode);
  //   setShowCrowdPopup(false);
  //   setStatus(`Crowd density reported: ${selectedDensity}`);
  //   unlock('reported-crowd');
  // };

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

  // Start navigation function
  const startNavigation = () => {
    if (!currentLocation || !destinationCoords || lastRoute.current.length === 0) {
      setError('Cannot start navigation without a route');
      return;
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
        sendLocationToWebView(latitude, longitude);
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

  // Stop navigation function
  const stopNavigation = () => {
    if (watchIdRef.current) {
      Geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    setIsNavigating(false);
    setStatus('Navigation stopped');
    webViewRef.current?.injectJavaScript(
      'window.setNavigationState && window.setNavigationState(false);',
    );

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
    // 2. Distance to destination is less than 20 meters
    if (newProgress >= 100 || distanceToEnd < 20) {
      destinationReached();
    }
  };

  // Add this new function to handle reaching the destination
  const destinationReached = async () => {
    if (!isNavigating) return; // Only handle if actually navigating

    try {
      await unlock('destination-reached');
      await incrementRoutes();
    } catch (e) {
      console.warn('Failed to update badge state:', e);
    }

    // Stop navigation
    stopNavigation();

    // Show destination reached message
    setStatus('You have reached your destination!');

    // Ensure progress is set to 100%
    setRouteProgress(100);

    // Speak the arrival message if voice is enabled
    if (isVoiceEnabled) {
      Tts.stop();
      setTimeout(() => {
        Tts.speak('You have reached your destination');
      }, 500);
    }

    // Optional: Show a congratulatory alert
    Alert.alert('Destination Reached', 'You have arrived at your destination!', [
      { text: 'OK', onPress: () => console.log('Destination reached acknowledged') },
    ]);
  };

  // Add this function to handle report submission
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

  // Add function to fetch recent crowd reports
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

  // Add useEffect to fetch crowd reports periodically
  useEffect(() => {
    if (isMapReady) {
      fetchRecentCrowdReports();
      const interval = setInterval(fetchRecentCrowdReports, 5 * 60 * 1000); // Refresh every 5 minutes

      return () => clearInterval(interval);
    }
  }, [isMapReady]);

  // Add a function to handle opening the crowd report modal
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
    if (isNavigating && shouldStartTTS && steps.length > 0 && currentStep < steps.length) {
      const instruction = steps[currentStep]?.instruction;
      if (instruction) {
        console.log('TTS should speak:', instruction);
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
  }, [isNavigating, shouldStartTTS, steps, currentStep]);

  useEffect(() => {
    if (isNavigating && steps.length > 0 && currentStep < steps.length) {
      const instruction = steps[currentStep]?.instruction;
      if (instruction) {
        Tts.stop();
        setTimeout(() => {
          Tts.speak(instruction);
        }, 500);
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

  //Old version, took it out of useEffect for reusability
  // useEffect(() => {
  //   const fetchPOIs = async () => {
  //     try {
  //       const snapshot = await firestore().collection('UPcampusPOIs').get();
  //       const poiList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  //       setPOIs(poiList);
  //     } catch (e) {
  //       console.error('Failed to fetch POIs:', e);
  //     }
  //   };
  //   fetchPOIs();
  // }, []);

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

  // Reroute function
  const rerouteFromCurrentLocation = async () => {
    if (!currentLocation || !destinationCoords || isRouteLoading) return;

    setIsRouteLoading(true);

    try {
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

    // Force update progress every 2 seconds
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
        shareTooltip={showShareTooltip}
        reportTooltip={showReportTooltip}
        onShareIn={() => setShowShareTooltip(true)}
        onShareOut={() => setShowShareTooltip(false)}
        onReportIn={() => setShowReportTooltip(true)}
        onReportOut={() => setShowReportTooltip(false)}
        color={colors.primary}
      />

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
      {error && <StatusOverlay status={error} />}

      {isAdmin && (
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
      )}
    </View>
  );
};

export default MapScreen;
