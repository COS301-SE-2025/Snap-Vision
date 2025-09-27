const mockAuthService = {
  getCurrentUserContext: jest.fn(),
  canModifyLocation: jest.fn(),
  canAccessLocation: jest.fn(),
  canAccessBuilding: jest.fn(),
  canAccessQRCode: jest.fn(),
  canModifyQRCode: jest.fn(),
};

jest.mock('../../src/security/AuthorizationService', () => ({
  default: class {
    static getInstance() {
      return mockAuthService;
    }
  },
}));

import AuthorizationService from '../../src/security/AuthorizationService';

import {
  createQRCodeMapping,
  getQRCodeMappingByValue,
  getLocations,
  getBuildingsForLocation,
  getFloorsForBuilding,
  getRoomsForFloor,
  getQRCodesForBuilding,
  deleteQRCodeMapping,
  updateQRCodeMapping,
} from '../../src/services/qrService';

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

jest.mock('@react-native-firebase/auth', () => {
  let currentUser: any = { uid: 'u-int' };
  const api = () => ({
    get currentUser() {
      return currentUser;
    },
  });
  (api as any).__setUser = (u: any) => (currentUser = u);
  return api;
});
const setAuthUser = (auth as any).__setUser as (u: any) => void;

jest.mock('@react-native-firebase/firestore', () => {
  const store: Map<string, Map<string, Record<string, any>>> = new Map();

  const ensurePath = (path: string): Map<string, Record<string, any>> => {
    if (!store.has(path)) store.set(path, new Map());
    return store.get(path)!;
  };

  const clone = (v: any) => JSON.parse(JSON.stringify(v));

  const makeDocRef = (path: string, id: string) => ({
    id,
    set: async (data: any) => {
      const coll = ensurePath(path);
      coll.set(id, clone(data));
    },
    update: async (patch: any) => {
      const coll = ensurePath(path);
      const cur = coll.get(id) || {};
      coll.set(id, { ...cur, ...clone(patch) });
    },
    delete: async () => {
      const coll = ensurePath(path);
      coll.delete(id);
    },
    collection: (sub: string) => makeCollection(`${path}/${id}/${sub}`),
    get: async () => {
      const coll = ensurePath(path);
      const data = coll.get(id);
      return { exists: !!data, id, data: () => clone(data) };
    },
  });

  const makeQuery = (basePath: string, filters: any[] = [], _order?: any, _limit?: number) => ({
    where: (field: string, op: string, val: any) => makeQuery(basePath, [...filters, { field, op, val }], _order, _limit),
    orderBy: (field: string, dir: 'asc' | 'desc' = 'asc') => {
      return makeQuery(basePath, filters, { field, dir }, _limit);
    },
    limit: (n: number) => makeQuery(basePath, filters, _order, n),
    get: async () => {
      const coll = ensurePath(basePath);
      let rows = Array.from(coll.entries()).map(([id, data]) => ({ id, data: () => clone(data) }));
      for (const f of filters) {
        rows = rows.filter((r) => {
          const v = (r.data() as any)[f.field];
          return f.op === '==' ? String(v) === String(f.val) : false;
        });
      }
      if (_order) {
        rows.sort((a, b) => {
          const va: any = (a.data() as any)[_order.field];
          const vb: any = (b.data() as any)[_order.field];
          if (va === undefined && vb === undefined) return 0;
          if (va === undefined) return 1;
          if (vb === undefined) return -1;
          let valA = va;
          let valB = vb;
          if (va && typeof va === 'object' && 'seconds' in va) {
            valA = va.seconds;
          }
          if (vb && typeof vb === 'object' && 'seconds' in vb) {
            valB = vb.seconds;
          }
          if (valA < valB) return _order.dir === 'asc' ? -1 : 1;
          if (valA > valB) return _order.dir === 'asc' ? 1 : -1;
          return 0;
        });
      }
      if (_limit != null) rows = rows.slice(0, _limit);
      return { docs: rows, empty: rows.length === 0 };
    },
  });

  const makeCollection = (path: string) => ({
    doc: (id?: string) => makeDocRef(path, id ?? `gen_${Math.random().toString(36).slice(2, 8)}`),
    add: async (data: any) => {
      const id = `gen_${Math.random().toString(36).slice(2, 8)}`;
      await makeDocRef(path, id).set(data);
      return { id };
    },
    collection: (sub: string) => makeCollection(`${path}/${sub}`),
    get: async () => {
      const coll = ensurePath(path);
      const rows = Array.from(coll.entries()).map(([id, data]) => ({
        id,
        data: () => clone(data),
      }));
      return { docs: rows, empty: rows.length === 0 };
    },
    where: (field: string, op: string, val: any) => makeQuery(path, [{ field, op, val }]),
    orderBy: (field: string, dir: 'asc' | 'desc' = 'asc') => makeQuery(path, [], { field, dir }),
  });

  const root = () => ({
    collection: (name: string) => makeCollection(name),
  });

  const fn: any = () => root();
  fn.Timestamp = { now: jest.fn(() => ({ seconds: Math.floor(Date.now() / 1000) })) };
  fn.__reset = () => store.clear();
  fn.__seed = (path: string, id: string, data: any) => {
    const coll = ensurePath(path);
    coll.set(id, clone(data));
  };
  return fn;
});

