import AuthorizationService from '../src/security/AuthorizationService';

jest.mock('../src/security/AuthorizationService');
jest.mock('../src/services/CacheService');
jest.mock('../src/security/InputValidator');

const mockAuthService = {
  getCurrentUserContext: jest.fn(),
  canModifyLocation: jest.fn(),
  canAccessLocation: jest.fn(),
  canAccessBuilding: jest.fn(),
  canAccessQRCode: jest.fn(),
  canModifyQRCode: jest.fn(),
};

const mockCacheService = {
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
  getInstance: jest.fn(),
};

const mockInputValidator = {
  validateDocumentId: jest.fn((id: string) => id), // return input as valid by default
  validateText: jest.fn((text: string) => text), // return input as valid by default
} as {
  validateDocumentId: jest.MockedFunction<(id: unknown) => string | null>;
  validateText: jest.MockedFunction<(text: unknown, maxLength?: number) => string | null>;
};

(AuthorizationService.getInstance as jest.Mock).mockReturnValue(mockAuthService);

// Mock CacheService
jest.doMock('../src/services/CacheService', () => ({
  __esModule: true,
  default: {
    getInstance: () => mockCacheService,
  },
}));

// Mock InputValidator
jest.doMock('../src/security/InputValidator', () => ({
  __esModule: true,
  default: mockInputValidator,
}));

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

let qrService: any;

beforeAll(() => {
  jest.isolateModules(() => {
    qrService = require('../src/services/qrService');
  });
});

let mockUser: { uid: string } | null = { uid: 'user-123' };
jest.mock('@react-native-firebase/auth', () => {
  const get = () => ({
    get currentUser() {
      return mockUser;
    },
  });
  (get as any).__setUser = (u: any) => (mockUser = u);
  return get;
});
const setAuthUser = (auth as any).__setUser as (u: any) => void;

const mockNow = { _ts: 'NOW' };
const mockTimestampNow = jest.fn(() => mockNow);

const mockCollection = jest.fn();
const mockDoc = jest.fn();
const mockSet = jest.fn();
const mockGet = jest.fn();
const mockWhere = jest.fn();
const mockOrderBy = jest.fn();
const mockLimit = jest.fn();
const mockDelete = jest.fn();
const mockUpdate = jest.fn();

type Doc = { id: string; data: () => any };
const makeSnap = (docs: Doc[]) => ({ docs, empty: docs.length === 0 });

jest.mock('@react-native-firebase/firestore', () => {
  const mockTimestamp = {
    now: jest.fn(() => ({ _ts: 'NOW' })),
  };

  const mockFirestore = jest.fn(() => ({
    collection: jest.fn(),
  }));

  // Create the module export structure
  const moduleExports = {
    __esModule: true,
    default: mockFirestore,
    Timestamp: mockTimestamp,
  };

  // Ensure default export also has Timestamp
  Object.assign(mockFirestore, { Timestamp: mockTimestamp });
  Object.assign(moduleExports.default, { Timestamp: mockTimestamp });

  return moduleExports;
});

