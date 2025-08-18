jest.mock('react-native', () => ({
  PermissionsAndroid: {
    request: jest.fn(),
    check: jest.fn(),
    PERMISSIONS: { CAMERA: 'android.permission.CAMERA' },
    RESULTS: { GRANTED: 'granted', DENIED: 'denied' },
  },
  Platform: { OS: 'android' },
  Alert: { alert: jest.fn() },
}));

describe('cameraPermissions', () => {
  let PermissionsAndroid: any;
  let Platform: any;
  let Alert: any;
  let requestCameraPermission: any;
  let hasCameraPermission: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    PermissionsAndroid = require('react-native').PermissionsAndroid;
    Platform = require('react-native').Platform;
    Alert = require('react-native').Alert;
    Platform.OS = 'android';
    // Use require instead of import for CommonJS
    const cameraPermissions = require('../src/utils/cameraPermissions');
    requestCameraPermission = cameraPermissions.requestCameraPermission;
    hasCameraPermission = cameraPermissions.hasCameraPermission;
  });

  it('returns true if camera permission is granted (Android)', async () => {
    PermissionsAndroid.request.mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED);
    const result = await requestCameraPermission();
    expect(result).toBe(true);
    expect(Alert.alert).not.toHaveBeenCalled();
  });

  it('shows alert and returns false if camera permission is denied (Android)', async () => {
    PermissionsAndroid.request.mockResolvedValue(PermissionsAndroid.RESULTS.DENIED);
    const result = await requestCameraPermission();
    expect(result).toBe(false);
    expect(Alert.alert).toHaveBeenCalledWith(
      'Camera Permission Required',
      expect.stringContaining('AR navigation requires camera access'),
      [{ text: 'OK' }],
    );
  });

  it('returns false if request throws error (Android)', async () => {
    PermissionsAndroid.request.mockRejectedValue(new Error('fail'));
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await requestCameraPermission();
    expect(result).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith('Camera permission error:', expect.any(Error));
    warnSpy.mockRestore();
  });

  it('returns true for iOS (requestCameraPermission)', async () => {
    Platform.OS = 'ios';
    const result = await requestCameraPermission();
    expect(result).toBe(true);
  });

  it('returns true if camera permission is checked and granted (Android)', async () => {
    PermissionsAndroid.check.mockResolvedValue(true);
    const result = await hasCameraPermission();
    expect(result).toBe(true);
  });

  it('returns false if camera permission is checked and denied (Android)', async () => {
    PermissionsAndroid.check.mockResolvedValue(false);
    const result = await hasCameraPermission();
    expect(result).toBe(false);
  });

  it('returns false if check throws error (Android)', async () => {
    PermissionsAndroid.check.mockRejectedValue(new Error('fail'));
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await hasCameraPermission();
    expect(result).toBe(false);
    expect(warnSpy).toHaveBeenCalledWith('Camera permission check error:', expect.any(Error));
    warnSpy.mockRestore();
  });

  it('returns true for iOS (hasCameraPermission)', async () => {
    Platform.OS = 'ios';
    const result = await hasCameraPermission();
    expect(result).toBe(true);
  });
});
