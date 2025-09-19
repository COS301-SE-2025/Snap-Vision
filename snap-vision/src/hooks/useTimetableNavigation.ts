import { useEffect, useCallback, useRef, useState } from 'react';
import { useTimetable } from './useTimetable';
import { usePOIs } from './usePOIs';
import { TimetableEntry } from '../types/timetable.types';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  // Load auto navigation preference
  useEffect(() => {
    const loadPreference = async () => {
      try {
        const stored = await AsyncStorage.getItem('autoNavigationEnabled');
        if (stored !== null) {
          setAutoNavigationEnabled(JSON.parse(stored));
        }
        console.log('[TimetableNav] Auto navigation enabled:', JSON.parse(stored || 'true'));
      } catch (error) {
        console.error('Error loading auto navigation preference:', error);
      }
    };

    loadPreference();
  }, []);

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

  const checkForUpcomingClasses = useCallback(() => {
    console.log('[TimetableNav] ===== CHECKING FOR UPCOMING CLASSES =====');
    
    // Check if auto navigation is enabled
    if (!autoNavigationEnabled) {
      console.log('[TimetableNav] Auto navigation disabled - skipping');
      return;
    }

    if (!entries || entries.length === 0) {
      console.log('[TimetableNav] No timetable entries found - skipping');
      return;
    }

    if (!currentLocation) {
      console.log('[TimetableNav] No current location - skipping');
      return;
    }

    if (!isMapReady) {
      console.log('[TimetableNav] Map not ready - skipping');
      return;
    }

    const currentDay = getCurrentDay();
    const currentTimeMinutes = getCurrentTimeMinutes();
    
    console.log('[TimetableNav] Time info:', {
      currentDay,
      currentTimeMinutes,
      currentTimeFormatted: `${Math.floor(currentTimeMinutes / 60)}:${String(currentTimeMinutes % 60).padStart(2, '0')}`,
    });
    
    // Find classes for today
    const todayClasses = entries.filter(entry => entry.day === currentDay);
    console.log('[TimetableNav] Today\'s classes:', todayClasses.map(c => ({
      course: c.course,
      startTime: c.startTime,
      venue: c.venue,
      day: c.day
    })));
    
    if (todayClasses.length === 0) {
      console.log('[TimetableNav] No classes today');
      return;
    }
    
    for (const entry of todayClasses) {
      const classStartTime = getTimeMinutes(entry.startTime);
      const timeDifference = classStartTime - currentTimeMinutes;
      
      console.log(`[TimetableNav] Checking ${entry.course} at ${entry.startTime}:`, {
        classStartTimeMinutes: classStartTime,
        currentTimeMinutes,
        timeDifference,
        minutesUntilClass: timeDifference,
        shouldTrigger: timeDifference > 0 && timeDifference <= 5
      });
      
      // Trigger navigation 5 minutes before class starts
      const triggerTime = 5; // minutes
      
      // Check if class is starting in the next 5 minutes and hasn't been triggered yet
      if (timeDifference > 0 && timeDifference <= triggerTime) {
        const entryKey = `${entry.id}-${entry.startTime}-${currentDay}`;
        
        console.log('[TimetableNav] Class is within trigger window!', {
          entryKey,
          lastTriggered: lastTriggeredRef.current,
          alreadyTriggered: lastTriggeredRef.current === entryKey
        });
        
        // Prevent multiple triggers for the same class
        if (lastTriggeredRef.current === entryKey) {
          console.log('[TimetableNav] Already triggered for this class - skipping');
          continue;
        }
        
        const building = findBuildingForEntry(entry);
        console.log('[TimetableNav] Building search result:', building ? {
          id: building.id,
          name: building.name || building.title,
          hasCentroid: !!building.centroid
        } : 'No building found');
        
        if (building && building.centroid) {
          console.log('[TimetableNav] 🚀 TRIGGERING AUTO-NAVIGATION POPUP!', {
            course: entry.course,
            venue: entry.venue,
            buildingName: building.name || building.title,
            coordinates: [building.centroid.longitude, building.centroid.latitude]
          });
          
          lastTriggeredRef.current = entryKey;
          
          // **ONLY** show the popup - don't set up navigation yet
          // The navigation setup will happen in MapScreen when user confirms
          onAutoNavigationTriggered?.(entry, building);
          
          break; // Only handle one class at a time
        } else {
          console.log('[TimetableNav] Could not find building or building has no coordinates');
        }
      }
    }
    
    console.log('[TimetableNav] ===== CHECK COMPLETE =====');
  }, [
    autoNavigationEnabled,
    entries,
    currentLocation,
    isMapReady,
    pois, // Changed: Use pois directly instead of findBuildingForEntry
    onAutoNavigationTriggered,
  ]);

  // Clear triggered entries when entries change (without calling check)
  useEffect(() => {
    console.log('[TimetableNav] Timetable entries updated, clearing triggered state');
    lastTriggeredRef.current = null;
  }, [entries]); // Only depend on entries, not checkForUpcomingClasses

  // Start monitoring with reactive interval management
  useEffect(() => {
    console.log('[TimetableNav] Setting up monitoring:', {
      hasEntries: !!(entries && entries.length > 0),
      entriesCount: entries?.length || 0,
      autoNavigationEnabled,
      isMapReady,
      hasCurrentLocation: !!currentLocation
    });

    // Clear any existing interval
    if (checkIntervalRef.current) {
      console.log('[TimetableNav] Clearing existing interval');
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }

    // Only set up monitoring if we have all required conditions
    if (!entries || entries.length === 0 || !autoNavigationEnabled || !isMapReady || !currentLocation) {
      console.log('[TimetableNav] Conditions not met - not setting up monitoring');
      return;
    }

    // Check immediately when setting up
    console.log('[TimetableNav] Running immediate check when setting up monitoring');
    checkForUpcomingClasses();

    // Set up interval to check every 30 seconds
    console.log('[TimetableNav] Setting up 30-second interval check');
    checkIntervalRef.current = setInterval(() => {
      console.log('[TimetableNav] Interval check triggered');
      checkForUpcomingClasses();
    }, 30000);
    
    return () => {
      if (checkIntervalRef.current) {
        console.log('[TimetableNav] Cleaning up interval');
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [entries, autoNavigationEnabled, isMapReady, currentLocation]); // Removed checkForUpcomingClasses

  // Reset triggered classes at midnight
  useEffect(() => {
    const now = new Date();
    const msUntilMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0) - now;
    
    console.log('[TimetableNav] Setting up midnight reset in', Math.round(msUntilMidnight / 1000 / 60), 'minutes');
    
    const midnightTimer = setTimeout(() => {
      console.log('[TimetableNav] Midnight reset triggered');
      lastTriggeredRef.current = null;
      
      // Set up daily reset
      const dailyResetInterval = setInterval(() => {
        console.log('[TimetableNav] Daily reset triggered');
        lastTriggeredRef.current = null;
      }, 24 * 60 * 60 * 1000); // 24 hours
      
      return () => clearInterval(dailyResetInterval);
    }, msUntilMidnight);
    
    return () => clearTimeout(midnightTimer);
  }, []);

  return {
    checkForUpcomingClasses,
    findBuildingForEntry,
  };
};