beforeEach(() => {
  jest.clearAllMocks();
  setAuthUser({ uid: 'user-123' });

  // Reset the mockTimestampNow function
  mockTimestampNow.mockReturnValue(mockNow);

  // Ensure the firestore mock returns our mockTimestampNow
  (firestore as any).Timestamp.now.mockImplementation(() => mockNow);

  // Default auth service mocks for happy paths
  mockAuthService.getCurrentUserContext.mockResolvedValue({ userId: 'user-123', role: 'admin' });
  mockAuthService.canModifyLocation.mockResolvedValue(true);
  mockAuthService.canAccessLocation.mockResolvedValue(true);
  mockAuthService.canAccessBuilding.mockResolvedValue(true);
  mockAuthService.canAccessQRCode.mockResolvedValue(true);
  mockAuthService.canModifyQRCode.mockResolvedValue(true);

  // Default cache service mocks
  mockCacheService.get.mockResolvedValue(null); // No cache hits by default
  mockCacheService.set.mockResolvedValue(undefined);
  mockCacheService.remove.mockResolvedValue(undefined);

  mockCollection.mockImplementation((path: string) => ({
    doc: (id?: string) => {
      const _id = id ?? 'gen-id-1';
      return {
        id: _id,
        collection: mockCollection,
        set: mockSet,
        get: mockGet,
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        delete: mockDelete,
        update: mockUpdate,
      };
    },
    get: mockGet,
    where: mockWhere,
    orderBy: mockOrderBy,
  }));

  // Setup the firestore instance mock
  (firestore as any).mockImplementation(() => ({
    collection: mockCollection,
  }));

  mockDoc.mockReset();
  mockSet.mockResolvedValue(undefined);
  mockGet.mockResolvedValue(makeSnap([]));
  mockWhere.mockImplementation(() => ({
    where: mockWhere,
    get: mockGet,
    limit: mockLimit,
    orderBy: mockOrderBy,
  }));
  mockLimit.mockImplementation(() => ({ get: mockGet }));
  mockOrderBy.mockImplementation(() => ({ get: mockGet }));
  mockDelete.mockResolvedValue(undefined);
  mockUpdate.mockResolvedValue(undefined);
});

describe('createQRCodeMapping', () => {
  it('creates mapping with correct payload and path (auth ok)', async () => {
    // Simulate doc() auto-id + set capture
    mockCollection.mockImplementation((path: string) => ({
      doc: (id?: string) => {
        const generatedId = 'qr-abc';
        return {
          id: generatedId,
          set: mockSet,
          collection: mockCollection,
        };
      },
    }));

    const result = await qrService.createQRCodeMapping(
      'loc1',
      'Loc Name',
      'b1',
      'Building One',
      'f1',
      'r1',
      'Room One',
      'QR123',
      'desc here',
    );

    expect(mockCollection).toHaveBeenCalledWith('locations');
    // We walk doc('loc1')->collection('qrCodes')->doc()
    expect(mockSet).toHaveBeenCalledTimes(1);
    const payload = mockSet.mock.calls[0][0];
    expect(payload).toMatchObject({
      id: 'qr-abc',
      qrValue: 'QR123',
      locationId: 'loc1',
      locationName: 'Loc Name',
      buildingId: 'b1',
      buildingName: 'Building One',
      floorId: 'f1',
      roomId: 'r1',
      roomName: 'Room One',
      createdBy: 'user-123',
      description: 'desc here',
    });
    expect(payload.createdAt).toBe(mockNow);
    // return value mirrors payload
    expect(result).toMatchObject(payload);
  });

  it('throws when unauthenticated', async () => {
    setAuthUser(null);
    mockAuthService.getCurrentUserContext.mockResolvedValue(null);
    await expect(
      qrService.createQRCodeMapping('l', 'ln', 'b', 'bn', 'f', 'r', 'rn', 'QR'),
    ).rejects.toThrow('User not authenticated');
  });

  it('throws when input validation fails - invalid locationId', async () => {
    mockInputValidator.validateDocumentId.mockReturnValueOnce(null); // First call fails
    await expect(
      qrService.createQRCodeMapping('', 'ln', 'b', 'bn', 'f', 'r', 'rn', 'QR'),
    ).rejects.toThrow('Invalid input parameters');
  });

  it('throws when input validation fails - invalid QR value', async () => {
    mockInputValidator.validateText.mockReturnValueOnce(null); // QR value validation fails
    await expect(
      qrService.createQRCodeMapping('l', 'ln', 'b', 'bn', 'f', 'r', 'rn', ''),
    ).rejects.toThrow('Invalid input parameters');
  });

  it('throws when user cannot modify location', async () => {
    mockAuthService.canModifyLocation.mockResolvedValueOnce(false);
    await expect(
      qrService.createQRCodeMapping('l', 'ln', 'b', 'bn', 'f', 'r', 'rn', 'QR'),
    ).rejects.toThrow('Unauthorized: Cannot modify QR codes for this location');
  });
});

