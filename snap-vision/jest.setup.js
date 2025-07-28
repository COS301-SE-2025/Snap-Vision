jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');

jest.mock('@react-native-firebase/app', () => ({
  initializeApp: jest.fn(),
}));

jest.mock('@react-native-firebase/firestore', () => {
  const mockFirestoreInstance = {
    useEmulator: jest.fn(),
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        set: jest.fn(),
        get: jest.fn(() => ({
          exists: jest.fn(() => true), // ✅ Changed to function
          data: jest.fn(() => ({
            pois: [
              {
                poiId: 'poi-1',
                name: 'Test Location 1',
                timestamp: { toDate: () => new Date() },
                centroid: { latitude: -25.755, longitude: 28.233 },
              },
            ],
          })),
        })),
        update: jest.fn(),
        delete: jest.fn(),
      })),
      // Add missing methods for integration tests
      add: jest.fn(),
      where: jest.fn(() => ({
        get: jest.fn(() => ({
          docs: [],
          empty: true,
        })),
      })),
    })),
  };

  const mockFirestore = jest.fn(() => mockFirestoreInstance);

  mockFirestore.Timestamp = {
    now: jest.fn(() => ({
      seconds: Math.floor(Date.now() / 1000),
      nanoseconds: (Date.now() % 1000) * 1e6,
      toDate: () => new Date(),
    })),
    fromDate: jest.fn((date) => ({
      seconds: Math.floor(date.getTime() / 1000),
      nanoseconds: (date.getTime() % 1000) * 1e6,
      toDate: () => date,
    })),
  };

  return mockFirestore;
});

jest.mock('@react-native-firebase/auth', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    currentUser: null,
    useEmulator: jest.fn(),
  })),
}));