import { useState, useRef, useCallback, useEffect } from 'react';
import { PermissionsAndroid } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Tts from 'react-native-tts';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { addRecentlyVisitedPOI, Visit } from '../services/firebase/recentlyVService';
import Reactotron from 'reactotron-react-native';

interface LocationState {
  latitude: number;
  longitude: number;
}

interface UseMapNavigationReturn {
  // State
  steps: any[];
  currentStep: number;
  routeProgress: number;
  distanceToDestination: number | null;
  estimatedTime: number | null;
  hasReachedDestination: boolean;
  distanceWalked: number;
  originalRouteDistance: number | null;
  startLocation: LocationState | null;
  isRouteLoading: boolean;
  destinationCoords: [number, number] | null;
  routeCoordinates: any[];

  // Functions
  fetchRoute: (destCoords: [number, number]) => Promise<void>;
  startNavigation: () => void;
  stopNavigation: () => void;
  destinationReached: () => Promise<void>;
  rerouteFromCurrentLocation: () => Promise<void>;
  updateNavigationProgress: (latitude: number, longitude: number) => void;
  startNavigationTracking: () => void;
  stopNavigationTracking: () => void;

  // Setters
  setSteps: (steps: any[]) => void;
  setCurrentStep: (step: number) => void;
  setRouteProgress: (progress: number) => void;
  setDistanceToDestination: (distance: number | null) => void;
  setEstimatedTime: (time: number | null) => void;
  setHasReachedDestination: (reached: boolean) => void;
  setDistanceWalked: (distance: number) => void;
  setOriginalRouteDistance: (distance: number | null) => void;
  setStartLocation: (location: LocationState | null) => void;
  setDestinationCoords: (coords: [number, number] | null) => void;
}

const ROUTING_API_BASE = 'https://snap-vision-backend--snap-vision-f6954.europe-west4.hosted.app';
// emulator: 10.0.2.2
// B home:  192.168.56.1
// L wifi: 192.168.0.127
// T home: 192.168.0.133
// T data: 192.168.43.155
// Th home: 10.0.0.9
// T Durban: 192.168.1.93
// S home:  192.168.0.197
// L harties: 192.168.101.238

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

// GPS smoothing function to reduce location jumping
function smoothGPSLocation(
  newLocation: { latitude: number; longitude: number },
  history: Array<{ lat: number; lon: number; timestamp: number }>,
  lastSmoothed: { latitude: number; longitude: number } | null,
): { latitude: number; longitude: number } {
  const now = Date.now();

  // Add to history
  history.push({ lat: newLocation.latitude, lon: newLocation.longitude, timestamp: now });

  // Keep only last 10 seconds of data
  const cutoff = now - 10000;
  while (history.length > 0 && history[0].timestamp < cutoff) {
    history.shift();
  }

  // If we have previous smoothed location, check if new reading is reasonable
  if (lastSmoothed && history.length > 1) {
    const distanceFromPrevious = getDistanceMeters(
      lastSmoothed.latitude,
      lastSmoothed.longitude,
      newLocation.latitude,
      newLocation.longitude,
    );

    // If GPS jumped more than 50m, use weighted average with previous location
    if (distanceFromPrevious > 50) {
      return {
        latitude: lastSmoothed.latitude * 0.7 + newLocation.latitude * 0.3,
        longitude: lastSmoothed.longitude * 0.7 + newLocation.longitude * 0.3,
      };
    }
  }

  // Use weighted average of recent locations
  if (history.length >= 3) {
    let totalWeight = 0;
    let weightedLat = 0;
    let weightedLon = 0;

    history.forEach((loc, index) => {
      const weight = index + 1; // More recent = higher weight
      weightedLat += loc.lat * weight;
      weightedLon += loc.lon * weight;
      totalWeight += weight;
    });

    return {
      latitude: weightedLat / totalWeight,
      longitude: weightedLon / totalWeight,
    };
  }

  return newLocation;
}

const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

