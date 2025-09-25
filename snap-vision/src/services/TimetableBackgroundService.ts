import { AppState, AppStateStatus } from 'react-native';
import notifee, { TimestampTrigger, TriggerType, AndroidImportance, EventType } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

interface TimetableEntry {
  id: string;
  course: string;
  venue: string;
  startTime: string;
  day: string;
  buildingId?: string;
  buildingName?: string;
  userId: string;
}

interface POI {
  id: string;
  name?: string;
  title?: string;
  centroid?: {
    latitude: number;
    longitude: number;
  };
}

class TimetableBackgroundService {
  private static instance: TimetableBackgroundService | null = null;
  private isRunning = false;
  private SCHEDULED_KEY = 'scheduledAutoNav';
  private OPENED_KEY = 'autoNavOpenedFor';
  private appStateSubscription: any = null; // Store the subscription

  static getInstance(): TimetableBackgroundService {
    if (!TimetableBackgroundService.instance) {
      TimetableBackgroundService.instance = new TimetableBackgroundService();
    }
    return TimetableBackgroundService.instance;
  }

  // Method that can be called to refresh notifications when timetable changes
  async refreshNotifications() {
    console.log('[TimetableService] Manually refreshing notifications');
    return this.scheduleWeekNotifications();
  }

  async start() {
    if (this.isRunning) return;
    
    console.log('[TimetableService] Starting background service');
    this.isRunning = true;
    
    // Schedule notifications for the next 7 days
    await this.scheduleWeekNotifications();
    
    // Handle app state changes using the new subscription pattern
    this.appStateSubscription = AppState.addEventListener('change', this.handleAppStateChange);
  }

