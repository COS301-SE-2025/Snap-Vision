import { useState, useEffect, useCallback } from 'react';
import { RoomPOI } from './useRoomManager';
import { calculateMultiFloorRoute, NavigationStep, PathPOI } from '../utils/navigationUtils';
import firestore from '@react-native-firebase/firestore';

interface NavigationState {
  isNavigating: boolean;
  destination: RoomPOI | null;
  currentStep: number;
  steps: NavigationStep[];
  routePolyline: { x: number; y: number }[];
  completedPolyline: { x: number; y: number }[];
}

interface UseNavigationManagerParams {
  locationId: string;
  buildingId: string;
  currentPosition: { x: number; y: number } | null;
  allRooms: RoomPOI[];
}

const DESTINATION_THRESHOLD = 0.08; // 8% of map size - more forgiving
const STEP_THRESHOLD = 0.05; // 5% of map size for step completion - more forgiving

export function useNavigationManager({
  locationId,
  buildingId,
  currentPosition,
  allRooms,
}: UseNavigationManagerParams) {
  const [navigationState, setNavigationState] = useState<NavigationState>({
    isNavigating: false,
    destination: null,
    currentStep: 0,
    steps: [],
    routePolyline: [],
    completedPolyline: [],
  });

  const [pathPOIs, setPathPOIs] = useState<PathPOI[]>([]);
  const [destinationReached, setDestinationReached] = useState(false);

  // Load path POIs from Firestore (admin-defined paths)
  useEffect(() => {
    const loadPathPOIs = async () => {
      try {
        //console.log('[NAV] Loading paths for location:', locationId, 'building:', buildingId);

        // Load from locations/{locationId}/pathPOIs collection
        const pathsSnapshot = await firestore()
          .collection('locations')
          .doc(locationId)
          .collection('pathPOIs')
          .where('buildingId', '==', buildingId)
          .get();

        const paths: PathPOI[] = pathsSnapshot.docs.map((doc) => {
          const data = doc.data();
          //console.log('[NAV] Path document:', doc.id, data);
          return {
            id: doc.id,
            ...data,
          };
        }) as PathPOI[];

        setPathPOIs(paths);
        //console.log(`[NAV] Loaded ${paths.length} path segments for building ${buildingId}`);
        //console.log('[NAV] Path POIs:', paths);
      } catch (error) {
        //console.error('[NAV] Error loading paths:', error);
      }
    };

    if (locationId && buildingId) {
      loadPathPOIs();
    }
  }, [locationId, buildingId]);

  // Find nearest room to current position
  const findNearestRoom = useCallback(
    (position: { x: number; y: number }): RoomPOI | null => {
      if (!allRooms.length) return null;

      let nearest = allRooms[0];
      let minDistance = Math.sqrt(
        Math.pow(position.x - nearest.coordinates.x, 2) +
          Math.pow(position.y - nearest.coordinates.y, 2),
      );

      for (const room of allRooms) {
        const distance = Math.sqrt(
          Math.pow(position.x - room.coordinates.x, 2) +
            Math.pow(position.y - room.coordinates.y, 2),
        );

        if (distance < minDistance) {
          minDistance = distance;
          nearest = room;
        }
      }

      return nearest;
    },
    [allRooms],
  );

  // Calculate distance between two points
  const calculateDistance = useCallback(
    (point1: { x: number; y: number }, point2: { x: number; y: number }): number => {
      return Math.sqrt(Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2));
    },
    [],
  );

  // Start navigation to destination
  const startNavigation = useCallback(
    async (destination: RoomPOI) => {
      //console.log('[NAV] startNavigation called with destination:', destination.name);
      //console.log('[NAV] Current position:', currentPosition);
      //console.log('[NAV] Available rooms:', allRooms.length);
      //console.log('[NAV] Available paths:', pathPOIs.length);

      let startRoom: RoomPOI | null = null;

      if (currentPosition) {
        // Use current position to find nearest room
        startRoom = findNearestRoom(currentPosition);
        //console.log('[NAV] Found nearest room to current position:', startRoom?.name);
      } else {
        // Fallback: use any room on the same floor as destination
        startRoom =
          allRooms.find(
            (room) => room.floorId === destination.floorId && room.id !== destination.id,
          ) || allRooms[0];
        //console.log('[NAV] No current position, using fallback room:', startRoom?.name);
      }

      if (!startRoom) {
        //console.warn('[NAV] Cannot start navigation: no rooms available');
        return false;
      }

      //console.log(
      //   `[NAV] Starting navigation from ${startRoom.name} (${startRoom.id}) to ${destination.name} (${destination.id})`,
      // );

      try {
        // Calculate route using existing navigation utils
        // Note: function signature is calculateMultiFloorRoute(startRoomId, endRoomId, roomPOIs, pathPOIs, opts?)
        let steps = calculateMultiFloorRoute(startRoom.id, destination.id, allRooms, pathPOIs);

        //console.log('[NAV] Route calculation result:', steps);

        // If no route found with paths, create a simple direct route
        if (!steps.length) {
          //console.log('[NAV] No path-based route found, creating direct route');

          // Use actual current position or fallback to start room
          const startCoordinates = currentPosition || startRoom.coordinates;

          steps = [
            {
              instruction: currentPosition
                ? `Begin navigation from your current location`
                : `Begin navigation from ${startRoom.name}`,
              coordinates: startCoordinates,
              type: 'start' as const,
              distance: 0,
            },
            {
              instruction: `Head directly to ${destination.name}`,
              coordinates: destination.coordinates,
              type: 'destination' as const,
              distance: calculateDistance(startCoordinates, destination.coordinates),
            },
          ];
          //console.log('[NAV] Created direct route with steps:', steps);
        } else {
          // If we have a path-based route but current position is available,
          // modify the first step to start from actual current location
          if (currentPosition && steps.length > 0) {
            //console.log('[NAV] Adjusting route to start from current position');
            steps[0] = {
              ...steps[0],
              instruction: `Begin navigation from your current location`,
              coordinates: currentPosition,
              distance: 0,
            };

            // If there's a second step, update its distance
            if (steps.length > 1) {
              steps[1] = {
                ...steps[1],
                distance: calculateDistance(currentPosition, steps[1].coordinates),
              };
            }
          }
        }

        if (!steps.length) {
          //console.warn('[NAV] Still no route found to destination');
          return false;
        }

        // Extract polyline from steps
        const routePolyline = steps.map((step) => step.coordinates);

        setNavigationState({
          isNavigating: true,
          destination,
          currentStep: 0,
          steps,
          routePolyline,
          completedPolyline: [],
        });

        //console.log(`[NAV] Route calculated with ${steps.length} steps`);
        //console.log('[NAV] Navigation state updated, isNavigating should be true');
        //console.log('[NAV] Current navigation state after update:', {
        //   isNavigating: true,
        //   destination: destination.name,
        //   currentStep: 0,
        //   stepsLength: steps.length,
        // });
        return true;
      } catch (error) {
        //console.error('[NAV] Error calculating route:', error);

        // Fallback: create simple direct route from current position
        try {
          //console.log('[NAV] Attempting fallback direct route');

          const startCoordinates = currentPosition || startRoom.coordinates;

          const steps = [
            {
              instruction: currentPosition
                ? `Begin navigation from your current location`
                : `Begin navigation from ${startRoom.name}`,
              coordinates: startCoordinates,
              type: 'start' as const,
              distance: 0,
            },
            {
              instruction: `Head directly to ${destination.name}`,
              coordinates: destination.coordinates,
              type: 'destination' as const,
              distance: calculateDistance(startCoordinates, destination.coordinates),
            },
          ];

          const routePolyline = steps.map((step) => step.coordinates);

          setNavigationState({
            isNavigating: true,
            destination,
            currentStep: 0,
            steps,
            routePolyline,
            completedPolyline: [],
          });

          //console.log('[NAV] Fallback route created successfully');
          return true;
        } catch (fallbackError) {
          //console.error('[NAV] Fallback route creation failed:', fallbackError);
          return false;
        }
      }
    },
    [currentPosition, allRooms, pathPOIs, findNearestRoom],
  );

  // Stop navigation and clear route
  const stopNavigation = useCallback(() => {
    //console.log('[NAV] Stopping navigation');
    setNavigationState({
      isNavigating: false,
      destination: null,
      currentStep: 0,
      steps: [],
      routePolyline: [],
      completedPolyline: [],
    });
    setDestinationReached(false);
  }, []);

  // Update navigation progress based on current position
  useEffect(() => {
    if (!navigationState.isNavigating || !currentPosition || !navigationState.steps.length) {
      return;
    }

    const { destination, steps, currentStep } = navigationState;

    //console.log('[NAV] Position update - checking progress');
    //console.log('[NAV] Current position:', currentPosition);
    //console.log('[NAV] Current step:', currentStep, 'of', steps.length);
    //console.log('[NAV] Current step coordinates:', steps[currentStep]?.coordinates);

    // Check if destination is reached
    if (destination) {
      const distanceToDestination = calculateDistance(currentPosition, destination.coordinates);
      //console.log('[NAV] Distance to destination:', distanceToDestination.toFixed(4));

      if (distanceToDestination < DESTINATION_THRESHOLD) {
        //console.log('[NAV] Destination reached!');
        setDestinationReached(true);
        return;
      }
    }

    // Check if current step should be advanced
    if (currentStep < steps.length - 1) {
      const currentStepCoords = steps[currentStep].coordinates;
      const nextStep = steps[currentStep + 1];
      const distanceToCurrentStep = calculateDistance(currentPosition, currentStepCoords);
      const distanceToNextStep = calculateDistance(currentPosition, nextStep.coordinates);

      //console.log('[NAV] Distance to current step:', distanceToCurrentStep.toFixed(4));
      //console.log(
      //   '[NAV] Distance to next step:',
      //   distanceToNextStep.toFixed(4),
      //   'threshold:',
      //   STEP_THRESHOLD,
      // );

      // Advance if we're close to the next step OR if we've passed the current step
      const shouldAdvance =
        distanceToNextStep < STEP_THRESHOLD ||
        (distanceToCurrentStep < STEP_THRESHOLD && distanceToNextStep < distanceToCurrentStep * 2);

      if (shouldAdvance) {
        //console.log(`[NAV] Advancing to step ${currentStep + 1}`);

        // Add current step to completed polyline
        const newCompletedPolyline = [
          ...navigationState.completedPolyline,
          steps[currentStep].coordinates,
        ];

        setNavigationState((prev) => ({
          ...prev,
          currentStep: currentStep + 1,
          completedPolyline: newCompletedPolyline,
        }));
      }
    }
  }, [currentPosition, navigationState, calculateDistance]);

  // Handle destination reached popup close
  const handleDestinationReachedClose = useCallback(() => {
    setDestinationReached(false);
    stopNavigation();
  }, [stopNavigation]);

  return {
    // Navigation state
    isNavigating: navigationState.isNavigating,
    destination: navigationState.destination,
    currentStep: navigationState.currentStep,
    steps: navigationState.steps,
    routePolyline: navigationState.routePolyline,
    completedPolyline: navigationState.completedPolyline,

    // Destination reached state
    destinationReached,

    // Actions
    startNavigation,
    stopNavigation,
    handleDestinationReachedClose,

    // Helper data
    pathPOIsLoaded: pathPOIs.length > 0,
  };
}