describe('getQRCodeMappingByValue', () => {
  it('searches each location and returns first match', async () => {
    const locationsSnap = makeSnap([
      { id: 'locA', data: () => ({ name: 'A' }) },
      { id: 'locB', data: () => ({ name: 'B' }) },
    ]);
    // First call to collection('locations').get() returns locations
    mockGet
      .mockResolvedValueOnce(locationsSnap)
      // next: for locA -> qrCodes where qrValue==X .limit(1).get() -> empty
      .mockResolvedValueOnce(makeSnap([]))
      // next: for locB -> qrCodes where qrValue==X .limit(1).get() -> found
      .mockResolvedValueOnce(
        makeSnap([{ id: 'doc1', data: () => ({ qrValue: 'X', roomId: 'r1' }) } as any]),
      );

    const found = await qrService.getQRCodeMappingByValue('X');
    expect(found).toMatchObject({ id: 'doc1', qrValue: 'X', roomId: 'r1' });
  });

  it('returns null when not found', async () => {
    mockGet.mockResolvedValueOnce(makeSnap([{ id: 'locA', data: () => ({}) }]));
    mockGet.mockResolvedValueOnce(makeSnap([])); // first location no hit
    const found = await qrService.getQRCodeMappingByValue('NOPE');
    expect(found).toBeNull();
  });

  it('throws when user not authenticated', async () => {
    mockAuthService.getCurrentUserContext.mockResolvedValueOnce(null);
    await expect(qrService.getQRCodeMappingByValue('QR123')).rejects.toThrow(
      'User not authenticated'
    );
  });

  it('throws when QR value validation fails', async () => {
    mockInputValidator.validateText.mockReturnValueOnce(null);
    await expect(qrService.getQRCodeMappingByValue('')).rejects.toThrow(
      'Invalid QR code value'
    );
  });

  it('returns cached result when available', async () => {
    const cachedResult = { id: 'cached-qr', qrValue: 'CACHED' };
    mockCacheService.get.mockResolvedValueOnce(cachedResult);

    const found = await qrService.getQRCodeMappingByValue('CACHED');
    expect(found).toEqual(cachedResult);
    expect(mockGet).not.toHaveBeenCalled(); // Should not query Firestore
  });
});

describe('getLocations', () => {
  it('maps id + name, falls back to id when name missing', async () => {
    mockGet.mockResolvedValueOnce(
      makeSnap([
        { id: 'L1', data: () => ({ name: 'Campus' }) },
        { id: 'L2', data: () => ({}) },
      ]),
    );
    const out = await qrService.getLocations();
    expect(out).toEqual([
      { id: 'L1', name: 'Campus' },
      { id: 'L2', name: 'L2' },
    ]);
  });

  it('throws when user not authenticated', async () => {
    mockAuthService.getCurrentUserContext.mockResolvedValueOnce(null);
    await expect(qrService.getLocations()).rejects.toThrow('User not authenticated');
  });

  it('returns cached result when available', async () => {
    const cachedLocations = [{ id: 'cached-loc', name: 'Cached Location' }];
    mockCacheService.get.mockResolvedValueOnce(cachedLocations);

    const result = await qrService.getLocations();
    expect(result).toEqual(cachedLocations);
    expect(mockGet).not.toHaveBeenCalled(); // Should not query Firestore
  });
});

