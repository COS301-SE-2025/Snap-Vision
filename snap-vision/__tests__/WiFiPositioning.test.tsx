import {
  collectWiFiFingerprint,
  deleteWiFiFingerprint,
} from '../src/services/WiFiPositioningService';
import WifiManager from 'react-native-wifi-reborn';
import firestore from '@react-native-firebase/firestore';

//Stable timestamp for assertions
const NOW = 1_725_000_000_000; // any fixed value
const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(NOW);

//Jest mocks
jest.mock('react-native-wifi-reborn', () => ({
  reScanAndLoadWifiList: jest.fn(),
}));

type DocStub = { data: () => any; ref: any };
const makeSnapshot = (docs: DocStub[]) => ({ docs });

const batchDelete = jest.fn();
const batchCommit = jest.fn();

const collectionMock = jest.fn();
const whereMock1 = jest.fn();
const whereMock2 = jest.fn();
const getMock = jest.fn();
const addMock = jest.fn();

const firestoreMock = () =>
  ({
    collection: collectionMock,
    batch: () => ({ delete: batchDelete, commit: batchCommit }),
  }) as any;

jest.mock('@react-native-firebase/firestore', () => {
  const fn = jest.fn(() => firestoreMock());
  // attach FieldPath etc. if you need; not needed here
  return fn;
});

const resetFirestoreChain = () => {
  collectionMock.mockReset();
  whereMock1.mockReset();
  whereMock2.mockReset();
  getMock.mockReset();
  addMock.mockReset();
  batchDelete.mockReset();
  batchCommit.mockReset();

  // collection('path') → { add, where }
  collectionMock.mockImplementation((path: string) => ({
    add: addMock,
    where: whereMock1,
  }));

  // where('buildingId', '==', val) → { where: whereMock2, get }
  whereMock1.mockImplementation(() => ({
    where: whereMock2,
    get: getMock,
  }));

  // where('floorId', '==', val) → { get }
  whereMock2.mockImplementation(() => ({
    get: getMock,
  }));
};

beforeEach(() => {
  jest.clearAllMocks();
  resetFirestoreChain();
});

afterAll(() => {
  nowSpy.mockRestore();
});

describe('collectWiFiFingerprint (unit)', () => {
  const fingerprint = {
    locationId: 'loc-1',
    buildingId: 'bldg-1',
    floorId: 'f1',
    coordinates: { x: 0.12, y: 0.34 },
    description: 'near elevator',
    type: 'reference',
    buildingName: 'HQ',
  };

  it('scans Wi-Fi, maps results, and writes to Firestore', async () => {
    (WifiManager.reScanAndLoadWifiList as jest.Mock).mockResolvedValue([
      { SSID: 'A', BSSID: 'aa:bb', level: -45, frequency: 5200, extra: 'ignored' },
      { SSID: 'B', BSSID: 'cc:dd', level: -70, frequency: 2412 },
    ]);
    addMock.mockResolvedValue({});

    await collectWiFiFingerprint(fingerprint);

    // Correct collection path
    expect(collectionMock).toHaveBeenCalledWith('locations/loc-1/wifiFingerprints');

    // Added payload structure
    expect(addMock).toHaveBeenCalledTimes(1);
    const payload = addMock.mock.calls[0][0];
    expect(payload.timestamp).toBe(NOW);
    expect(payload.locationId).toBe('loc-1');
    expect(payload.buildingId).toBe('bldg-1');
    expect(payload.floorId).toBe('f1');
    expect(payload.coordinates).toEqual({ x: 0.12, y: 0.34 });
    expect(payload.description).toBe('near elevator');
    expect(payload.type).toBe('reference');
    expect(payload.buildingName).toBe('HQ');
    expect(payload.wifiSignals).toEqual([
      { SSID: 'A', BSSID: 'aa:bb', level: -45, frequency: 5200 },
      { SSID: 'B', BSSID: 'cc:dd', level: -70, frequency: 2412 },
    ]);
  });

  it('throws a user-friendly error if Wi-Fi scan fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (WifiManager.reScanAndLoadWifiList as jest.Mock).mockRejectedValue(new Error('no-permission'));

    await expect(collectWiFiFingerprint(fingerprint)).rejects.toThrow(
      'Failed to save WiFi fingerprint to database',
    );

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('throws a user-friendly error if Firestore add fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    (WifiManager.reScanAndLoadWifiList as jest.Mock).mockResolvedValue([]);
    addMock.mockRejectedValue(new Error('firestore-down'));

    await expect(collectWiFiFingerprint(fingerprint)).rejects.toThrow(
      'Failed to save WiFi fingerprint to database',
    );

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('deleteWiFiFingerprint (unit)', () => {
  it('queries by buildingId & floorId, filters by epsilon, deletes matches, commits batch', async () => {
    const coords = { x: 10.0004, y: 5.0002 }; // within epsilon 0.001
    const targetData = {
      buildingId: 'B',
      floorId: 'F',
      coordinates: { x: 10.0009, y: 5.0008 },
    };
    const nonMatchData = {
      buildingId: 'B',
      floorId: 'F',
      coordinates: { x: 11.1, y: 9.9 },
    };

    const doc1 = { data: () => targetData, ref: { id: '1' } };
    const doc2 = { data: () => nonMatchData, ref: { id: '2' } };
    getMock.mockResolvedValue(makeSnapshot([doc1 as any, doc2 as any]));

    await deleteWiFiFingerprint({
      locationId: 'loc-99',
      buildingId: 'B',
      floorId: 'F',
      coordinates: coords,
    });

    // path and where clauses
    expect(collectionMock).toHaveBeenCalledWith('locations/loc-99/wifiFingerprints');
    expect(whereMock1).toHaveBeenCalledWith('buildingId', '==', 'B');
    expect(whereMock2).toHaveBeenCalledWith('floorId', '==', 'F');

    // delete only the doc within epsilon
    expect(batchDelete).toHaveBeenCalledTimes(1);
    expect(batchDelete.mock.calls[0][0]).toEqual(doc1.ref);
    expect(batchCommit).toHaveBeenCalledTimes(1);
  });

  it('commits empty batch when no docs match epsilon', async () => {
    const farDoc = {
      data: () => ({ buildingId: 'B', floorId: 'F', coordinates: { x: 0, y: 0 } }),
      ref: { id: 'x' },
    };
    getMock.mockResolvedValue(makeSnapshot([farDoc as any]));

    await deleteWiFiFingerprint({
      locationId: 'loc-1',
      buildingId: 'B',
      floorId: 'F',
      coordinates: { x: 100, y: 100 },
    });

    expect(batchDelete).not.toHaveBeenCalled();
    expect(batchCommit).toHaveBeenCalledTimes(1); // still commits (empty batch)
  });

  it('throws a user-friendly error if Firestore query/delete fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    getMock.mockRejectedValue(new Error('perm-denied'));

    await expect(
      deleteWiFiFingerprint({
        locationId: 'loc-err',
        buildingId: 'B',
        floorId: 'F',
        coordinates: { x: 1, y: 1 },
      }),
    ).rejects.toThrow('Failed to delete WiFi fingerprint from database');

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