  stop() {
    console.log('[TimetableService] Stopping background service');
    this.isRunning = false;
    
    // Remove the app state listener using the subscription
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active') {
      // Re-schedule when app becomes active
      this.scheduleWeekNotifications();
    }
  };

  private async getTimetableEntries(): Promise<TimetableEntry[]> {
    try {
      const user = auth().currentUser;
      if (!user) {
        console.log('[TimetableService] No authenticated user');
        return [];
      }

      console.log('[TimetableService] Fetching timetable entries for user:', user.uid);

      const snapshot = await firestore()
        .collection('timetables')
        .where('userId', '==', user.uid)
        .get();

      if (snapshot.empty) {
        console.log('[TimetableService] No timetable entries found for user');
        return [];
      }

      const entries: TimetableEntry[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as TimetableEntry));

      console.log('[TimetableService] Found', entries.length, 'timetable entries');
      return entries;
    } catch (error: any) {
      console.error('[TimetableService] Error fetching timetable:', error.code, error.message);
      return [];
    }
  }

  private async getPOIs(): Promise<POI[]> {
    try {
      const user = auth().currentUser;
      if (!user) {
        console.log('[TimetableService] No authenticated user for POIs');
        return [];
      }

      console.log('[TimetableService] Fetching POIs for authenticated user');

      const locationsSnapshot = await firestore().collection('locations').get();
      const allPOIs: POI[] = [];

      for (const locationDoc of locationsSnapshot.docs) {
        const locationId = locationDoc.id;
        
        try {
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
        } catch (locationError) {
          console.warn('[TimetableService] Error fetching POIs for location', locationId, ':', locationError);
        }
      }

      console.log('[TimetableService] Successfully fetched', allPOIs.length, 'POIs');
      return allPOIs;
    } catch (error: any) {
      console.error('[TimetableService] Error fetching POIs:', error.code, error.message);
      return [];
    }
  }

  private findBuildingForEntry(entry: TimetableEntry, pois: POI[]): POI | null {
    if (!pois || pois.length === 0) return null;

    // First try to find by buildingId
    if (entry.buildingId) {
      const buildingById = pois.find(poi => poi.id === entry.buildingId);
      if (buildingById && buildingById.centroid) {
        return buildingById;
      }
    }

    // Then try by building name
    if (entry.buildingName) {
      const buildingByName = pois.find(poi => 
        poi.name?.toLowerCase().includes(entry.buildingName!.toLowerCase()) ||
        poi.title?.toLowerCase().includes(entry.buildingName!.toLowerCase())
      );
      if (buildingByName && buildingByName.centroid) {
        return buildingByName;
      }
    }

    // Finally by venue name
    const buildingByVenue = pois.find(poi => 
      poi.name?.toLowerCase().includes(entry.venue.toLowerCase()) ||
      poi.title?.toLowerCase().includes(entry.venue.toLowerCase()) ||
      entry.venue.toLowerCase().includes(poi.name?.toLowerCase() || '') ||
      entry.venue.toLowerCase().includes(poi.title?.toLowerCase() || '')
    );

    return buildingByVenue && buildingByVenue.centroid ? buildingByVenue : null;
  }

  private getDayName(dayIndex: number): string {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dayIndex];
  }

  // Schedule notifications for the entire week
  async scheduleWeekNotifications() {
    try {
      // Check if auto navigation is enabled
      const autoNavEnabled = await AsyncStorage.getItem('autoNavigationEnabled');
      if (autoNavEnabled === 'false') {
        console.log('[TimetableService] Auto navigation disabled');
        return;
      }

      // Clear all previous scheduled notifications
      const prevJson = await AsyncStorage.getItem(this.SCHEDULED_KEY);
      if (prevJson) {
        const prev = JSON.parse(prevJson) as Record<string, string>;
        await Promise.all(
          Object.values(prev).map((id) => notifee.cancelNotification(id).catch(() => {})),
        );
      }

      const [entries, pois] = await Promise.all([
        this.getTimetableEntries(),
        this.getPOIs()
      ]);

      const mapping: Record<string, string> = {};
      const now = new Date();
      
      console.log('[TimetableService] Current time:', now.toLocaleString());
      console.log('[TimetableService] Scheduling notifications for next 7 days');

      // Schedule for the next 7 days
      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        const targetDate = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
        const targetDayName = this.getDayName(targetDate.getDay());
        
        console.log('[TimetableService] Processing day:', targetDayName, targetDate.toDateString());

        const dayEntries = entries.filter(entry => entry.day === targetDayName);
        console.log('[TimetableService] Found', dayEntries.length, 'entries for', targetDayName);

        for (const entry of dayEntries) {
          // Calculate notification time: 10 minutes before class
          const [hh, mm] = (entry.startTime || '00:00').split(':').map(Number);
          const scheduledDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), hh, mm, 0);
          const triggerTs = scheduledDate.getTime() - 10 * 60 * 1000; // 10 minutes before
          
          console.log('[TimetableService] Entry:', entry.course, 'at', entry.startTime, 'on', targetDayName);
          console.log('[TimetableService] Class time:', scheduledDate.toLocaleString());
          console.log('[TimetableService] Notification time:', new Date(triggerTs).toLocaleString());

          // Skip if the notification time has already passed
          if (triggerTs <= now.getTime()) {
            console.log('[TimetableService] Skipping past time for:', entry.course, 'on', targetDayName);
            continue;
          }

          const building = this.findBuildingForEntry(entry, pois);
          if (!building || !building.centroid) {
            console.log('[TimetableService] No building found for entry:', entry.course);
            continue;
          }

          const entryKey = `${entry.id}-${entry.startTime}-${targetDayName}-${targetDate.getDate()}`;

          const trigger: TimestampTrigger = {
            type: TriggerType.TIMESTAMP,
            timestamp: triggerTs,
          };

          console.log('[TimetableService] Creating notification for:', entry.course, 'trigger timestamp:', triggerTs);

          const notifId = await notifee.createTriggerNotification(
            {
              title: `Class in 10 minutes: ${entry.course}`,
              body: `${entry.venue} starts at ${entry.startTime} — open the Map to start navigation!`,
              android: {
                channelId: 'default',
                smallIcon: 'ic_launcher',
                pressAction: {
                  id: 'default',
                },
                importance: AndroidImportance.HIGH,
              },
              data: {
                entryKey,
                course: entry.course,
                venue: entry.venue,
                startTime: entry.startTime,
                buildingId: entry.buildingId || '',
                buildingName: entry.buildingName || '',
                lat: String(building.centroid.latitude),
                lng: String(building.centroid.longitude),
                action: 'open_class_popup',
              },
            },
            trigger,
          );

          if (notifId) {
            mapping[entryKey] = notifId;
            console.log('[TimetableService] Successfully scheduled notification', entryKey, 'with ID', notifId, 'for', new Date(triggerTs).toLocaleString());
          } else {
            console.log('[TimetableService] Failed to create notification for', entryKey);
          }
        }
      }

      await AsyncStorage.setItem(this.SCHEDULED_KEY, JSON.stringify(mapping));
      console.log('[TimetableService] Scheduled', Object.keys(mapping).length, 'notifications for the week');
      
    } catch (error) {
      console.error('[TimetableService] Error scheduling notifications:', error);
    }
  }

  async markNotificationOpened(entryKey: string) {
    try {
      await AsyncStorage.setItem(this.OPENED_KEY, entryKey);
      console.log('[TimetableService] Marked notification as opened:', entryKey);
    } catch (error) {
      console.error('[TimetableService] Error marking notification as opened:', error);
    }
  }

  async isNotificationOpened(entryKey: string): Promise<boolean> {
    try {
      const opened = await AsyncStorage.getItem(this.OPENED_KEY);
      return opened === entryKey;
    } catch {
      return false;
    }
  }

  // For testing - schedule a notification in a few seconds
  async scheduleTestNotification() {
    try {
      const testTrigger: TimestampTrigger = {
        type: TriggerType.TIMESTAMP,
        timestamp: Date.now() + 10000, // 10 seconds from now
      };

      const notifId = await notifee.createTriggerNotification(
        {
          title: 'Test Notification',
          body: 'This is a test notification from TimetableBackgroundService',
          android: {
            channelId: 'default',
            smallIcon: 'ic_launcher',
            pressAction: {
              id: 'default',
            },
            importance: AndroidImportance.HIGH,
          },
          data: {
            test: 'true',
            action: 'open_class_popup',
          },
        },
        testTrigger,
      );

      console.log('[TimetableService] Test notification scheduled with ID:', notifId);
      return notifId;
    } catch (error) {
      console.error('[TimetableService] Error scheduling test notification:', error);
      return null;
    }
  }
}

export default TimetableBackgroundService;