describe('getBuildingsForLocation', () => {
  it('lists buildings under location', async () => {
    mockGet.mockResolvedValueOnce(
      makeSnap([
        { id: 'B1', data: () => ({ name: 'A Block' }) },
        { id: 'B2', data: () => ({}) },
      ]),
    );
    const out = await qrService.getBuildingsForLocation('loc1');
    expect(out).toEqual([
      { id: 'B1', name: 'A Block' },
      { id: 'B2', name: 'B2' },
    ]);
  });

  it('throws when location ID validation fails', async () => {
    mockInputValidator.validateDocumentId.mockReturnValueOnce(null);
    await expect(qrService.getBuildingsForLocation('')).rejects.toThrow(
      'Invalid location ID'
    );
  });

  it('throws when user cannot access location', async () => {
    mockAuthService.canAccessLocation.mockResolvedValueOnce(false);
    await expect(qrService.getBuildingsForLocation('loc1')).rejects.toThrow(
      'Unauthorized access to location buildings'
    );
  });

  it('returns cached result when available', async () => {
    const cachedBuildings = [{ id: 'cached-building', name: 'Cached Building' }];
    mockCacheService.get.mockResolvedValueOnce(cachedBuildings);

    const result = await qrService.getBuildingsForLocation('loc1');
    expect(result).toEqual(cachedBuildings);
    expect(mockGet).not.toHaveBeenCalled(); // Should not query Firestore
  });
});

describe('getFloorsForBuilding', () => {
  it('orders by floorLabel if orderBy works', async () => {
    // Setup the complete chain: firestore().collection('locations').doc(id).collection('buildingPOIs').doc(id).collection('floorplans')
    const mockOrderByResult = { get: jest.fn() };
    const mockFloorplansCollection = { 
      orderBy: jest.fn(() => mockOrderByResult),
      get: jest.fn() 
    };
    const mockBuildingDoc = { 
      collection: jest.fn((name) => {
        if (name === 'floorplans') return mockFloorplansCollection;
        return mockFloorplansCollection;
      })
    };
    const mockBuildingPOIsCollection = { 
      doc: jest.fn(() => mockBuildingDoc) 
    };
    const mockLocationDoc = { 
      collection: jest.fn((name) => {
        if (name === 'buildingPOIs') return mockBuildingPOIsCollection;
        return mockBuildingPOIsCollection;
      })
    };
    const mockLocationsCollection = { 
      doc: jest.fn(() => mockLocationDoc) 
    };
    
    mockCollection.mockReturnValueOnce(mockLocationsCollection);
    mockOrderByResult.get.mockResolvedValueOnce(
      makeSnap([
        { id: 'f1', data: () => ({ floorLabel: 'Floor 1' }) },
        { id: 'f2', data: () => ({ floorLabel: 'Floor 2' }) },
      ]),
    );
    
    const out = await qrService.getFloorsForBuilding('loc', 'b');
    expect(out).toEqual([
      { id: 'f1', name: 'Floor 1' },
      { id: 'f2', name: 'Floor 2' },
    ]);
  });

  it('falls back to plain get() when orderBy throws', async () => {
    // Setup the complete chain with orderBy throwing error
    const mockOrderByResult = { get: jest.fn() };
    const mockFloorplansCollection = { 
      orderBy: jest.fn(() => { throw new Error('no index'); }),
      get: jest.fn()
    };
    const mockBuildingDoc = { 
      collection: jest.fn((name) => {
        if (name === 'floorplans') return mockFloorplansCollection;
        return mockFloorplansCollection;
      })
    };
    const mockBuildingPOIsCollection = { 
      doc: jest.fn(() => mockBuildingDoc) 
    };
    const mockLocationDoc = { 
      collection: jest.fn((name) => {
        if (name === 'buildingPOIs') return mockBuildingPOIsCollection;
        return mockBuildingPOIsCollection;
      })
    };
    const mockLocationsCollection = { 
      doc: jest.fn(() => mockLocationDoc) 
    };
    
    mockCollection.mockReturnValueOnce(mockLocationsCollection);
    mockFloorplansCollection.get.mockResolvedValueOnce(
      makeSnap([
        { id: 'fx', data: () => ({ name: 'Label X' }) },
        { id: 'fy', data: () => ({}) },
      ]),
    );
    
    const out = await qrService.getFloorsForBuilding('loc', 'b');
    expect(out).toEqual([
      { id: 'fx', name: 'Label X' },
      { id: 'fy', name: 'fy' },
    ]);
  });

  it('throws when location ID validation fails', async () => {
    mockInputValidator.validateDocumentId.mockReturnValueOnce(null); // First call fails
    await expect(qrService.getFloorsForBuilding('', 'b')).rejects.toThrow(
      'Invalid location or building ID'
    );
  });

  it('throws when building ID validation fails', async () => {
    mockInputValidator.validateDocumentId
      .mockReturnValueOnce('loc') // First call succeeds
      .mockReturnValueOnce(null); // Second call fails
    await expect(qrService.getFloorsForBuilding('loc', '')).rejects.toThrow(
      'Invalid location or building ID'
    );
  });

  it('throws when user cannot access building', async () => {
    mockAuthService.canAccessBuilding.mockResolvedValueOnce(false);
    await expect(qrService.getFloorsForBuilding('loc', 'b')).rejects.toThrow(
      'Unauthorized access to building floors'
    );
  });

  it('returns cached result when available', async () => {
    const cachedFloors = [{ id: 'cached-floor', name: 'Cached Floor' }];
    mockCacheService.get.mockResolvedValueOnce(cachedFloors);

    const result = await qrService.getFloorsForBuilding('loc', 'b');
    expect(result).toEqual(cachedFloors);
  });
});

