import type {} from 'jest';

// Mock InputValidator
jest.mock('../../src/security/InputValidator', () => ({
  validateUserId: jest.fn((id) => id),
  validateDocumentId: jest.fn((id) => id),
  validateStringArray: jest.fn((arr) => arr || []),
  validateNumber: jest.fn((num, def) => num ?? def ?? 0),
}));

// Mock AuthorizationService
jest.mock('../../src/security/AuthorizationService', () => ({
  getInstance: jest.fn(() => ({
    canAccessBadgeData: jest.fn(() => true),
  })),
}));

jest.mock('@react-native-firebase/firestore', () => {
  const store: Map<string, any> = new Map();
  const clone = (v: any) => JSON.parse(JSON.stringify(v));
  const makePath = (col: string, id: string) => `${col}/${id}`;
  const serverTs = { __server: true };

  const dbInstance = {
    runTransaction: jest.fn(async (fn: any) => {
      const tx = {
        get: async (ref: any) => {
          const data = store.get(ref.__path);
          return { exists: !!data, data: () => clone(data) };
        },
        set: async (ref: any, data: any) => {
          store.set(ref.__path, clone(data));
        },
        update: async (ref: any, patch: any) => {
          const cur = store.get(ref.__path) || {};
          store.set(ref.__path, { ...clone(cur), ...clone(patch) });
        },
      };
      return fn(tx);
    }),
    collection: (name: string) => ({
      doc: (id: string) => ({
        id,
        __path: makePath(name, id),
        get: async () => {
          const data = store.get(makePath(name, id));
          return { exists: !!data, data: () => clone(data) };
        },
        set: async (data: any) => {
          store.set(makePath(name, id), clone(data));
        },
        update: async (patch: any) => {
          const cur = store.get(makePath(name, id)) || {};
          store.set(makePath(name, id), { ...clone(cur), ...clone(patch) });
        },
      }),
    }),
  };

  const mockFirestore = jest.fn(() => dbInstance);
  mockFirestore.FieldValue = { serverTimestamp: jest.fn(() => serverTs) };

  // Expose store and serverTs for test manipulation
  mockFirestore.__store = store;
  mockFirestore.__serverTs = serverTs;

  return {
    __esModule: true,
    default: mockFirestore,
  };
});

// Import after mock is set up
import firestore from '@react-native-firebase/firestore';
import {
  unlockBadgeForUser,
  getUserBadgeData,
  purchaseItemForUser,
  completeChallengeForUser,
  incrementRoutesCompletedForUser,
} from '../../src/services/badgeService';

describe('badgeService integration', () => {
  let store: Map<string, any>;
  let serverTs: any;

  beforeEach(() => {
    jest.clearAllMocks();
    // Access the store and serverTs from the mock
    const mockFs = firestore as any;
    store = mockFs.__store;
    serverTs = mockFs.__serverTs;
    store.clear();
  });

  it('end-to-end flow across functions', async () => {
    await unlockBadgeForUser('u', 'b1');
    await unlockBadgeForUser('u', 'b2');
    await unlockBadgeForUser('u', 'b3');
    let d = await getUserBadgeData('u') as any;
    expect(d.points).toBe(150);
    expect(d.badges).toEqual(expect.arrayContaining(['b1', 'b2', 'b3', 'points-150']));

    d = await purchaseItemForUser('u', { id: 'itemA', title: 'A', cost: 40 }) as any;
    expect(d.points).toBe(110);
    expect(d.purchases).toHaveLength(1);
    expect(d.purchases[0]).toMatchObject({ id: 'itemA', title: 'A', cost: 40, boughtAt: serverTs });

    d = await completeChallengeForUser('u', 'c1') as any;
    expect(d.points).toBe(130);
    d = await completeChallengeForUser('u', 'c1') as any;
    expect(d.points).toBe(130);

    store.set('users/u', { ...store.get('users/u'), routesCompleted: 9, badges: d.badges });
    d = await incrementRoutesCompletedForUser('u') as any;
    expect(d.routesCompleted).toBe(10);
    expect(d.badges).toEqual(expect.arrayContaining(['10-destinations']));
    d = await incrementRoutesCompletedForUser('u') as any;
    expect(d.routesCompleted).toBe(11);
    expect(d.badges.filter((x: string) => x === '10-destinations')).toHaveLength(1);
  });
});