export const useMapNavigation = (
  currentLocation: LocationState | null,
  isMapReady: boolean,
  webViewRef: React.RefObject<any>,
  setStatus: (status: string) => void,
  setError: (error: string | null) => void,
  isHapticFeedbackEnabled: boolean,
  isVoiceEnabled: boolean,
  selectedPOI: any,
  unlock: (badgeId: string) => Promise<void>,
  incrementRoutes: () => Promise<void>,
  setNavigationStartTime: (time: number) => void,
  setShowDestinationReachedPopup: (show: boolean) => void,
  setShowDirectionsSheet: (show: boolean) => void,
  isNavigating: boolean,
  setIsNavigating: (navigating: boolean) => void,
): UseMapNavigationReturn => {
  // Navigation state
  const [steps, setSteps] = useState<any[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [routeProgress, setRouteProgress] = useState(0);
  const [distanceToDestination, setDistanceToDestination] = useState<number | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const [hasReachedDestination, setHasReachedDestination] = useState(false);
  const [distanceWalked, setDistanceWalked] = useState(0);
  const [originalRouteDistance, setOriginalRouteDistance] = useState<number | null>(null);
  const [startLocation, setStartLocation] = useState<LocationState | null>(null);
  const [isRouteLoading, setIsRouteLoading] = useState(false);
  const [destinationCoords, setDestinationCoords] = useState<[number, number] | null>(null);

  // Navigation route reference
  const lastRoute = useRef<any[]>([]);
  const navigationWatchId = useRef<number | null>(null);
  const locationHistory = useRef<Array<{ lat: number; lon: number; timestamp: number }>>([]);
  const lastSmoothedLocation = useRef<{ latitude: number; longitude: number } | null>(null);

  const fetchRoute = async (destCoords: [number, number]) => {
    if (!currentLocation) {
      setError('Your location is not available yet');
      return;
    }

    // start performance requiremnet testing
    const startTime = performance.now();
    Reactotron.display({
      name: 'Route Generation Started',
      preview: `From: ${currentLocation.latitude}, ${currentLocation.longitude}`,
      value: {
        start: currentLocation,
        destination: destCoords,
        timestamp: startTime,
      },
    });

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

      if (isMapReady && webViewRef.current) {
        const jsRouteCode = `window.drawRoute && window.drawRoute(${JSON.stringify(coordinates)});`;
        webViewRef.current.injectJavaScript(jsRouteCode);
      }
      setStatus('Route found!');
      const stepsArr = data.features?.[0]?.properties?.segments?.[0]?.steps || [];
      setSteps(stepsArr);
      setCurrentStep(0);
      setShowDirectionsSheet(true);

      // Reset progress
      setRouteProgress(0);

      //end performance requirement testing
      const endTime = performance.now();
      const duration = endTime - startTime;
      const passed = duration < 300;

      Reactotron.display({
        name: 'Route Generation Complete',
        preview: `${duration.toFixed(2)}ms ${passed ? 'PASS' : 'FAIL'}`,
        value: {
          duration: `${duration.toFixed(2)}ms`,
          passedTest: passed,
          requirement: '< 300ms',
          totalDistance: `${totalDistance.toFixed(0)}m`,
          status: 'SUCCESS',
        },
      });
    } catch (error) {
      //consoleerror('Route fetch error:', error);
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
    setHasReachedDestination(false);

    // Initialize enhanced progress tracking
    setDistanceWalked(0);
    setStartLocation(currentLocation);
    if (distanceToDestination !== null) {
      setOriginalRouteDistance(distanceToDestination);
    }

    // Start navigation tracking via location hook
    startNavigationTracking();
  };

  // Stop navigation function with haptic feedback
  const stopNavigation = () => {
    // Stop navigation tracking via location hook
    stopNavigationTracking();

    // Haptic feedback when stopping navigation
    if (isHapticFeedbackEnabled) {
      ReactNativeHapticFeedback.trigger('impactLight', hapticOptions);
    }

    setIsNavigating(false);
    setHasReachedDestination(false);
    setStatus('Navigation stopped');
    if (isMapReady && webViewRef.current) {
      webViewRef.current.injectJavaScript(
        'window.setNavigationState && window.setNavigationState(false);',
      );
    }

    // Clear progress line
    if (isMapReady && webViewRef.current) {
      webViewRef.current.injectJavaScript(
        'if (window.progressLine) { map.removeLayer(window.progressLine); window.progressLine = null; }',
      );
    }

    // Reset enhanced progress tracking when stopping
    setDistanceWalked(0);
    setStartLocation(null);
    setOriginalRouteDistance(null);
  };

  // Destination reached function with haptic feedback
  const destinationReached = async () => {
    if (!isNavigating || hasReachedDestination) return;

    // Set the flag immediately to prevent re-entry
    setHasReachedDestination(true);
    setIsNavigating(false);

    // Stop all location tracking immediately
    stopNavigationTracking();

    try {
      // Trigger success haptic feedback ONCE
      if (isHapticFeedbackEnabled) {
        ReactNativeHapticFeedback.trigger('notificationSuccess', hapticOptions);
      }

      await unlock('destination-reached');
      await incrementRoutes();

      const userId = auth().currentUser?.uid;
      if (userId && selectedPOI) {
        const visit: Visit = {
          userId,
          poiId: selectedPOI.id,
          name: selectedPOI.name,
          timestamp: firestore.Timestamp.now(),
          centroid: selectedPOI.centroid,
        };
        await addRecentlyVisitedPOI(visit);
      }
    } catch (error) {
      //consoleerror('Failed to record visit:', error);
    }

    setStatus('You have reached your destination!');
    setRouteProgress(100);

    if (isVoiceEnabled) {
      Tts.stop();
      setTimeout(() => {
        Tts.speak('You have reached your destination');
      }, 500);
    }
    // Clear progress line from map
    if (isMapReady && webViewRef.current) {
      webViewRef.current.injectJavaScript(
        'if (window.progressLine) { map.removeLayer(window.progressLine); window.progressLine = null; }',
      );
    }

    // Show destination reached popup
    setShowDestinationReachedPopup(true);
  };

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

      // Enhanced status message showing rerouting doesn't reset progress
      const walkedFormatted =
        distanceWalked >= 1000
          ? `${(distanceWalked / 1000).toFixed(1)}km walked`
          : `${Math.round(distanceWalked)}m walked`;

      setStatus(`Route updated! ${walkedFormatted} progress preserved`);
    } catch (error) {
      //consoleerror('Route fetch error:', error);
      setError('Failed to fetch or draw route');
    } finally {
      setIsRouteLoading(false);
    }
  };

  // Update the updateNavigationProgress function to check for destination arrival
  const updateNavigationProgress = useCallback(
    (latitude: number, longitude: number) => {
      // Add safety checks at the beginning
      if (!lastRoute.current || lastRoute.current.length === 0 || hasReachedDestination) {
        return;
      }

      // Apply GPS smoothing
      const rawLocation = { latitude, longitude };
      const smoothedLocation = smoothGPSLocation(
        rawLocation,
        locationHistory.current,
        lastSmoothedLocation.current,
      );
      lastSmoothedLocation.current = smoothedLocation;

      // Use smoothed coordinates for all calculations
      const smoothedLat = smoothedLocation.latitude;
      const smoothedLon = smoothedLocation.longitude;

      // Calculate distance walked from start location (never decreases)
      if (startLocation && isNavigating) {
        const totalWalked = getDistanceMeters(
          startLocation.latitude,
          startLocation.longitude,
          smoothedLat,
          smoothedLon,
        );

        // Only update if we've walked further (prevents decrease on rerouting)
        if (totalWalked > distanceWalked) {
          setDistanceWalked(totalWalked);
        }
      }

      // Find closest point on the route with improved logic to prevent backtracking
      let minDist = Infinity;
      let closestPointIndex = 0;
      let currentProgressIndex = Math.max(
        0,
        Math.floor((routeProgress / 100) * (lastRoute.current.length - 1)),
      );

      // Search in a range around current progress to prevent sudden jumps backward
      const searchStart = Math.max(0, currentProgressIndex - 5);
      const searchEnd = Math.min(lastRoute.current.length, currentProgressIndex + 15);

      for (let i = searchStart; i < searchEnd; i++) {
        const routePoint = lastRoute.current[i];

        // Add safety check for each route point
        if (!Array.isArray(routePoint) || routePoint.length < 2) {
          //consolewarn('Invalid route point at index', i, routePoint);
          continue;
        }

        const distance = getDistanceMeters(
          smoothedLat,
          smoothedLon,
          routePoint[1], // Latitude
          routePoint[0], // Longitude
        );

        // Prefer points ahead in the route when distances are similar
        const progressBias = i >= currentProgressIndex ? 0 : distance * 0.5; // Add penalty for backward points
        const adjustedDistance = distance + progressBias;

        if (adjustedDistance < minDist) {
          minDist = distance; // Use original distance for threshold checks
          closestPointIndex = i;
        }
      }

      // Fallback: if no point found in range, search entire route
      if (minDist > 50) {
        // If still too far, search entire route
        for (let i = 0; i < lastRoute.current.length; i++) {
          const routePoint = lastRoute.current[i];
          if (!Array.isArray(routePoint) || routePoint.length < 2) continue;

          const distance = getDistanceMeters(
            smoothedLat,
            smoothedLon,
            routePoint[1],
            routePoint[0],
          );

          if (distance < minDist) {
            minDist = distance;
            closestPointIndex = i;
          }
        }
      }

      // Check for route deviation and automatic rerouting
      if (minDist > 30 && !isRouteLoading) {
        setStatus('Re-routing...');
        rerouteFromCurrentLocation();
        return; // Exit early to prevent further processing during reroute
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
          smoothedLat,
          smoothedLon,
          currentPoint[1],
          currentPoint[0],
        );

        // Distance from user to next point
        const distToNext = getDistanceMeters(smoothedLat, smoothedLon, nextPoint[1], nextPoint[0]);

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

          // Fix: Add safety checks before destructuring
          let stepCoordinate;
          if (
            step.way_points &&
            step.way_points[0] !== undefined &&
            lastRoute.current[step.way_points[0]]
          ) {
            stepCoordinate = lastRoute.current[step.way_points[0]];
          } else if (lastRoute.current[0]) {
            stepCoordinate = lastRoute.current[0];
          } else {
            continue; // Skip this iteration if no valid coordinate
          }

          // Additional safety check - ensure stepCoordinate is an array with 2 elements
          if (!Array.isArray(stepCoordinate) || stepCoordinate.length < 2) {
            continue;
          }

          const [lon, lat] = stepCoordinate;
          const dist = getDistanceMeters(smoothedLat, smoothedLon, lat, lon);
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
        smoothedLat,
        smoothedLon,
        destinationPoint[1],
        destinationPoint[0],
      );

      // Update distance to destination
      setDistanceToDestination(distanceToEnd);

      // Show enhanced status with distance walked and remaining
      const walkedFormatted =
        distanceWalked >= 1000
          ? `${(distanceWalked / 1000).toFixed(1)}km walked`
          : `${Math.round(distanceWalked)}m walked`;

      const remainingFormatted =
        distanceToEnd >= 1000
          ? `${(distanceToEnd / 1000).toFixed(1)}km remaining`
          : `${Math.round(distanceToEnd)}m remaining`;

      setStatus(`${walkedFormatted} • ${remainingFormatted}`);

      // Update route progress visually
      if (webViewRef.current && isMapReady) {
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
      if ((newProgress >= 100 || distanceToEnd < 3) && isNavigating && !hasReachedDestination) {
        destinationReached();
      }
    },
    [
      hasReachedDestination,
      startLocation,
      isNavigating,
      distanceWalked,
      steps,
      currentStep,
      webViewRef,
      isMapReady,
      destinationReached,
    ],
  );

  // Navigation-specific tracking functions (self-contained)
  const startNavigationTracking = useCallback(async () => {
    // Stop any existing tracking
    if (navigationWatchId.current) {
      Geolocation.clearWatch(navigationWatchId.current);
    }

    try {
      const permissions = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
      ]);

      const fineGranted = permissions['android.permission.ACCESS_FINE_LOCATION'] === 'granted';
      const coarseGranted = permissions['android.permission.ACCESS_COARSE_LOCATION'] === 'granted';

      if (fineGranted || coarseGranted) {
        navigationWatchId.current = Geolocation.watchPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            // Call navigation progress callback
            updateNavigationProgress(latitude, longitude);
          },
          (error) => {
            setError('Failed to track location during navigation');
          },
          {
            enableHighAccuracy: true,
            distanceFilter: 2, // Update every 2 meters during navigation (more sensitive)
            interval: 800, // Update every 0.8 seconds (faster updates)
            timeout: 20000,
            maximumAge: 3000, // Use fresher GPS data
          },
        );
      }
    } catch (err) {
      setError('Failed to setup navigation tracking');
    }
  }, [updateNavigationProgress, setError]);

  const stopNavigationTracking = useCallback(() => {
    if (navigationWatchId.current) {
      Geolocation.clearWatch(navigationWatchId.current);
      navigationWatchId.current = null;
    }
  }, []);

  return {
    // State
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
    routeCoordinates: lastRoute.current,

    // Functions
    fetchRoute,
    startNavigation,
    stopNavigation,
    destinationReached,
    rerouteFromCurrentLocation,
    updateNavigationProgress,
    startNavigationTracking,
    stopNavigationTracking,

    // Setters
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
  };
};
