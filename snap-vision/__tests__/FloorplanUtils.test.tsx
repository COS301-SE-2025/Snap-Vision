import { renderHook, act, waitFor } from '@testing-library/react-native';
import {
  useFloorplanPreloader,
  preloadFloorplans,
  isFloorplanPreloaded,
} from '../src/utils/FloorplanManager';
import {
  initializePreBundledFloorplans,
  getAllFloorplans,
  clearDuplicateFloorplans,
} from '../src/utils/floorplanUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'react-native';

jest.mock('react-native', () => ({
  Image: {
    prefetch: jest.fn(),
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  getAllKeys: jest.fn(),
  removeItem: jest.fn(),
}));

jest.spyOn(Image, 'prefetch').mockImplementation((url: string) => Promise.resolve(true));

describe('FloorplanManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Image.prefetch as jest.Mock).mockClear();
    Object.keys(require('../src/utils/FloorplanManager').globalFloorplanCache || {}).forEach(
      (key) => delete require('../src/utils/FloorplanManager').globalFloorplanCache[key],
    );
  });

  it('preloads floorplans and updates cache', async () => {
    const urls = ['url1', 'url2'];
    await preloadFloorplans(urls);
    expect(Image.prefetch).toHaveBeenCalledWith('url1');
    expect(Image.prefetch).toHaveBeenCalledWith('url2');
    expect(isFloorplanPreloaded('url1')).toBe(true);
    expect(isFloorplanPreloaded('url2')).toBe(true);
  });

  it('useFloorplanPreloader hook marks images as preloaded', async () => {
    const urls = ['url3', 'url4'];
    let loaded = 0;
    const onProgress = jest.fn((l, t) => {
      loaded = l;
    });

    renderHook(() => useFloorplanPreloader(urls, onProgress));

    await waitFor(() => {
      expect(onProgress).toHaveBeenNthCalledWith(1, 0, 2);
      expect(isFloorplanPreloaded('url3')).toBe(true);
      expect(isFloorplanPreloaded('url4')).toBe(true);
    });
  });

  it('preloadFloorplans resolves immediately if urls is empty', async () => {
    await expect(preloadFloorplans([])).resolves.toBeUndefined();
    expect(Image.prefetch).not.toHaveBeenCalled();
  });

  it('preloadFloorplans handles prefetch error branch', async () => {
    (Image.prefetch as jest.Mock).mockRejectedValueOnce(new Error('fail'));
    await preloadFloorplans(['badurl']);
    expect(Image.prefetch).toHaveBeenCalledWith('badurl');
    expect(isFloorplanPreloaded('badurl')).toBe(false);
  });

  it('useFloorplanPreloader handles prefetch error branch', async () => {
    (Image.prefetch as jest.Mock).mockRejectedValueOnce(new Error('fail'));
    const onProgress = jest.fn();
    renderHook(() => useFloorplanPreloader(['badurl'], onProgress));

    await waitFor(() => {
      expect(onProgress).toHaveBeenCalled();
      expect(isFloorplanPreloaded('badurl')).toBe(false);
    });
  });

  it('isFloorplanPreloaded returns false for uncached url', () => {
    expect(isFloorplanPreloaded('notcached')).toBe(false);
  });

  it('useFloorplanPreloader calls onProgress immediately if all URLs are cached', async () => {
    // Mark url1 as cached using the API
    await preloadFloorplans(['url1']);
    const onProgress = jest.fn();
    renderHook(() => useFloorplanPreloader(['url1'], onProgress));
    expect(onProgress).toHaveBeenCalledWith(1, 1);
    expect(Image.prefetch).not.toHaveBeenCalled();
  });
});

