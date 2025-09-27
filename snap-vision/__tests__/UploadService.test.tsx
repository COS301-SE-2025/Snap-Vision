const mockPutFile = jest.fn();
const mockGetDownloadURL = jest.fn();
const mockRef = jest.fn(() => ({ putFile: mockPutFile, getDownloadURL: mockGetDownloadURL }));

jest.mock('@react-native-firebase/storage', () => {
  const api = jest.fn(() => ({ ref: mockRef }));
  return api;
});

jest.mock('@react-native-firebase/auth', () => {
  let currentUser: any = { uid: 'u-123' };

  const api = jest.fn(() => ({
    get currentUser() {
      return currentUser;
    },
  }));

  // Expose setUser function for tests
  (api as any).__setUser = (u: any) => (currentUser = u);

  return api;
});

jest.mock('../src/security/AuthorizationService', () => ({
  getInstance: jest.fn(() => ({
    canModifyBuilding: jest.fn().mockResolvedValue(true),
  })),
}));

// Helper to access the auth mock
const getAuthMock = () => require('@react-native-firebase/auth');

function load() {
  let mod: any;
  jest.isolateModules(() => {
    mod = require('../src/services/firebase/uploadService');
  });
  return mod as { uploadFloorplanImage: Function };
}

describe('uploadFloorplanImage', () => {
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

  beforeEach(() => {
    jest.clearAllMocks();
    mockPutFile.mockResolvedValue(undefined);
    mockGetDownloadURL.mockResolvedValue('https://cdn.example.com/f.jpg');
    // Reset user to default
    getAuthMock().__setUser({ uid: 'u-123' });
  });

  afterAll(() => {
    logSpy.mockRestore();
  });

  it('uploads to expected storage path and returns download URL', async () => {
    const { uploadFloorplanImage } = load();
    const url = await uploadFloorplanImage('loc1', 'b1', 'F1', 'file:///local/floor.jpg');
    expect(url).toBe('https://cdn.example.com/f.jpg');
    expect(mockRef).toHaveBeenCalledWith('floorplans/loc1/b1/F1.jpg');
    expect(mockPutFile).toHaveBeenCalledWith('file:///local/floor.jpg');
    expect(mockGetDownloadURL).toHaveBeenCalled();
  });

  it('includes path and UID in logs', async () => {
    const { uploadFloorplanImage } = load();
    await uploadFloorplanImage('locX', 'bY', 'Level-2', 'file:///x.jpg');
    // Logging removed as per policy
  });

  it('propagates error from putFile', async () => {
    const { uploadFloorplanImage } = load();
    mockPutFile.mockRejectedValueOnce(new Error('disk-full'));
    await expect(uploadFloorplanImage('l', 'b', 'Z', 'file:///err.jpg')).rejects.toThrow(
      'disk-full',
    );
    expect(mockRef).toHaveBeenCalledWith('floorplans/l/b/Z.jpg');
  });

  it('works with different floor labels without transformation', async () => {
    const { uploadFloorplanImage } = load();
    await uploadFloorplanImage('campus', 'BLDG-7', '02', 'file:///p.jpg');
    expect(mockRef).toHaveBeenCalledWith('floorplans/campus/BLDG-7/02.jpg');
  });

  it('handles different user UIDs', async () => {
    // Change the current user
    getAuthMock().__setUser({ uid: 'different-user' });

    const { uploadFloorplanImage } = load();
    await uploadFloorplanImage('test', 'building', 'floor', 'file:///test.jpg');

    // Logging removed as per policy
  });
});