describe('getRoomsForFloor', () => {
  it('filters by floorId/floorLevel/floorLabel and maps fields', async () => {
    // Setup collection mock chain with where clause
    const mockWhereChain = { get: jest.fn() };
    const mockCollectionChain = { where: jest.fn(() => mockWhereChain) };
    const mockDocChain = { collection: jest.fn(() => mockCollectionChain) };
    const mockLocationCollection = { doc: jest.fn(() => mockDocChain) };
    
    mockCollection.mockReturnValueOnce(mockLocationCollection);
    mockWhereChain.get.mockResolvedValueOnce(
      makeSnap([
        {
          id: 'r1',
          data: () => ({ name: 'Room 1', buildingId: 'b', buildingName: 'B', floorId: 'F2' }),
        },
        { id: 'r2', data: () => ({ roomName: 'Room 2', buildingId: 'b', floorLevel: 'F2' }) },
        { id: 'r3', data: () => ({ buildingId: 'b', floorLabel: 'F1' }) }, // should be filtered out for target F2
      ]),
    );
    const out = await qrService.getRoomsForFloor('loc', 'b', 'F2');
    expect(out).toEqual([
      {
        id: 'r1',
        name: 'Room 1',
        buildingId: 'b',
        buildingName: 'B',
        floorId: 'F2',
        floorLabel: 'F2',
      },
      {
        id: 'r2',
        name: 'Room 2',
        buildingId: 'b',
        buildingName: 'b',
        floorId: 'F2',
        floorLabel: 'F2',
      },
    ]);
  });
});

describe('getQRCodesForBuilding', () => {
  it('queries by buildingId, orders by createdAt desc, returns data', async () => {
    // Setup collection mock chain with where clause
    const mockWhereChain = { get: jest.fn() };
    const mockCollectionChain = { where: jest.fn(() => mockWhereChain) };
    const mockDocChain = { collection: jest.fn(() => mockCollectionChain) };
    const mockLocationCollection = { doc: jest.fn(() => mockDocChain) };
    
    const d1 = { qrValue: 'A' };
    const d2 = { qrValue: 'B' };
    
    mockCollection.mockReturnValueOnce(mockLocationCollection);
    mockWhereChain.get.mockResolvedValueOnce(
      makeSnap([
        { id: '1', data: () => d1 },
        { id: '2', data: () => d2 },
      ]),
    );
    const out = await qrService.getQRCodesForBuilding('loc', 'b');
    expect(out).toEqual([
      { ...d1, id: '1' },
      { ...d2, id: '2' }
    ]);
  });
});

