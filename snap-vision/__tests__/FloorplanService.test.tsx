const mockCollStore: Map<string, Array<{ id: string; data: any }>> = new Map();
const mockDocStore: Map<string, any> = new Map();
const clone = (v: any) => (v == null ? v : JSON.parse(JSON.stringify(v)));

const mockServerTs = { __server: 'ts' };

const mockFirestore = {
  collection: (path: string) => ({
    get: async () => {
      const rows = mockCollStore.get(path) || [];
      return {
        docs: rows.map((r) => ({ id: r.id, data: () => clone(r.data) })),
      };
    },
    doc: (id: string) => ({
      id,
      get: async () => {
        const data = mockDocStore.get(`${path}/${id}`);
        return { exists: !!data, data: () => clone(data) };
      },
      set: async (data: any) => {
        mockDocStore.set(`${path}/${id}`, clone(data));
      },
      update: async (patch: any) => {
        const cur = mockDocStore.get(`${path}/${id}`) || {};
        mockDocStore.set(`${path}/${id}`, { ...clone(cur), ...clone(patch) });
      },
    }),
  }),
  doc: (fullPath: string) => ({
    get: async () => {
      const data = mockDocStore.get(fullPath);
      return { exists: !!data, data: () => clone(data) };
    },
    set: async (data: any) => {
      mockDocStore.set(fullPath, clone(data));
    },
    update: async (patch: any) => {
      const cur = mockDocStore.get(fullPath) || {};
      mockDocStore.set(fullPath, { ...clone(cur), ...clone(patch) });
    },
  }),
};

jest.mock('@react-native-firebase/firestore', () => {
  const fn: any = () => mockFirestore;
  fn.FieldValue = { serverTimestamp: jest.fn(() => mockServerTs) };
  return fn;
});

jest.mock('@react-native-firebase/auth', () => {
  let currentUser: any = { uid: 'user-1' };

  const api: any = () => ({
    get currentUser() {
      return currentUser;
    },
  });
  api.__setUser = (u: any) => (currentUser = u);
  return api;
});

function load() {
  let mod: any;
  jest.isolateModules(() => {
    mod = require('../src/services/firebase/floorplanService');
  });
  return mod as {
    fetchBuildings: Function;
    fetchUserInfo: Function;
    fetchLocations: Function;
    saveFloorplanMetadata: Function;
  };
}

const setAuthUser = (require('@react-native-firebase/auth') as any).__setUser as (u: any) => void;

describe('floorplan firestore services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCollStore.clear();
    mockDocStore.clear();
    setAuthUser({ uid: 'user-1' });
  });

  it('fetchBuildings maps docs with defaults', async () => {
    mockCollStore.set('locations/locA/buildingPOIs', [
      { id: 'b1', data: { name: 'Block A', centroid: { lat: 1, lng: 2 }, floors: 3 } },
      { id: 'b2', data: { centroid: { lat: 0, lng: 0 } } },
    ]);
    const { fetchBuildings } = load();
    const rows = await fetchBuildings('locA');
    expect(rows).toEqual([
      { id: 'b1', name: 'Block A', centroid: { lat: 1, lng: 2 }, floors: 3 },
      { id: 'b2', name: 'Unnamed Building', centroid: { lat: 0, lng: 0 }, floors: 1 },
    ]);
  });

  it('fetchUserInfo returns null when no auth user', async () => {
    setAuthUser(null);
    const { fetchUserInfo } = load();
    const info = await fetchUserInfo();
    expect(info).toBeNull();
  });

  it('fetchUserInfo returns role and adminLocations (default [])', async () => {
    setAuthUser({ uid: 'u-x' });
    mockDocStore.set('userInformation/u-x', { role: 'admin', adminLocations: ['loc1', 'loc2'] });
    const { fetchUserInfo } = load();
    const info = await fetchUserInfo();
    expect(info).toEqual({ role: 'admin', adminLocations: ['loc1', 'loc2'] });

    setAuthUser({ uid: 'u-y' });
    mockDocStore.set('userInformation/u-y', { role: 'viewer' });
    const info2 = await fetchUserInfo();
    expect(info2).toEqual({ role: 'viewer', adminLocations: [] });
  });

  it('fetchLocations returns id and name from collection', async () => {
    mockCollStore.set('locations', [
      { id: 'L1', data: { name: 'Campus 1' } },
      { id: 'L2', data: { name: 'Campus 2' } },
    ]);
    const { fetchLocations } = load();
    const rows = await fetchLocations();
    expect(rows).toEqual([
      { id: 'L1', name: 'Campus 1' },
      { id: 'L2', name: 'Campus 2' },
    ]);
  });
});