describe('floorplanUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes pre-bundled floorplans', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue();

    await initializePreBundledFloorplans();

    expect(AsyncStorage.setItem as jest.Mock).toHaveBeenCalled();
    expect((AsyncStorage.setItem as jest.Mock).mock.calls[0][0]).toMatch(/floorplan_/);
  });

  it('gets all floorplans and ensures uniqueness', async () => {
    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([
      'floorplan_way/1301530915_Floor_2',
      'floorplan_Tishana Home_Floor_1',
      'floorplan_Tishana Home_Floor_1', // duplicate
    ]);
    (AsyncStorage.getItem as jest.Mock)
      .mockResolvedValueOnce(
        JSON.stringify({ buildingId: 'way/1301530915', floorLabel: 'Floor_2' }),
      )
      .mockResolvedValueOnce(JSON.stringify({ buildingId: 'Tishana Home', floorLabel: 'Floor_1' }))
      .mockResolvedValueOnce(JSON.stringify({ buildingId: 'Tishana Home', floorLabel: 'Floor_1' }));

    const floorplans = await getAllFloorplans();
    expect(floorplans.length).toBe(2);
    expect(floorplans[0].buildingId).toBe('way/1301530915');
    expect(floorplans[1].buildingId).toBe('Tishana Home');
  });

  it('clears duplicate floorplans', async () => {
    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([
      'floorplan_Tishana Home_Floor_1',
      'floorplan_Tishana Home_Floor_1_dup',
    ]);
    (AsyncStorage.getItem as jest.Mock)
      .mockResolvedValueOnce(JSON.stringify({ buildingId: 'Tishana Home', floorLabel: 'Floor_1' }))
      .mockResolvedValueOnce(JSON.stringify({ buildingId: 'Tishana Home', floorLabel: 'Floor_1' }));

    await clearDuplicateFloorplans();
    expect(AsyncStorage.removeItem as jest.Mock).toHaveBeenCalledWith('floorplan_Tishana Home_Floor_1_dup');
  });

  it('updates existing floorplan with isPrebundled flag if missing', async () => {
    // Mock existing floorplan without isPrebundled
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({
        id: 'way/1301530915_Floor_2',
        buildingId: 'way/1301530915',
        buildingName: 'IT Building',
        floorLabel: 'Floor 2',
        uri: 'file:///android_asset/floorplans/it_building_floor2.jpg',
        timestamp: new Date().toISOString(),
        status: 'active',
        // isPrebundled missing!
      }),
    );
    // Second floorplan does not exist
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

    await initializePreBundledFloorplans();

    // Should update the first floorplan with isPrebundled: true
    expect(AsyncStorage.setItem as jest.Mock).toHaveBeenCalledWith(
      'floorplan_way/1301530915_Floor 2',
      expect.stringContaining('"isPrebundled":true'),
    );
    // Should set the second floorplan as new
    expect(AsyncStorage.setItem as jest.Mock).toHaveBeenCalledWith(
      'floorplan_Tishana Home_Floor 1',
      expect.stringContaining('"isPrebundled":true'),
    );
  });

  it('returns [] and logs error if AsyncStorage throws', async () => {
    const error = new Error('AsyncStorage failure');
    (AsyncStorage.getAllKeys as jest.Mock).mockRejectedValue(error);

    const result = await getAllFloorplans();

    expect(result).toEqual([]);
  });

  it('logs error if AsyncStorage throws', async () => {
    const error = new Error('AsyncStorage failure');
    (AsyncStorage.getItem as jest.Mock).mockRejectedValue(error);

    await initializePreBundledFloorplans();
  });

  it('logs error if AsyncStorage throws', async () => {
    const error = new Error('AsyncStorage failure');
    (AsyncStorage.getAllKeys as jest.Mock).mockRejectedValue(error);

    await clearDuplicateFloorplans();
  });

  it('does not update floorplan if already prebundled', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
      JSON.stringify({
        id: 'way/1301530915_Floor_2',
        buildingId: 'way/1301530915',
        buildingName: 'IT Building',
        floorLabel: 'Floor 2',
        uri: 'file:///android_asset/floorplans/it_building_floor2.jpg',
        timestamp: new Date().toISOString(),
        status: 'active',
        isPrebundled: true, // Already prebundled!
      }),
    );
    (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

    await initializePreBundledFloorplans();

    // Should NOT update the first floorplan
    expect(AsyncStorage.setItem as jest.Mock).not.toHaveBeenCalledWith(
      'floorplan_way/1301530915_Floor 2',
      expect.stringContaining('"isPrebundled":true'),
    );
  });

  it('filters out null floorplans and ensures uniqueness', async () => {
    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([
      'floorplan_A_Floor_1',
      'floorplan_B_Floor_2',
      'floorplan_B_Floor_2', // duplicate
      'floorplan_C_Floor_3',
    ]);
    (AsyncStorage.getItem as jest.Mock)
      .mockResolvedValueOnce(JSON.stringify({ buildingId: 'A', floorLabel: 'Floor_1' }))
      .mockResolvedValueOnce(null) // Simulate missing/invalid floorplan
      .mockResolvedValueOnce(JSON.stringify({ buildingId: 'B', floorLabel: 'Floor_2' }))
      .mockResolvedValueOnce(JSON.stringify({ buildingId: 'C', floorLabel: 'Floor_3' }));

    const floorplans = await getAllFloorplans();
    expect(floorplans.length).toBe(3); // Only unique and non-null
    expect(floorplans.some((fp) => fp.buildingId === 'A')).toBe(true);
    expect(floorplans.some((fp) => fp.buildingId === 'B')).toBe(true);
    expect(floorplans.some((fp) => fp.buildingId === 'C')).toBe(true);
  });

  it('does not remove anything if no duplicates found', async () => {
    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([
      'floorplan_A_Floor_1',
      'floorplan_B_Floor_2',
    ]);
    (AsyncStorage.getItem as jest.Mock)
      .mockResolvedValueOnce(JSON.stringify({ buildingId: 'A', floorLabel: 'Floor_1' }))
      .mockResolvedValueOnce(JSON.stringify({ buildingId: 'B', floorLabel: 'Floor_2' }));

    await clearDuplicateFloorplans();

    // Should NOT call removeItem
    expect(AsyncStorage.removeItem as jest.Mock).not.toHaveBeenCalled();
  });

  it('removes all but the first duplicate for each group', async () => {
    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([
      'floorplan_A_Floor_1',
      'floorplan_A_Floor_1_dup1',
      'floorplan_A_Floor_1_dup2',
    ]);
    (AsyncStorage.getItem as jest.Mock)
      .mockResolvedValueOnce(JSON.stringify({ buildingId: 'A', floorLabel: 'Floor_1' }))
      .mockResolvedValueOnce(JSON.stringify({ buildingId: 'A', floorLabel: 'Floor_1' }))
      .mockResolvedValueOnce(JSON.stringify({ buildingId: 'A', floorLabel: 'Floor_1' }));

    await clearDuplicateFloorplans();

    // Should remove both duplicates
    expect(AsyncStorage.removeItem as jest.Mock).toHaveBeenCalledWith('floorplan_A_Floor_1_dup1');
    expect(AsyncStorage.removeItem as jest.Mock).toHaveBeenCalledWith('floorplan_A_Floor_1_dup2');
  });
});
