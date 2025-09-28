import TimetableBackgroundService from '../src/services/TimetableBackgroundService';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notifee from '@notifee/react-native';
import { AppState } from 'react-native';
import AuthorizationService from '../src/security/AuthorizationService';
import InputValidator from '../src/security/InputValidator';

// Mock all dependencies
jest.mock('@react-native-firebase/firestore');
jest.mock('@react-native-firebase/auth');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../src/security/AuthorizationService');
jest.mock('../src/security/InputValidator');
jest.mock('@notifee/react-native', () => ({
  default: {
    cancelNotification: jest.fn(),
    createTriggerNotification: jest.fn(),
  },
  TimestampTrigger: {
    TIMESTAMP: 1,
  },
  TriggerType: {
    TIMESTAMP: 1,
  },
  AndroidImportance: {
    HIGH: 4,
  },
}));
jest.mock('react-native', () => ({
  AppState: {
    addEventListener: jest.fn(),
  },
  Platform: {
    OS: 'android',
  },
  NativeModules: {},
  AppRegistry: {
    registerHeadlessTask: jest.fn(),
  },
}));

const mockFirestore = firestore as jest.MockedFunction<typeof firestore>;
const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockNotifee = notifee as jest.Mocked<typeof notifee>;
const mockAppState = AppState as jest.Mocked<typeof AppState>;
const mockAuthorizationService = AuthorizationService as jest.MockedClass<typeof AuthorizationService>;
const mockInputValidator = InputValidator as jest.Mocked<typeof InputValidator>;