const fns = firestore as any;

describe('QRService integration tests', () => {
  beforeEach(() => {
    mockAuthService.getCurrentUserContext.mockResolvedValue({ userId: 'u-int' });
    mockAuthService.canModifyLocation.mockResolvedValue(true);
    mockAuthService.canAccessLocation.mockResolvedValue(true);
    mockAuthService.canAccessBuilding.mockResolvedValue(true);
    mockAuthService.canAccessQRCode.mockResolvedValue(true);
    mockAuthService.canModifyQRCode.mockResolvedValue(true);
  });
  it('queries rooms for a floor', async () => {
    fns.__seed('locations/LOC1/roomPOIs', 'R3', { buildingId: 'B1', floorLabel: 'F1' });

    const rooms = await getRoomsForFloor('LOC1', 'B1', 'F2');
    expect(rooms.map((r) => r.id)).toEqual(['R1', 'R2']);
    expect(rooms[0]).toMatchObject({
      id: 'R1',
      name: 'One',
      buildingId: 'B1',
      buildingName: 'B1n',
      floorId: 'F2',
      floorLabel: 'F2',
    });
    expect(rooms[1]).toMatchObject({
      id: 'R2',
      name: 'Two',
      buildingId: 'B1',
      floorId: 'F2',
      floorLabel: 'F2',
    });
  });

  it('queries QR codes for a building ordered by createdAt desc', async () => {
    const t = (s: number) => ({ seconds: s });
    fns.__seed('locations/LOC1/qrCodes', 'q1', {
      buildingId: 'B1',
      createdAt: t(100),
      qrValue: 'A',
    });
    fns.__seed('locations/LOC1/qrCodes', 'q2', {
      buildingId: 'B1',
      createdAt: t(200),
      qrValue: 'B',
    });
    fns.__seed('locations/LOC1/qrCodes', 'q3', {
      buildingId: 'B2',
      createdAt: t(300),
      qrValue: 'C',
    });

    const rows = await getQRCodesForBuilding('LOC1', 'B1');
    expect(rows.map((r) => r.qrValue)).toEqual(['B', 'A']); // desc by createdAt
  });

  it('update and delete mapping', async () => {
    // create then update & delete
    const created = await createQRCodeMapping(
      'LOC2',
      'Campus 2',
      'B1',
      'B1Name',
      'F1',
      'R1',
      'R Name',
      'VAL-1',
    );

    await expect(updateQRCodeMapping('LOC2', created.id, { description: 'updated' })).resolves.toBe(
      true,
    );
    const all = await getQRCodesForBuilding('LOC2', 'B1');
    expect(all[0].description).toBe('updated');

    await expect(deleteQRCodeMapping('LOC2', created.id)).resolves.toBe(true);
    const afterDel = await getQRCodesForBuilding('LOC2', 'B1');
    expect(afterDel).toHaveLength(0);
  });

  it('create throws if unauthenticated', async () => {
    setAuthUser(null);
    mockAuthService.getCurrentUserContext.mockResolvedValue(null);
    await expect(createQRCodeMapping('L', 'LN', 'B', 'BN', 'F', 'R', 'RN', 'Q')).rejects.toThrow(
      'User not authenticated',
    );
  });

  it('handles missing locations gracefully', async () => {
    const locs = await getLocations();
    expect(locs).toEqual([]);
  });

  it('handles missing buildings gracefully', async () => {
    const buildings = await getBuildingsForLocation('nonexistent');
    expect(buildings).toEqual([]);
  });

  it('handles missing floors gracefully', async () => {
    const floors = await getFloorsForBuilding('LOC1', 'nonexistent');
    expect(floors).toEqual([]);
  });

  it('handles missing rooms gracefully', async () => {
    const rooms = await getRoomsForFloor('LOC1', 'B1', 'nonexistent');
    expect(rooms).toEqual([]);
  });

  it('handles missing QR codes gracefully', async () => {
    const qrCodes = await getQRCodesForBuilding('LOC1', 'nonexistent');
    expect(qrCodes).toEqual([]);
  });

  it('returns null when QR mapping not found', async () => {
    const mapping = await getQRCodeMappingByValue('nonexistent');
    expect(mapping).toBeNull();
  });

  it('handles update of nonexistent QR code', async () => {
    const result = await updateQRCodeMapping('LOC1', 'nonexistent', { description: 'test' });
    expect(result).toBe(true); // Firestore update doesn't fail on missing docs
  });

  it('handles delete of nonexistent QR code', async () => {
    const result = await deleteQRCodeMapping('LOC1', 'nonexistent');
    expect(result).toBe(true); // Firestore delete doesn't fail on missing docs
  });
});
