import { useEffect, useCallback, useRef, useState } from 'react';
import { useTimetable } from './useTimetable';
import { usePOIs } from './usePOIs';
import { TimetableEntry } from '../types/timetable.types';
import TimetableBackgroundService from '../services/TimetableBackgroundService';

interface UseTimetableNavigationProps {
  currentLocation: any;
  isMapReady: boolean;
  webViewRef: React.RefObject<any>;
  fetchRoute: (destCoords: [number, number]) => Promise<void>;
  setDestination: (destination: string) => void;
  setDestinationCoords: (coords: [number, number] | null) => void;
  selectPOI: (poi: any) => void;
  setStatus: (status: string) => void;
  onAutoNavigationTriggered?: (entry: TimetableEntry, building: any) => void;
}

export const useTimetableNavigation = ({
  currentLocation,
  isMapReady,
  webViewRef,
  fetchRoute,
  setDestination,
  setDestinationCoords,
  selectPOI,
  setStatus,
  onAutoNavigationTriggered,
}: UseTimetableNavigationProps) => {
  const { entries } = useTimetable();
  const { pois } = usePOIs();
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastTriggeredRef = useRef<string | null>(null);
  const [autoNavigationEnabled, setAutoNavigationEnabled] = useState(true);

  // Keep the findBuildingForEntry function for in-app use
  const findBuildingForEntry = useCallback((entry: TimetableEntry) => {
    console.log('[TimetableNav] Finding building for entry:', {
      course: entry.course,
      venue: entry.venue,
      buildingId: entry.buildingId,
      buildingName: entry.buildingName,
      totalPOIs: pois?.length || 0
    });

    if (!pois || pois.length === 0) {
      console.log('[TimetableNav] No POIs available');
      return null;
    }

    // First try to find by buildingId if available
    if (entry.buildingId) {
      const buildingById = pois.find(poi => poi.id === entry.buildingId);
      if (buildingById && buildingById.centroid) {
        console.log('[TimetableNav] Found building by ID:', buildingById.name || buildingById.id);
        return buildingById;
      }
    }

    // Then try to find by building name
    if (entry.buildingName) {
      const buildingByName = pois.find(poi => 
        poi.name?.toLowerCase().includes(entry.buildingName!.toLowerCase()) ||
        poi.title?.toLowerCase().includes(entry.buildingName!.toLowerCase())
      );
      if (buildingByName && buildingByName.centroid) {
        console.log('[TimetableNav] Found building by name:', buildingByName.name || buildingByName.id);
        return buildingByName;
      }
    }

    // Finally, try to find by venue name
    const buildingByVenue = pois.find(poi => 
      poi.name?.toLowerCase().includes(entry.venue.toLowerCase()) ||
      poi.title?.toLowerCase().includes(entry.venue.toLowerCase()) ||
      entry.venue.toLowerCase().includes(poi.name?.toLowerCase() || '') ||
      entry.venue.toLowerCase().includes(poi.title?.toLowerCase() || '')
    );

    if (buildingByVenue && buildingByVenue.centroid) {
      console.log('[TimetableNav] Found building by venue:', buildingByVenue.name || buildingByVenue.id);
      return buildingByVenue;
    }

    console.log('[TimetableNav] No building found for entry');
    return null;
  }, [pois]);

  const getCurrentTimeMinutes = useCallback(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }, []);

  const getTimeMinutes = useCallback((timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
  }, []);

  const getCurrentDay = useCallback(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  }, []);

  // Simplified check for in-app popups only (when user is actively on map screen)
  const checkForUpcomingClasses = useCallback(async () => {
    console.log('[TimetableNav] ===== CHECKING FOR IN-APP UPCOMING CLASSES =====');
    
    if (!entries || entries.length === 0 || !currentLocation || !isMapReady) {
      return;
    }

    const currentDay = getCurrentDay();
    const currentTimeMinutes = getCurrentTimeMinutes();
    const todayClasses = entries.filter(entry => entry.day === currentDay);
    
    if (todayClasses.length === 0) {
      return;
    }

    for (const entry of todayClasses) {
      const classStartTime = getTimeMinutes(entry.startTime);
      const timeDifference = classStartTime - currentTimeMinutes;
      const triggerTime = 10; // Changed from 5 to 10 minutes to match background service
      
      if (timeDifference > 0 && timeDifference <= triggerTime) {
        const entryKey = `${entry.id}-${entry.startTime}-${currentDay}`;
    
        // Prevent multiple triggers
        if (lastTriggeredRef.current === entryKey) continue;
    
        // Check if notification was already opened for this entry
        const notificationOpened = await TimetableBackgroundService.getInstance().isNotificationOpened(entryKey);
        if (notificationOpened) {
          console.log('[TimetableNav] Notification already opened for', entryKey, '– skipping in-app popup');
          lastTriggeredRef.current = entryKey;
          continue;
        }
    
        const building = findBuildingForEntry(entry);
        if (building && building.centroid) {
          lastTriggeredRef.current = entryKey;
          onAutoNavigationTriggered?.(entry, building);
          break;
        }
      }
    }
    
    console.log('[TimetableNav] ===== IN-APP CHECK COMPLETE =====');
  }, [
    entries,
    currentLocation,
    isMapReady,
    pois,
    onAutoNavigationTriggered,
    getCurrentDay,
    getCurrentTimeMinutes,
    getTimeMinutes,
    findBuildingForEntry,
  ]);

  // Only run in-app checks when on map screen, much less frequently
  useEffect(() => {
    // Clear any existing interval
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }

    // Only set up in-app monitoring if we have all required conditions
    if (!entries || entries.length === 0 || !isMapReady || !currentLocation) {
      return;
    }

    // Check immediately
    checkForUpcomingClasses();

    // Set up interval to check every 60 seconds (less frequent since background service handles notifications)
    checkIntervalRef.current = setInterval(() => {
      checkForUpcomingClasses();
    }, 60000); // 1 minute
    
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [entries, isMapReady, currentLocation, checkForUpcomingClasses]);

  // Reset triggered classes at midnight
  useEffect(() => {
    const now = new Date();
    const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0).getTime() - now.getTime();
    
    const midnightTimer = setTimeout(() => {
      lastTriggeredRef.current = null;
      
      const dailyResetInterval = setInterval(() => {
        lastTriggeredRef.current = null;
      }, 24 * 60 * 60 * 1000);
      
      return () => clearInterval(dailyResetInterval);
    }, msUntilMidnight);
    
    return () => clearTimeout(midnightTimer);
  }, []);

  return {
    checkForUpcomingClasses,
    findBuildingForEntry,
  };
};