import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useQRCodeAdmin } from '../src/hooks/useQRCodeAdmin';
import * as qrService from '../src/services/qrService';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

// Mock Firebase modules
jest.mock('@react-native-firebase/firestore', () => {
  const mockGet = jest.fn();
  const mockDoc = jest.fn(() => ({ get: mockGet }));
  const mockFirestore = jest.fn(() => ({ doc: mockDoc }));
  return mockFirestore;
});

jest.mock('@react-native-firebase/auth', () => {
  let uid = 'test-uid';
  return jest.fn(() => ({
    get currentUser() {
      return uid ? { uid } : null;
    },
    __setUid: (newUid: string | null) => { uid = newUid; },
  }));
});

// Mock QR Service
jest.mock('../src/services/qrService', () => ({
  getLocations: jest.fn(),
  getBuildingsForLocation: jest.fn(),
  getFloorsForBuilding: jest.fn(),
  getRoomsForFloor: jest.fn(),
  getQRCodesForBuilding: jest.fn(),
  createQRCodeMapping: jest.fn(),
  deleteQRCodeMapping: jest.fn(),
}));

// Mock react-native-qrcode-svg
jest.mock('react-native-qrcode-svg', () => {
  return jest.fn();
});

describe('useQRCodeAdmin', () => {
  const mockLocations = [
    { id: 'loc1', name: 'Location 1' },
    { id: 'loc2', name: 'Location 2' },
  ];

  const mockBuildings = [
    { id: 'bld1', name: 'Building 1' },
    { id: 'bld2', name: 'Building 2' },
  ];

  const mockFloors = [
    { id: 'flr1', name: 'Floor 1' },
    { id: 'flr2', name: 'Floor 2' },
  ];

  const mockRooms = [
    {
      id: 'rm1',
      name: 'Room 101',
      floorId: 'flr1',
      buildingId: 'bld1',
      buildingName: 'Building 1',
    },
    {
      id: 'rm2',
      name: 'Room 102',
      floorId: 'flr1',
      buildingId: 'bld1',
      buildingName: 'Building 1',
    },
  ];

  const mockQRCodes = [
    {
      id: 'qr1',
      roomId: 'rm1',
      roomName: 'Room 101',
      buildingId: 'bld1',
      buildingName: 'Building 1',
      floorId: 'flr1',
      qrValue: 'qr:loc1:bld1:flr1:rm1:abc123',
      description: 'Test QR',
    },
  ];

  const mockUserData = {
    role: 'admin',
    adminLocations: ['loc1', 'loc2'],
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup Firebase mocks
    const mockFirestore = firestore as jest.MockedFunction<typeof firestore>;
    const mockDoc = jest.fn(() => ({
      get: jest.fn().mockResolvedValue({
        data: () => mockUserData,
      }),
    }));
    mockFirestore.mockReturnValue({
      doc: mockDoc,
    } as any);

    // Setup service mocks
    (qrService.getLocations as jest.Mock).mockResolvedValue(mockLocations);
    (qrService.getBuildingsForLocation as jest.Mock).mockResolvedValue(mockBuildings);
    (qrService.getFloorsForBuilding as jest.Mock).mockResolvedValue(mockFloors);
    (qrService.getRoomsForFloor as jest.Mock).mockResolvedValue(mockRooms);
    (qrService.getQRCodesForBuilding as jest.Mock).mockResolvedValue(mockQRCodes);
    (qrService.createQRCodeMapping as jest.Mock).mockResolvedValue(undefined);
    (qrService.deleteQRCodeMapping as jest.Mock).mockResolvedValue(true);
  });

  describe('Initial State', () => {
    it('should initialize with correct default values', () => {
      const { result } = renderHook(() => useQRCodeAdmin());

      expect(result.current.locations).toEqual([]);
      expect(result.current.buildings).toEqual([]);
      expect(result.current.floors).toEqual([]);
      expect(result.current.rooms).toEqual([]);
      expect(result.current.qrCodes).toEqual([]);
      expect(result.current.selectedLocationId).toBeNull();
      expect(result.current.selectedBuildingId).toBeNull();
      expect(result.current.selectedFloorId).toBeNull();
      expect(result.current.selectedRoom).toBeNull();
      expect(result.current.qrDescription).toBe('');
      expect(result.current.qrValue).toBe('');
      expect(result.current.searchQuery).toBe('');
      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBeNull();
      expect(result.current.isAddModalVisible).toBe(false);
      expect(result.current.isGenerateModalVisible).toBe(false);
    });
  });

  describe('RBAC and Initial Loading', () => {
    it('should load user info and locations for admin user', async () => {
      const { result } = renderHook(() => useQRCodeAdmin());

      await waitFor(() => {
        expect(result.current.role).toBe('admin');
        expect(result.current.adminLocations).toEqual(['loc1', 'loc2']);
        expect(result.current.locations).toEqual(mockLocations);
        expect(result.current.isLoading).toBe(false);
      });

      expect(qrService.getLocations).toHaveBeenCalled();
    });

    it('should filter locations for editor user', async () => {
      const editorUserData = {
        role: 'editor',
        adminLocations: ['loc1'],
      };

      const mockFirestore = firestore as jest.MockedFunction<typeof firestore>;
      const mockDoc = jest.fn(() => ({
        get: jest.fn().mockResolvedValue({
          data: () => editorUserData,
        }),
      }));
      mockFirestore.mockReturnValue({
        doc: mockDoc,
      } as any);

      const { result } = renderHook(() => useQRCodeAdmin());

      await waitFor(() => {
        expect(result.current.role).toBe('editor');
        expect(result.current.locations).toEqual([mockLocations[0]]);
      });
    });

    it('should handle user info loading error', async () => {
      const mockFirestore = firestore as jest.MockedFunction<typeof firestore>;
      const mockDoc = jest.fn(() => ({
        get: jest.fn().mockRejectedValue(new Error('Firebase error')),
      }));
      mockFirestore.mockReturnValue({
        doc: mockDoc,
      } as any);

      const { result } = renderHook(() => useQRCodeAdmin());

      await waitFor(() => {
        expect(result.current.role).toBe('user');
        expect(result.current.adminLocations).toEqual([]);
      });
    });

    it('should handle locations loading error', async () => {
      (qrService.getLocations as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useQRCodeAdmin());

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to load locations');
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Location Selection', () => {
    it('should load buildings when location is selected', async () => {
      const { result } = renderHook(() => useQRCodeAdmin());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.handleLocationSelect('loc1');
      });

      expect(result.current.selectedLocationId).toBe('loc1');

      await waitFor(() => {
        expect(result.current.buildings).toEqual(mockBuildings);
      });

      expect(qrService.getBuildingsForLocation).toHaveBeenCalledWith('loc1');
    });

    it('should handle buildings loading error', async () => {
      (qrService.getBuildingsForLocation as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useQRCodeAdmin());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.handleLocationSelect('loc1');
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to load buildings');
      });
    });

    it('should clear downstream selections when location changes', async () => {
      const { result } = renderHook(() => useQRCodeAdmin());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Set some downstream selections
      act(() => {
        result.current.setSelectedBuildingId('bld1');
        result.current.setSelectedFloorId('flr1');
      });

      // Change location
      act(() => {
        result.current.handleLocationSelect('loc2');
      });

      expect(result.current.selectedBuildingId).toBeNull();
      expect(result.current.selectedFloorId).toBeNull();
    });
  });

  describe('Building Selection', () => {
    it('should load floors and QR codes when building is selected', async () => {
      const { result } = renderHook(() => useQRCodeAdmin());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.handleLocationSelect('loc1');
      });

      await waitFor(() => {
        expect(result.current.buildings).toEqual(mockBuildings);
      });

      act(() => {
        result.current.setSelectedBuildingId('bld1');
      });

      await waitFor(() => {
        expect(result.current.floors).toEqual(mockFloors);
        expect(result.current.qrCodes).toEqual(mockQRCodes);
      });

      expect(qrService.getFloorsForBuilding).toHaveBeenCalledWith('loc1', 'bld1');
      expect(qrService.getQRCodesForBuilding).toHaveBeenCalledWith('loc1', 'bld1');
    });

    it('should handle floors/QR codes loading error', async () => {
      (qrService.getFloorsForBuilding as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useQRCodeAdmin());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.handleLocationSelect('loc1');
      });

      await waitFor(() => {
        expect(result.current.buildings).toEqual(mockBuildings);
      });

      act(() => {
        result.current.setSelectedBuildingId('bld1');
      });

      await waitFor(() => {
        expect(result.current.error).toBe('Failed to load floors / QR codes');
      });
    });
  });

  describe('Floor Selection', () => {
    it('should load rooms when floor is selected', async () => {
      const { result } = renderHook(() => useQRCodeAdmin());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.handleLocationSelect('loc1');
      });

      await waitFor(() => {
        expect(result.current.buildings).toEqual(mockBuildings);
      });

      act(() => {
        result.current.setSelectedBuildingId('bld1');
      });

      await waitFor(() => {
        expect(result.current.floors).toEqual(mockFloors);
      });

      act(() => {
        result.current.setSelectedFloorId('flr1');
      });

      await waitFor(() => {
        expect(result.current.rooms).toEqual(mockRooms);
      });

      expect(qrService.getRoomsForFloor).toHaveBeenCalledWith('loc1', 'bld1', 'flr1');
    });
  });

  describe('QR Code Generation and Creation', () => {
    it('should generate QR value with correct format', async () => {
      const { result } = renderHook(() => useQRCodeAdmin());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Set up the selection hierarchy
      act(() => {
        result.current.handleLocationSelect('loc1');
      });

      await waitFor(() => {
        expect(result.current.buildings).toEqual(mockBuildings);
      });

      act(() => {
        result.current.setSelectedBuildingId('bld1');
      });

      await waitFor(() => {
        expect(result.current.floors).toEqual(mockFloors);
      });

      act(() => {
        result.current.setSelectedFloorId('flr1');
      });

      await waitFor(() => {
        expect(result.current.rooms).toEqual(mockRooms);
      });

      act(() => {
        result.current.setSelectedRoom(mockRooms[0]);
      });

      act(() => {
        result.current.handleGenerateQRCode();
      });

      expect(result.current.qrValue).toMatch(/^qr:loc1:bld1:flr1:rm1:[a-z0-9]+$/);
    });

    it('should create QR code successfully', async () => {
      const { result } = renderHook(() => useQRCodeAdmin());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Set up complete selection
      act(() => {
        result.current.handleLocationSelect('loc1');
      });

      await waitFor(() => {
        expect(result.current.buildings).toEqual(mockBuildings);
      });

      act(() => {
        result.current.setSelectedBuildingId('bld1');
      });

      await waitFor(() => {
        expect(result.current.floors).toEqual(mockFloors);
      });

      act(() => {
        result.current.setSelectedFloorId('flr1');
      });

      await waitFor(() => {
        expect(result.current.rooms).toEqual(mockRooms);
      });

      act(() => {
        result.current.setSelectedRoom(mockRooms[0]);
        result.current.setQrValue('test-qr-value');
        result.current.setQrDescription('Test description');
      });

      await act(async () => {
        await result.current.handleAddQRCode();
      });

      expect(qrService.createQRCodeMapping).toHaveBeenCalledWith(
        'loc1',
        'Location 1',
        'bld1',
        'Building 1',
        'flr1',
        'rm1',
        'Room 101',
        'test-qr-value',
        'Test description'
      );

      expect(result.current.showSuccessPopup).toBe(true);
      expect(result.current.successMessage).toBe('QR code added successfully.');
      expect(result.current.isAddModalVisible).toBe(false);
    });

    it('should show error when creating QR code without required selections', async () => {
      const { result } = renderHook(() => useQRCodeAdmin());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.handleAddQRCode();
      });

      expect(result.current.showErrorPopup).toBe(true);
      expect(result.current.errorMessage).toBe('Please select a location, building and floor.');
    });

    it('should show error when creating QR code without room or value', async () => {
      const { result } = renderHook(() => useQRCodeAdmin());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.handleLocationSelect('loc1');
      });

      await waitFor(() => {
        expect(result.current.buildings).toEqual(mockBuildings);
      });

      act(() => {
        result.current.setSelectedBuildingId('bld1');
        result.current.setSelectedFloorId('flr1');
      });

      await act(async () => {
        await result.current.handleAddQRCode();
      });

      expect(result.current.showErrorPopup).toBe(true);
      expect(result.current.errorMessage).toBe('Please select a room and enter a QR code value.');
    });


    // ...existing code...
    
    it('should handle QR code creation error', async () => {
      // Set the mock before hook initialization!
      (qrService.createQRCodeMapping as jest.Mock).mockRejectedValue(new Error('Network error'));
    
      const { result } = renderHook(() => useQRCodeAdmin());
    
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    
      await act(async () => {
        result.current.handleLocationSelect('loc1');
      });
      await waitFor(() => {
        expect(result.current.buildings).toEqual(mockBuildings);
      });
    
      await act(async () => {
        result.current.setSelectedBuildingId('bld1');
      });
      await act(async () => {
        result.current.setSelectedFloorId('flr1');
      });
      await waitFor(() => {
        expect(result.current.rooms).toEqual(mockRooms);
      });
    
      await act(async () => {
        result.current.setSelectedRoom(mockRooms[0]);
      });
      await act(async () => {
        result.current.setQrValue('test-qr-value');
      });
      await act(async () => {
        result.current.setQrDescription('Test description');
      });
    
      await waitFor(() => {
        expect(result.current.selectedRoom).toEqual(mockRooms[0]);
        expect(result.current.qrValue).toBe('test-qr-value');
        expect(result.current.qrDescription).toBe('Test description');
      });
    
      await act(async () => {
        await result.current.handleAddQRCode();
      });
    
      expect(result.current.showErrorPopup).toBe(true);
      expect(result.current.errorMessage).toBe('Failed to add QR code. Please try again.');
    });
    
    it('should call console.error when QR code creation fails', async () => {
      // Set the mock before hook initialization!
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      (qrService.createQRCodeMapping as jest.Mock).mockRejectedValue(new Error('Network error'));
    
      const { result } = renderHook(() => useQRCodeAdmin());
    
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    
      await act(async () => {
        result.current.handleLocationSelect('loc1');
      });
      await waitFor(() => {
        expect(result.current.buildings).toEqual(mockBuildings);
      });
    
      await act(async () => {
        result.current.setSelectedBuildingId('bld1');
      });
      await act(async () => {
        result.current.setSelectedFloorId('flr1');
      });
      await waitFor(() => {
        expect(result.current.rooms).toEqual(mockRooms);
      });
    
      await act(async () => {
        result.current.setSelectedRoom(mockRooms[0]);
      });
      await act(async () => {
        result.current.setQrValue('test-qr-value');
      });
      await act(async () => {
        result.current.setQrDescription('Test description');
      });
    
      await waitFor(() => {
        expect(result.current.selectedRoom).toEqual(mockRooms[0]);
        expect(result.current.qrValue).toBe('test-qr-value');
        expect(result.current.qrDescription).toBe('Test description');
      });
    
      await act(async () => {
        await result.current.handleAddQRCode();
      });
    
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error adding QR code:', expect.any(Error));
      expect(result.current.showErrorPopup).toBe(true);
      expect(result.current.errorMessage).toBe('Failed to add QR code. Please try again.');
    
      consoleErrorSpy.mockRestore();
    });
    // ...existing code...

  });

  describe('QR Code Deletion', () => {
    it('should delete QR code successfully', async () => {
      const { result } = renderHook(() => useQRCodeAdmin());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.handleLocationSelect('loc1');
      });

      await waitFor(() => {
        expect(result.current.buildings).toEqual(mockBuildings);
      });

      act(() => {
        result.current.setSelectedBuildingId('bld1');
      });

      act(() => {
        result.current.handleDeleteQRCode(mockQRCodes[0]);
      });

      expect(result.current.showConfirmPopup).toBe(true);
      expect(result.current.confirmMessage).toBe('Are you sure you want to delete this QR code mapping?');

      await act(async () => {
        result.current.confirmAction();
      });

      expect(qrService.deleteQRCodeMapping).toHaveBeenCalledWith('loc1', 'qr1');
      expect(result.current.showSuccessPopup).toBe(true);
      expect(result.current.successMessage).toBe('QR code removed successfully.');
    });

    it('should show error when deleting QR code without location', async () => {
      const { result } = renderHook(() => useQRCodeAdmin());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.handleDeleteQRCode(mockQRCodes[0]);
      });

      expect(result.current.showErrorPopup).toBe(true);
      expect(result.current.errorMessage).toBe('Location information missing.');
    });

    it('should handle QR code deletion error', async () => {
      (qrService.deleteQRCodeMapping as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useQRCodeAdmin());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.handleLocationSelect('loc1');
        result.current.setSelectedBuildingId('bld1');
      });

      act(() => {
        result.current.handleDeleteQRCode(mockQRCodes[0]);
      });

      await act(async () => {
        result.current.confirmAction();
      });

      expect(result.current.showErrorPopup).toBe(true);
      expect(result.current.errorMessage).toBe('Failed to delete QR code. Please try again.');
    });
  });

  describe('QR Code Viewing', () => {
    it('should view QR code correctly', () => {
      const { result } = renderHook(() => useQRCodeAdmin());

      act(() => {
        result.current.handleViewQR(mockQRCodes[0]);
      });

      expect(result.current.selectedQrCode).toEqual(mockQRCodes[0]);
      expect(result.current.qrValue).toBe(mockQRCodes[0].qrValue);
      expect(result.current.isGenerateModalVisible).toBe(true);
    });
  });

  describe('Modal Management', () => {
    it('should reset add modal correctly', () => {
      const { result } = renderHook(() => useQRCodeAdmin());

      act(() => {
        result.current.setIsAddModalVisible(true);
        result.current.setSelectedRoom(mockRooms[0]);
        result.current.setQrValue('test-value');
        result.current.setQrDescription('test-description');
        result.current.setSearchQuery('test-query');
      });

      act(() => {
        result.current.resetAddModal();
      });

      expect(result.current.isAddModalVisible).toBe(false);
      expect(result.current.selectedRoom).toBeNull();
      expect(result.current.qrValue).toBe('');
      expect(result.current.qrDescription).toBe('');
      expect(result.current.searchQuery).toBe('');
    });
  });

  describe('State Setters', () => {
    it('should update all state values correctly', () => {
      const { result } = renderHook(() => useQRCodeAdmin());

      act(() => {
        result.current.setSelectedBuildingId('bld1');
        result.current.setSelectedFloorId('flr1');
        result.current.setSelectedRoom(mockRooms[0]);
        result.current.setQrDescription('test description');
        result.current.setQrValue('test value');
        result.current.setSearchQuery('test query');
        result.current.setBuildingDropdownOpen(true);
        result.current.setFloorDropdownOpen(true);
        result.current.setIsAddModalVisible(true);
        result.current.setIsGenerateModalVisible(true);
        result.current.setShowSuccessPopup(true);
        result.current.setShowErrorPopup(true);
        result.current.setShowConfirmPopup(true);
        result.current.setShowInfoPopup(true);
      });

      expect(result.current.selectedBuildingId).toBe('bld1');
      expect(result.current.selectedFloorId).toBe('flr1');
      expect(result.current.selectedRoom).toEqual(mockRooms[0]);
      expect(result.current.qrDescription).toBe('test description');
      expect(result.current.qrValue).toBe('test value');
      expect(result.current.searchQuery).toBe('test query');
      expect(result.current.buildingDropdownOpen).toBe(true);
      expect(result.current.floorDropdownOpen).toBe(true);
      expect(result.current.isAddModalVisible).toBe(true);
      expect(result.current.isGenerateModalVisible).toBe(true);
      expect(result.current.showSuccessPopup).toBe(true);
      expect(result.current.showErrorPopup).toBe(true);
      expect(result.current.showConfirmPopup).toBe(true);
      expect(result.current.showInfoPopup).toBe(true);
    });
  });

  describe('QR Ref', () => {
    it('should handle QR ref correctly', () => {
      const { result } = renderHook(() => useQRCodeAdmin());
      const mockRef = {} as any;

      act(() => {
        result.current.handleQRRef(mockRef);
      });

      expect(result.current.qrRef.current).toBe(mockRef);
    });

    it('should handle error when loading rooms for floor', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      (qrService.getRoomsForFloor as jest.Mock).mockRejectedValue(new Error('Network error'));
    
      const { result } = renderHook(() => useQRCodeAdmin());
    
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    
      act(() => {
        result.current.handleLocationSelect('loc1');
      });
    
      await waitFor(() => {
        expect(result.current.buildings).toEqual([
          { id: 'bld1', name: 'Building 1' },
          { id: 'bld2', name: 'Building 2' },
        ]);
      });
    
      act(() => {
        result.current.setSelectedBuildingId('bld1');
      });
    
      await waitFor(() => {
        expect(result.current.floors).toEqual([
          { id: 'flr1', name: 'Floor 1' },
          { id: 'flr2', name: 'Floor 2' },
        ]);
      });
    
      act(() => {
        result.current.setSelectedFloorId('flr1');
      });
    
      await waitFor(() => {
        expect(result.current.error).toBe('Failed to load rooms');
      });
    
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error loading rooms:', expect.any(Error));
      consoleErrorSpy.mockRestore();
    
  });
});
describe('useQRCodeAdmin RBAC', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not set role/adminLocations if uid is missing', async () => {
    // Set uid to null
    const authModule = auth() as any;
    authModule.__setUid(null);

    const { result } = renderHook(() => useQRCodeAdmin());

    // Wait for useEffect to run
    await waitFor(() => {
      // role and adminLocations should remain initial values
      expect(result.current.role).toBeNull();
      expect(result.current.adminLocations).toEqual([]);
    });
  });

  it('should set role and adminLocations from Firestore user data', async () => {
    // Set uid to a value
    const authModule = auth() as any;
    authModule.__setUid('test-uid');

    // Mock Firestore user data
    const mockUserData = {
      role: 'editor',
      adminLocations: ['loc1', 'loc2'],
    };
    const mockDocSnapshot = {
      data: () => mockUserData,
    };
    const firestoreModule = firestore() as any;
    firestoreModule.doc = jest.fn(() => ({
      get: jest.fn().mockResolvedValue(mockDocSnapshot),
    }));

    const { result } = renderHook(() => useQRCodeAdmin());

    await waitFor(() => {
      expect(result.current.role).toBe('editor');
      expect(result.current.adminLocations).toEqual(['loc1', 'loc2']);
    });
  });

  it('should fallback to defaults if Firestore returns no data', async () => {
    const authModule = auth() as any;
    authModule.__setUid('test-uid');

    // Mock Firestore returns undefined data
    const mockDocSnapshot = {
      data: () => undefined,
    };
    const firestoreModule = firestore() as any;
    firestoreModule.doc = jest.fn(() => ({
      get: jest.fn().mockResolvedValue(mockDocSnapshot),
    }));

    const { result } = renderHook(() => useQRCodeAdmin());

    await waitFor(() => {
      expect(result.current.role).toBe('user');
      expect(result.current.adminLocations).toEqual([]);
    });
  });
});
});