describe('delete / update', () => {
  it('deleteQRCodeMapping returns true', async () => {
    // Setup collection mock chain for get operation
    const mockDocRef = { 
      get: jest.fn(),
      ref: { delete: mockDelete },
      exists: true,
      data: () => ({ buildingId: 'b1', qrValue: 'QR123' })
    };
    const mockQRCollection = { doc: jest.fn(() => mockDocRef) };
    const mockLocationDoc = { collection: jest.fn(() => mockQRCollection) };
    const mockLocationCollection = { doc: jest.fn(() => mockLocationDoc) };
    
    mockCollection.mockReturnValueOnce(mockLocationCollection);
    mockDocRef.get.mockResolvedValueOnce(mockDocRef);
    
    await expect(qrService.deleteQRCodeMapping('loc', 'qr1')).resolves.toBe(true);
    expect(mockDelete).toHaveBeenCalled();
  });

  it('updateQRCodeMapping returns true', async () => {
    // Setup collection mock chain for get and update operations
    const mockDocRef = {
      get: jest.fn(),
      update: mockUpdate,
      exists: true,
      data: () => ({ buildingId: 'b1', qrValue: 'QR123', description: 'old desc' })
    };
    const mockQRCollection = { doc: jest.fn(() => mockDocRef) };
    const mockLocationDoc = { collection: jest.fn(() => mockQRCollection) };
    const mockLocationCollection = { doc: jest.fn(() => mockLocationDoc) };
    
    mockCollection.mockReturnValueOnce(mockLocationCollection);
    mockDocRef.get.mockResolvedValueOnce(mockDocRef);
    
    await expect(qrService.updateQRCodeMapping('loc', 'qr1', { description: 'x' })).resolves.toMatchObject({
      buildingId: 'b1',
      qrValue: 'QR123', 
      description: 'x'
    });
    expect(mockUpdate).toHaveBeenCalledWith({ description: 'x' });
  });

  it('delete propagates errors', async () => {
    // Setup collection mock chain that throws error
    const mockDocRef = { 
      get: jest.fn(),
      ref: { delete: mockDelete },
      exists: true,
      data: () => ({ buildingId: 'b1', qrValue: 'QR123' })
    };
    const mockQRCollection = { doc: jest.fn(() => mockDocRef) };
    const mockLocationDoc = { collection: jest.fn(() => mockQRCollection) };
    const mockLocationCollection = { doc: jest.fn(() => mockLocationDoc) };
    
    mockCollection.mockReturnValueOnce(mockLocationCollection);
    mockDocRef.get.mockResolvedValueOnce(mockDocRef);
    mockDelete.mockRejectedValueOnce(new Error('fail'));
    
    await expect(qrService.deleteQRCodeMapping('loc', 'qr1')).rejects.toThrow('fail');
  });

  it('update propagates errors', async () => {
    // Setup collection mock chain that throws error on update
    const mockDocRef = {
      get: jest.fn(),
      update: mockUpdate,
      exists: true,
      data: () => ({ buildingId: 'b1', qrValue: 'QR123', description: 'old desc' })
    };
    const mockQRCollection = { doc: jest.fn(() => mockDocRef) };
    const mockLocationDoc = { collection: jest.fn(() => mockQRCollection) };
    const mockLocationCollection = { doc: jest.fn(() => mockLocationDoc) };
    
    mockCollection.mockReturnValueOnce(mockLocationCollection);
    mockDocRef.get.mockResolvedValueOnce(mockDocRef);
    mockUpdate.mockRejectedValueOnce(new Error('boom'));
    
    await expect(qrService.updateQRCodeMapping('loc', 'qr1', {})).rejects.toThrow('boom');
  });
});
