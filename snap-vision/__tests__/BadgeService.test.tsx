import type {} from 'jest';

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

  // Attach static properties
  mockFirestore.FieldValue = { serverTimestamp: jest.fn(() => serverTs) };

  // Expose store for test manipulation
  mockFirestore.__store = store;
  mockFirestore.__serverTs = serverTs;

  return {
    __esModule: true,
    default: mockFirestore,
  };
});

// Mocks for dependencies
jest.mock('../src/security/InputValidator', () => ({
  validateUserId: jest.fn((id: string) => id),
  validateDocumentId: jest.fn((id: string) => id),
  validateStringArray: jest.fn((arr: any) => arr),
  validateNumber: jest.fn((val: any) => val),
}));

jest.mock('../src/security/AuthorizationService', () => ({
  getInstance: jest.fn(() => ({
    canAccessBadgeData: jest.fn(() => true),
  })),
}));

// Import after mock is set up
import firestore from '@react-native-firebase/firestore';
import {
  unlockBadgeForUser,
  getUserBadgeData,
  purchaseItemForUser,
  completeChallengeForUser,
  incrementRoutesCompletedForUser,
} from '../src/services/badgeService';

describe('badgeService unit', () => {
  let store: Map<string, any>;
  let serverTs: any;

  beforeEach(() => {
    jest.clearAllMocks();
    // Access the store from the mock
    store = (firestore as any).__store;
    serverTs = (firestore as any).__serverTs;
    store.clear();
  });

    it('unlockBadgeForUser creates new user with badge and points 50', async () => {
      await unlockBadgeForUser('userone', 'badgeone');
      const d = await getUserBadgeData('userone');
      expect(d && d.badges).toEqual(['badgeone']);
      expect(d && d.points).toBe(50);
      expect(d && d.checkIns).toBe(0);
      expect(d && d.routesCompleted).toBe(0);
    });

  it('unlockBadgeForUser adds badge and milestone when reaching 150', async () => {
    store.set('users/usertwo', { badges: ['x'], points: 100, checkIns: 0, routesCompleted: 0 });
    await unlockBadgeForUser('usertwo', 'y');
    await unlockBadgeForUser('usertwo', 'z');
    const d = await getUserBadgeData('usertwo');
    expect(d && d.points).toBe(200);
    // Milestone badge should be 'points-150' per implementation
    expect(d && d.badges).toEqual(expect.arrayContaining(['y', 'z', 'points-150', 'x']));
  });

  //   it('unlockBadgeForUser does not duplicate badge or add points twice', async () => {
  //     store.set('users/u3', { badges: ['a'], points: 140 })
  //     await unlockBadgeForUser('u3', 'a')
  //     const d = await getUserBadgeData('u3')
  //     expect(d.points).toBe(140)
  //     expect(d.badges).toEqual(['a', 'points-150'])
  //   })

  it('getUserBadgeData returns null when not exists', async () => {
    // Use a valid but non-existent user ID
    const d = await getUserBadgeData('userdoesnotexist');
    expect(d).toBeNull();
  });

  it('purchaseItemForUser success updates points and purchases', async () => {
    store.set('users/u4', { points: 200, purchases: [] });
    const updated = await purchaseItemForUser('u4', { id: 'item1', cost: 60, title: 'N' });
    expect(updated.points).toBe(140);
    expect(updated.purchases).toHaveLength(1);
    expect(updated.purchases[0]).toMatchObject({
      id: 'item1',
      cost: 60,
      title: 'N',
      boughtAt: serverTs,
    });
  });

  it('purchaseItemForUser throws when user not found', async () => {
    await expect(purchaseItemForUser('missing', { id: 'i', cost: 1 })).rejects.toThrow(
      'User not found',
    );
  });

  it('purchaseItemForUser throws when not enough points', async () => {
    store.set('users/u5', { points: 10 });
    await expect(purchaseItemForUser('u5', { id: 'i', cost: 50 })).rejects.toThrow(
      'Not enough points',
    );
  });

  it('completeChallengeForUser awards once and adds 20 points', async () => {
    store.set('users/u6', { points: 0, completedChallenges: [] });
    let d = await completeChallengeForUser('u6', 'c1');
    expect(d.points).toBe(20);
    expect(d.completedChallenges).toEqual(['c1']);
    d = await completeChallengeForUser('u6', 'c1');
    expect(d.points).toBe(20);
    expect(d.completedChallenges).toEqual(['c1']);
  });

  it('incrementRoutesCompletedForUser unlocks destination badge at 10', async () => {
    store.set('users/u7', { routesCompleted: 9, badges: [] });
    let d = await incrementRoutesCompletedForUser('u7');
    expect(d.routesCompleted).toBe(10);
    expect(d.badges).toEqual(['10-destinations']);
    d = await incrementRoutesCompletedForUser('u7');
    expect(d.routesCompleted).toBe(11);
    expect(d.badges).toEqual(['10-destinations']);
  });

  it('unlockBadgeForUser logs and rethrows on transaction error', async () => {
    const mockRunTransaction = jest.fn().mockRejectedValue(new Error('tx'));
    const originalRunTransaction = (firestore() as any).runTransaction;
    (firestore() as any).runTransaction = mockRunTransaction;

    // Use valid user and badge IDs to pass validation and trigger the transaction error
    await expect(unlockBadgeForUser('usereight', 'badgebb')).rejects.toThrow('tx');

    // Restore original
    (firestore() as any).runTransaction = originalRunTransaction;
  });
});
