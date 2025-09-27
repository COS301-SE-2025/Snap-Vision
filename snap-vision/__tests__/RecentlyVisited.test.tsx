jest.mock('@react-native-firebase/firestore', () => {
  const store = new Map<string, any>();

  // Special clone function that preserves timestamp objects
  const clone = (v: any): any => {
    if (v == null) return v;
    if (typeof v === 'object' && v.toMillis && typeof v.toMillis === 'function') {
      // This is a timestamp object, preserve it
      return v;
    }
    if (Array.isArray(v)) {
      return v.map(clone);
    }
    if (typeof v === 'object') {
      const result: any = {};
      for (const key in v) {
        result[key] = clone(v[key]);
      }
      return result;
    }
    return v;
  };

  let nowQueue: number[] = [];
  const tsObj = (n: number) => ({ toMillis: () => n });

  const db = {
    collection: (name: string) => ({
      doc: (id: string) => ({
        id,
        get: async () => {
          const data = store.get(`${name}/${id}`);
          const exists = !!data;
          return {
            exists: () => exists,
            data: () => clone(data),
          };
        },
        set: async (data: any) => {
          store.set(`${name}/${id}`, clone(data));
        },
        update: async (patch: any) => {
          const cur = store.get(`${name}/${id}`);
          if (!cur) throw new Error('not-found');
          store.set(`${name}/${id}`, { ...clone(cur), ...clone(patch) });
        },
      }),
    }),
    Timestamp: {
      now: jest.fn(() => tsObj(nowQueue.length ? (nowQueue.shift() as number) : Date.now())),
    },
  };

  const fn: any = () => db;
  fn.Timestamp = db.Timestamp;

  // Expose internal state for tests
  fn.__store = store;
  fn.__setNowQueue = (queue: number[]) => {
    nowQueue = queue;
  };
  fn.__db = db;

  return fn;
});

jest.mock('@react-native-firebase/auth', () => {
  let currentUser: any = { uid: 'auth-user' };

  const api: any = () => ({
    get currentUser() {
      return currentUser;
    },
  });
  api.__setUser = (u: any) => (currentUser = u);
  return api;
});

function load() {
  jest.isolateModules(() => {
    mod = require('../src/services/firebase/recentlyVService');
  });
  return mod;
}

let mod: any;
const firestore = require('@react-native-firebase/firestore');
const setAuthUser = (require('@react-native-firebase/auth') as any).__setUser as (u: any) => void;

// Helper functions to access mock internals
const getStore = () => (firestore as any).__store as Map<string, any>;
const setNowQueue = (queue: number[]) => (firestore as any).__setNowQueue(queue);
const getDb = () => (firestore as any).__db;

const path = (u: string) => `recentlyVisited/${u}`;
const tsObj = (n: number) => ({ toMillis: () => n });