describe('TimetableBackgroundService', () => {
  let service: TimetableBackgroundService;
  let mockCollection: jest.Mock;
  let mockDoc: jest.Mock;
  let mockGet: jest.Mock;
  let mockWhere: jest.Mock;
  let mockOrderBy: jest.Mock;
  let mockAdd: jest.Mock;
  let mockUpdate: jest.Mock;
  let mockDelete: jest.Mock;
  let mockAuthService: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup firestore mocks
    mockCollection = jest.fn();
    mockDoc = jest.fn();
    mockGet = jest.fn();
    mockWhere = jest.fn();
    mockOrderBy = jest.fn();
    mockAdd = jest.fn();
    mockUpdate = jest.fn();
    mockDelete = jest.fn();

    // Create a default Firestore instance mock that returns our collection mock
    const mockFirestoreInstance = {
      collection: mockCollection,
    };

    mockFirestore.mockReturnValue(mockFirestoreInstance as any);

    // Default collection mock setup
    mockCollection.mockReturnValue({
      doc: mockDoc,
      where: mockWhere,
      orderBy: mockOrderBy,
      add: mockAdd,
      get: mockGet,
    });

    mockDoc.mockReturnValue({
      get: mockGet,
      update: mockUpdate,
      delete: mockDelete,
      collection: mockCollection, // Allow chaining to subcollections
    });

    // Setup where and orderBy to return chainable objects
    mockWhere.mockReturnValue({
      where: mockWhere,
      get: mockGet,
      orderBy: mockOrderBy,
    });
    
    mockOrderBy.mockReturnValue({
      where: mockWhere,
      get: mockGet,
      orderBy: mockOrderBy,
    });

    // Setup auth mock
    const mockUser = { uid: 'user-123' };
    mockAuth.mockReturnValue({
      currentUser: mockUser,
    } as any);

    // Setup AsyncStorage mocks
    mockAsyncStorage.getItem = jest.fn();
    mockAsyncStorage.setItem = jest.fn();
    mockAsyncStorage.removeItem = jest.fn();

    // Setup notifee mocks
    mockNotifee.cancelNotification = jest.fn();
    mockNotifee.createTriggerNotification = jest.fn();

    // Setup AppState mock
    mockAppState.addEventListener = jest.fn();

    // Setup AuthorizationService mock
    mockAuthService = {
      getCurrentUserContext: jest.fn(),
      canAccessTimetable: jest.fn().mockResolvedValue(true),
    };
    mockAuthorizationService.getInstance = jest.fn().mockReturnValue(mockAuthService);

    // Setup InputValidator mock
    mockInputValidator.validateDocumentId = jest.fn().mockImplementation((id: string) => id);
    mockInputValidator.validateText = jest.fn().mockImplementation((text: string) => text);

    service = TimetableBackgroundService.getInstance();
  });

  describe('getInstance', () => {
    it('returns the same instance (singleton)', () => {
      const instance1 = TimetableBackgroundService.getInstance();
      const instance2 = TimetableBackgroundService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('start', () => {
    it('starts the service and schedules notifications', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('true'); // auto nav enabled
      mockGet.mockResolvedValue({ docs: [], empty: true }); // no entries
      mockAppState.addEventListener.mockReturnValue({ remove: jest.fn() });

      await service.start();

      expect(mockAppState.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('does not start if already running', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('true'); // auto nav enabled
      mockGet.mockResolvedValue({ docs: [], empty: true }); // no entries
      const mockSubscription = { remove: jest.fn() };
      mockAppState.addEventListener.mockReturnValue(mockSubscription);

      // Reset the service instance to ensure fresh state
      (service as any).isRunning = false;

      await service.start(); // start once
      expect(mockAppState.addEventListener).toHaveBeenCalledTimes(1);
      
      await service.start(); // try again - should not call addEventListener again
      expect(mockAppState.addEventListener).toHaveBeenCalledTimes(1);
    });
  });

  describe('stop', () => {
    it('stops the service and removes listener', async () => {
      const mockSubscription = { remove: jest.fn() };
      mockAsyncStorage.getItem.mockResolvedValue('true'); // auto nav enabled
      mockGet.mockResolvedValue({ docs: [], empty: true }); // no entries
      mockAppState.addEventListener.mockReturnValue(mockSubscription);

      // Reset the service instance to ensure fresh state
      (service as any).isRunning = false;

      await service.start();
      service.stop();

      expect(mockSubscription.remove).toHaveBeenCalled();
    });
  });

  describe('getTimetableEntries', () => {
    it('fetches user timetable entries successfully', async () => {
      const mockEntries = [
        {
          id: 'entry-1',
          course: 'Math',
          venue: 'Room 101',
          startTime: '09:00',
          day: 'Monday',
          userId: 'user-123',
        },
      ];

      // Setup the collection to return a where method that resolves with entries
      mockWhere.mockReturnValueOnce({
        get: jest.fn().mockResolvedValue({
          docs: mockEntries.map((entry) => ({
            id: entry.id,
            data: () => entry,
          })),
          empty: false,
        }),
      });

      // Access private method via type assertion
      const entries = await (service as any).getTimetableEntries();

      expect(mockCollection).toHaveBeenCalledWith('timetables');
      expect(mockWhere).toHaveBeenCalledWith('userId', '==', 'user-123');
      expect(entries).toHaveLength(1);
      expect(entries[0]).toEqual(expect.objectContaining(mockEntries[0]));
    });

    it('returns empty array when no user', async () => {
      mockAuth.mockReturnValue({
        currentUser: null,
      } as any);

      const entries = await (service as any).getTimetableEntries();

      expect(entries).toHaveLength(0);
    });

    it('handles firestore errors', async () => {
      mockGet.mockRejectedValue(new Error('Firestore error'));

      const entries = await (service as any).getTimetableEntries();

      expect(entries).toHaveLength(0);
    });
  });

  describe('getPOIs', () => {
    it('fetches POIs successfully', async () => {
      const mockLocations = [{ id: 'loc-1' }];
      const mockPOIs = [
        {
          id: 'poi-1',
          name: 'Building A',
          centroid: { latitude: 1.0, longitude: 2.0 },
        },
      ];

      // Mock the locations collection call first
      let callCount = 0;
      mockCollection.mockImplementation((path: string) => {
        if (path === 'locations') {
          return {
            get: jest.fn().mockResolvedValue({
              docs: mockLocations.map((loc) => ({
                id: loc.id,
                data: () => loc,
              })),
            }),
          };
        } else if (path.includes('buildingPOIs')) {
          return {
            get: jest.fn().mockResolvedValue({
              docs: mockPOIs.map((poi) => ({
                id: poi.id,
                data: () => poi,
              })),
            }),
          };
        }
        return { get: jest.fn().mockResolvedValue({ docs: [] }) };
      });

      const pois: any[] = await (service as any).getPOIs();

      expect(pois).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: 'poi-1',
          name: 'Building A',
          centroid: { latitude: 1.0, longitude: 2.0 },
        })
      ]));
    });

    it('handles errors in getPOIs', async () => {
      mockGet.mockRejectedValueOnce(new Error('Firestore error'));

      const pois: any[] = await (service as any).getPOIs();

      expect(pois).toEqual([]);
    });
  });

  describe('findBuildingForEntry', () => {
    it('finds building by buildingId', () => {
      const pois = [
        {
          id: 'bldg-1',
          name: 'Building A',
          centroid: { latitude: 1.0, longitude: 2.0 },
        },
      ];
      const entry = { buildingId: 'bldg-1' };

      const result = (service as any).findBuildingForEntry(entry, pois);

      expect(result).toEqual(pois[0]);
    });

    it('finds building by buildingName', () => {
      const pois = [
        {
          id: 'bldg-1',
          name: 'Building A',
          centroid: { latitude: 1.0, longitude: 2.0 },
        },
      ];
      const entry = { buildingName: 'Building A' };

      const result = (service as any).findBuildingForEntry(entry, pois);

      expect(result).toEqual(pois[0]);
    });

    it('finds building by venue', () => {
      const pois = [
        {
          id: 'bldg-1',
          name: 'Room 101',
          centroid: { latitude: 1.0, longitude: 2.0 },
        },
      ];
      const entry = { venue: 'Room 101' };

      const result = (service as any).findBuildingForEntry(entry, pois);

      expect(result).toEqual(pois[0]);
    });

    it('returns null if no match', () => {
      const pois: any[] = [];
      const entry = { venue: 'Room 101' };

      const result = (service as any).findBuildingForEntry(entry, pois);

      expect(result).toBeNull();
    });
  });

  describe('scheduleWeekNotifications', () => {
    it('schedules notifications for the week', async () => {
      // Mock Date to ensure consistent scheduling
      const mockDate = new Date('2024-01-08 08:00:00'); // Monday 8 AM
      jest.spyOn(global, 'Date').mockImplementation((...args: any[]) => {
        if (args.length === 0) {
          return mockDate as any;
        }
        return new (Date as any)(...args);
      });
      Object.defineProperty(global.Date, 'now', {
        value: jest.fn(() => mockDate.getTime()),
        writable: true
      });

      mockAsyncStorage.getItem
        .mockResolvedValueOnce('true') // auto nav enabled
        .mockResolvedValueOnce(null); // no previous scheduled

      const mockEntries = [
        {
          id: 'entry-1',
          course: 'Math',
          venue: 'Room 101',
          startTime: '10:00', // Schedule for 10 AM (after current 8 AM)
          day: 'Monday',
          buildingId: 'bldg-1',
          userId: 'user-123',
        },
      ];

      const mockPOIs = [
        {
          id: 'bldg-1',
          name: 'Building A',
          centroid: { latitude: 1.0, longitude: 2.0 },
        },
      ];

      // Setup collection mock to handle different collection calls
      let collectionCallCount = 0;
      mockCollection.mockImplementation((path: string) => {
        if (path === 'timetables') {
          return {
            where: jest.fn().mockReturnValue({
              get: jest.fn().mockResolvedValue({
                docs: mockEntries.map((entry) => ({
                  id: entry.id,
                  data: () => entry,
                })),
                empty: false,
              }),
            }),
          };
        } else if (path === 'locations') {
          return {
            get: jest.fn().mockResolvedValue({
              docs: [{ id: 'loc-1', data: () => ({ id: 'loc-1' }) }],
            }),
          };
        } else if (path.includes('buildingPOIs')) {
          return {
            get: jest.fn().mockResolvedValue({
              docs: mockPOIs.map((poi) => ({
                id: poi.id,
                data: () => poi,
              })),
            }),
          };
        }
        return { get: jest.fn().mockResolvedValue({ docs: [] }) };
      });

      mockNotifee.createTriggerNotification.mockResolvedValue('notif-1');

      await service.scheduleWeekNotifications();

      expect(mockNotifee.createTriggerNotification).toHaveBeenCalled();
      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('scheduledAutoNav', expect.any(String));

      // Restore mocks
      jest.restoreAllMocks();
    });

    it('skips if auto navigation disabled', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('false');

      await service.scheduleWeekNotifications();

      expect(mockNotifee.createTriggerNotification).not.toHaveBeenCalled();
    });

    it('handles errors gracefully', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      await expect(service.scheduleWeekNotifications()).resolves.not.toThrow();
    });
  });

  describe('markNotificationOpened', () => {
    it('marks notification as opened', async () => {
      await service.markNotificationOpened('entry-key');

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('autoNavOpenedFor', 'entry-key');
    });
  });

  describe('isNotificationOpened', () => {
    it('returns true if opened', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('entry-key');

      const result = await service.isNotificationOpened('entry-key');

      expect(result).toBe(true);
    });

    it('returns false if not opened', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('other-key');

      const result = await service.isNotificationOpened('entry-key');

      expect(result).toBe(false);
    });
  });

  describe('scheduleTestNotification', () => {
    it('schedules a test notification', async () => {
      mockNotifee.createTriggerNotification.mockResolvedValue('test-notif');

      const result = await service.scheduleTestNotification();

      expect(mockNotifee.createTriggerNotification).toHaveBeenCalled();
      expect(result).toBe('test-notif');
    });

    it('handles errors', async () => {
      mockNotifee.createTriggerNotification.mockRejectedValue(new Error('Notifee error'));

      const result = await service.scheduleTestNotification();

      expect(result).toBeNull();
    });
  });
});
