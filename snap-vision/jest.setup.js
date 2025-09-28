jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter');

// Mock React Native Dimensions globally
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');

  // Mock problematic components that cause TurboModule issues
  RN.DevMenu = {};
  RN.ProgressBarAndroid = RN.View;
  RN.Clipboard = {
    getString: jest.fn(),
    setString: jest.fn(),
  };

  // Mock Dimensions
  RN.Dimensions = {
    get: jest.fn(() => ({ width: 375, height: 667 })),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  };

  return RN;
});

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
          exists: jest.fn(() => true), //  Changed to function
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

jest.mock('@react-native-firebase/auth', () => {
  const mockAuthInstance = {
    currentUser: null,
    useEmulator: jest.fn(),
    onAuthStateChanged: jest.fn((callback) => {
      // Simulate initial auth state change
      setTimeout(() => callback(null), 0);
      return jest.fn(); // Return unsubscribe function
    }),
  };

  const mockAuth = jest.fn(() => mockAuthInstance);
  mockAuth.mockReturnValue(mockAuthInstance);

  return {
    __esModule: true,
    default: mockAuth,
  };
});

jest.mock('@react-native-firebase/perf', () => {
  const mockTrace = {
    start: jest.fn(() => Promise.resolve()),
    stop: jest.fn(() => Promise.resolve()),
  };

  const mockPerfInstance = {
    newTrace: jest.fn(() => mockTrace),
  };

  const mockPerf = jest.fn(() => mockPerfInstance);

  return {
    __esModule: true,
    default: mockPerf,
  };
});
