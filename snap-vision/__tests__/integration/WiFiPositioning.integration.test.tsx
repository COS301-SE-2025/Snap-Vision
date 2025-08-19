import {
  collectWiFiFingerprint,
  deleteWiFiFingerprint,
} from '../../src/services/WiFiPositioningService';
import WifiManager from 'react-native-wifi-reborn';
import firestore from '@react-native-firebase/firestore';

const NOW = 1_725_000_111_111;
jest.spyOn(Date, 'now').mockReturnValue(NOW);

type DocStub = { data: () => any; ref: any };
const makeSnapshot = (docs: DocStub[]) => ({ docs });

const mockBatches: any[] = [];
const mockMkBatch = () => {
  const ops: any[] = [];
  mockBatches.push(ops);
  return {
    delete: (ref: any) => ops.push({ op: 'delete', ref }),
    commit: jest.fn().mockResolvedValue(undefined),
  };
};

const mockAdd = jest.fn();
const mockCollection = jest.fn((path: string) => ({
  add: mockAdd,
  // default where-chain; individual tests will override with mockImplementation
  where: (field: string, op: string, val: any) => ({
    where: (field2: string, op2: string, val2: any) => ({
      get: jest.fn(),
    }),
    get: jest.fn(),
  }),
}));

//Mocks
jest.mock('react-native-wifi-reborn', () => ({
  reScanAndLoadWifiList: jest.fn(),
}));

jest.mock('@react-native-firebase/firestore', () => {
  const api = jest.fn(() => ({
    collection: mockCollection,
    batch: mockMkBatch,
  }));
  return api;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockBatches.length = 0;
});

describe('collectWiFiFingerprint (integration)', () => {
  it('writes expected envelope to Firestore when Wi-Fi scan returns multiple entries', async () => {
    (WifiManager.reScanAndLoadWifiList as jest.Mock).mockResolvedValue([
      { SSID: 'CafeNet', BSSID: '11:22', level: -50, frequency: 2412, other: 'x' },
      { SSID: 'Office', BSSID: '33:44', level: -65, frequency: 5200 },
    ]);

    const fingerprint = {
      locationId: 'L1',
      buildingId: 'B1',
      floorId: 'F1',
      coordinates: { x: 7.77, y: 3.21 },
      description: 'Lobby couch',
      type: 'anchor',
    };

    mockAdd.mockResolvedValue({ id: 'doc-1' });

    await collectWiFiFingerprint(fingerprint);

    expect(mockCollection).toHaveBeenCalledWith('locations/L1/wifiFingerprints');

    const payload = mockAdd.mock.calls[0][0];
    expect(payload.timestamp).toBe(NOW);
    expect(payload).toMatchObject({
      ...fingerprint,
      wifiSignals: [
        { SSID: 'CafeNet', BSSID: '11:22', level: -50, frequency: 2412 },
        { SSID: 'Office', BSSID: '33:44', level: -65, frequency: 5200 },
      ],
    });
  });
});

describe('deleteWiFiFingerprint (integration)', () => {
  it('deletes only documents within epsilon and commits', async () => {
    const f = firestore() as any;

    const where2Get = jest.fn();
    // Override the collection implementation for this test to return a real where-chain
    (f.collection as jest.Mock).mockImplementation((path: string) => ({
      where: (field: string, op: string, val: any) => ({
        where: (field2: string, op2: string, val2: any) => ({
          get: where2Get,
        }),
        get: where2Get,
      }),
    }));

    const closeDoc = {
      data: () => ({
        buildingId: 'B2',
        floorId: 'F2',
        coordinates: { x: 100.0006, y: 200.0009 }, // within epsilon 0.001
      }),
      ref: { id: 'close' },
    };
    const farDoc = {
      data: () => ({
        buildingId: 'B2',
        floorId: 'F2',
        coordinates: { x: 100.01, y: 200.02 }, // outside epsilon
      }),
      ref: { id: 'far' },
    };

    where2Get.mockResolvedValue(makeSnapshot([closeDoc as any, farDoc as any]));

    await deleteWiFiFingerprint({
      locationId: 'L2',
      buildingId: 'B2',
      floorId: 'F2',
      coordinates: { x: 100, y: 200 },
    });

    // A single batch created with one delete op for the "close" doc
    expect(mockBatches.length).toBe(1);
    expect(mockBatches[0]).toHaveLength(1);
    expect(mockBatches[0][0]).toEqual({ op: 'delete', ref: closeDoc.ref });
  });

  it('commits even if no document matches', async () => {
    const f = firestore() as any;

    const where2Get = jest.fn().mockResolvedValue(makeSnapshot([]));
    (f.collection as jest.Mock).mockImplementation((path: string) => ({
      where: () => ({ where: () => ({ get: where2Get }), get: where2Get }),
    }));

    await deleteWiFiFingerprint({
      locationId: 'L3',
      buildingId: 'BX',
      floorId: 'FX',
      coordinates: { x: 0, y: 0 },
    });

    expect(mockBatches.length).toBe(1);
    expect(mockBatches[0]).toHaveLength(0); // no deletes
  });

  it('bubbles a user-friendly error on Firestore failure', async () => {
    const f = firestore() as any;

    const where2Get = jest.fn().mockRejectedValue(new Error('firestore-down'));
    (f.collection as jest.Mock).mockImplementation((path: string) => ({
      where: () => ({ where: () => ({ get: where2Get }), get: where2Get }),
    }));

    await expect(
      deleteWiFiFingerprint({
        locationId: 'L4',
        buildingId: 'B4',
        floorId: 'F4',
        coordinates: { x: 1, y: 2 },
      }),
    ).rejects.toThrow('Failed to delete WiFi fingerprint from database');
  });
});