describe('recentlyVService', () => {
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

  beforeEach(() => {
    jest.clearAllMocks();
    getStore().clear();
    setAuthUser({ uid: 'auth-user' });
    setNowQueue([]);
    load();
  });

  afterAll(() => {
    logSpy.mockRestore();
    errSpy.mockRestore();
  });

  it('getRecentlyVPOIs returns [] when no user', async () => {
    setAuthUser(null);
    load();
    const out = await mod.getRecentlyVPOIs();
    expect(out).toEqual([]);
  });

  it('getRecentlyVPOIs returns [] when doc missing', async () => {
    const out = await mod.getRecentlyVPOIs();
    expect(out).toEqual([]);
  });

  it('getRecentlyVPOIs sorts by timestamp desc and limits to 10', async () => {
    const u = 'u1';
    const pois = Array.from({ length: 15 }).map((_, i) => ({
      id: `p${i}`,
      userId: u,
      poiId: `poi-${i}`,
      name: `Poi ${i}`,
      timestamp: tsObj(1000 + i),
      centroid: { latitude: 0, longitude: 0 },
    }));
    getStore().set(path(u), { userId: u, pois });
    const out = await mod.getRecentlyVPOIs(u);
    expect(out).toHaveLength(10);
    const millis = out.map((v: any) => v.timestamp.toMillis());
    expect(millis).toEqual([1014, 1013, 1012, 1011, 1010, 1009, 1008, 1007, 1006, 1005]);
  });

  it('addRecentlyVisitedPOI sets new doc with first visit and server timestamp', async () => {
    setNowQueue([5000]);
    await mod.addRecentlyVisitedPOI({
      userId: 'u2',
      poiId: 'poi-1',
      name: 'A',
      centroid: { latitude: 1, longitude: 2 },
    });
    const snap = getStore().get(path('u2'));
    expect(snap.userId).toBe('u2');
    expect(snap.pois).toHaveLength(1);
    expect(snap.pois[0]).toMatchObject({
      poiId: 'poi-1',
      name: 'A',
      centroid: { latitude: 1, longitude: 2 },
    });
    expect(snap.pois[0].timestamp.toMillis()).toBe(5000);
  });

  it('addRecentlyVisitedPOI prevents duplicates', async () => {
    const u = 'u3';
    getStore().set(path(u), {
      userId: u,
      pois: [
        {
          userId: u,
          poiId: 'poi-1',
          name: 'A',
          centroid: { latitude: 0, longitude: 0 },
          timestamp: tsObj(1),
        },
      ],
    });
    await mod.addRecentlyVisitedPOI({
      userId: u,
      poiId: 'poi-1',
      name: 'A',
      centroid: { latitude: 0, longitude: 0 },
    });
    const snap = getStore().get(path(u));
    expect(snap.pois).toHaveLength(1);
    expect(logSpy).toHaveBeenCalled();
  });

  it('addRecentlyVisitedPOI updates existing doc with new visit', async () => {
    const u = 'u4';
    getStore().set(path(u), {
      userId: u,
      pois: [
        {
          userId: u,
          poiId: 'x',
          name: 'X',
          centroid: { latitude: 0, longitude: 0 },
          timestamp: tsObj(1),
        },
      ],
    });
    setNowQueue([9000]);
    await mod.addRecentlyVisitedPOI({
      userId: u,
      poiId: 'y',
      name: 'Y',
      centroid: { latitude: 3, longitude: 4 },
    });
    const snap = getStore().get(path(u));
    expect(snap.pois).toHaveLength(2);
    const added = snap.pois.find((p: any) => p.poiId === 'y');
    expect(added.timestamp.toMillis()).toBe(9000);
  });

  it('addRecentlyVisitedPOI propagates update error', async () => {
    const u = 'u5';
    getStore().set(path(u), { userId: u, pois: [] });
    const db = getDb();
    const origCollection = db.collection;

    // Create special clone for error test that also preserves timestamps
    const testClone = (v: any): any => {
      if (v == null) return v;
      if (typeof v === 'object' && v.toMillis && typeof v.toMillis === 'function') {
        return v;
      }
      if (Array.isArray(v)) {
        return v.map(testClone);
      }
      if (typeof v === 'object') {
        const result: any = {};
        for (const key in v) {
          result[key] = testClone(v[key]);
        }
        return result;
      }
      return v;
    };

    db.collection = (name: string) => ({
      doc: (id: string) => ({
        id,
        get: async () => {
          const data = getStore().get(`${name}/${id}`);
          const exists = !!data;
          return {
            exists: () => exists,
            data: () => testClone(data),
          };
        },
        update: async () => {
          throw new Error('boom');
        },
        set: async (data: any) => {
          getStore().set(`${name}/${id}`, testClone(data));
        },
      }),
    });

    await expect(
      mod.addRecentlyVisitedPOI({
        userId: u,
        poiId: 'z',
        name: 'Z',
        centroid: { latitude: 0, longitude: 0 },
      }),
    ).rejects.toThrow('boom');
    expect(errSpy).toHaveBeenCalled();

    // Restore original
    db.collection = origCollection;
  });

  it('getRecentlyVPOIs returns [] on get error and logs', async () => {
    const db = getDb();
    const origCollection = db.collection;

    db.collection = () => ({
      doc: () => ({
        get: async () => {
          throw new Error('x');
        },
      }),
    });
    const out = await mod.getRecentlyVPOIs('uX');
    expect(out).toEqual([]);
    expect(errSpy).toHaveBeenCalled();

    // Restore original
    db.collection = origCollection;
  });
});
