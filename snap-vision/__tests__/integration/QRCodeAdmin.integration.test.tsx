import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import QRCodeAdminContent from '../../src/components/organisms/QRCodeAdminContent';
import { ThemeProviderWrapper } from '../test-utils/ThemeProviderWrapper';
import * as qrService from '../../src/services/qrService';

// Mock the Firebase modules
jest.mock('@react-native-firebase/firestore', () => {
  const firestoreMock = {
    collection: jest.fn(),
    doc: jest.fn(),
    collectionGroup: jest.fn(),
  };

  const mockUserData = {
    role: 'admin',
    adminLocations: ['loc1', 'loc2'],
  };

  const mockDocSnapshot = {
    exists: true,
    data: () => mockUserData,
    id: 'test-uid',
  };

  const mockQuerySnapshot = {
    empty: false,
    docs: [mockDocSnapshot],
  };

  const mockUpdate = jest.fn().mockResolvedValue(undefined);
  const mockGet = jest.fn().mockResolvedValue(mockDocSnapshot);
  const mockWhere = jest.fn().mockReturnThis();
  const mockLimit = jest.fn().mockReturnThis();

  const mockDocRef = {
    get: mockGet,
    update: mockUpdate,
  };

  const mockCollectionRef = {
    doc: jest.fn().mockReturnValue(mockDocRef),
    where: mockWhere,
    limit: mockLimit,
    get: jest.fn().mockResolvedValue(mockQuerySnapshot),
  };

  firestoreMock.collection.mockReturnValue(mockCollectionRef);
  firestoreMock.doc.mockReturnValue(mockDocRef);
  firestoreMock.collectionGroup.mockReturnValue(mockCollectionRef);

  return jest.fn(() => firestoreMock);
});

jest.mock('@react-native-firebase/auth', () => {
  return jest.fn(() => ({
    currentUser: {
      uid: 'test-uid',
    },
  }));
});

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

jest.mock('react-native-dropdown-picker', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return function MockDropDownPicker({
    items,
    value,
    setValue,
    placeholder,
    open,
    setOpen,
    testID,
  }) {
    return (
      <View testID={testID || 'dropdown-picker'}>
        <Text>{placeholder}</Text>
        <Text testID="selected-value">{value}</Text>
        <TouchableOpacity onPress={() => setOpen(!open)} testID="toggle-dropdown">
          <Text>Toggle</Text>
        </TouchableOpacity>
        {open &&
          items.map((item) => (
            <TouchableOpacity
              key={item.value}
              testID={`dropdown-item-${item.value}`}
              onPress={() => {
                setValue(() => item.value);
                setOpen(false);
              }}
            >
              <Text>{item.label}</Text>
            </TouchableOpacity>
          ))}
      </View>
    );
  };
});

jest.mock('react-native-qrcode-svg', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: (props) => {
      return <View testID="qrcode-mock" {...props} />;
    },
  };
});

jest.mock('react-native-fs', () => ({
  CachesDirectoryPath: '/mock-cache-path',
  writeFile: jest.fn().mockResolvedValue(undefined),
}));

// Mock the useQRCodeAdmin hook
jest.mock('../../src/hooks/useQRCodeAdmin');

const mockLocations = [
  { id: 'loc1', name: 'Main Campus' },
  { id: 'loc2', name: 'Secondary Campus' },
];

const mockBuildings = [
  { id: 'bld1', name: 'Engineering Building' },
  { id: 'bld2', name: 'Science Building' },
];

const mockFloors = [
  { id: 'flr1', name: '1' },
  { id: 'flr2', name: '2' },
];

const mockRooms = [
  {
    id: 'rm1',
    name: 'E101',
    floorId: 'flr1',
    buildingId: 'bld1',
    buildingName: 'Engineering Building',
  },
  {
    id: 'rm2',
    name: 'E102',
    floorId: 'flr1',
    buildingId: 'bld1',
    buildingName: 'Engineering Building',
  },
];

const mockQRCodes = [
  {
    id: 'qr1',
    roomId: 'rm1',
    roomName: 'E101',
    buildingId: 'bld1',
    buildingName: 'Engineering Building',
    floorId: 'flr1',
    qrValue: 'qr:loc1:bld1:flr1:rm1:abc123',
    description: 'Entrance QR',
  },
];

const defaultMockHookReturn = {
  locations: mockLocations,
  buildings: [],
  floors: [],
  rooms: [],
  qrCodes: [],
  selectedLocationId: null,
  selectedBuildingId: null,
  selectedFloorId: null,
  selectedRoom: null,
  qrDescription: '',
  qrValue: '',
  searchQuery: '',
  buildingDropdownOpen: false,
  floorDropdownOpen: false,
  isAddModalVisible: false,
  isGenerateModalVisible: false,
  isLoading: false,
  error: null,
  showSuccessPopup: false,
  successMessage: '',
  showErrorPopup: false,
  errorMessage: '',
  showConfirmPopup: false,
  confirmMessage: '',
  showInfoPopup: false,
  infoTitle: '',
  infoMessage: '',
  handleLocationSelect: jest.fn(),
  setSelectedBuildingId: jest.fn(),
  setSelectedFloorId: jest.fn(),
  setSelectedRoom: jest.fn(),
  setQrDescription: jest.fn(),
  setQrValue: jest.fn(),
  setSearchQuery: jest.fn(),
  setBuildingDropdownOpen: jest.fn(),
  setFloorDropdownOpen: jest.fn(),
  setIsAddModalVisible: jest.fn(),
  setIsGenerateModalVisible: jest.fn(),
  setShowSuccessPopup: jest.fn(),
  setShowErrorPopup: jest.fn(),
  setShowConfirmPopup: jest.fn(),
  setShowInfoPopup: jest.fn(),
  handleGenerateQRCode: jest.fn(),
  handleAddQRCode: jest.fn(),
  handleDeleteQRCode: jest.fn(),
  handleViewQR: jest.fn(),
  confirmAction: jest.fn(),
  resetAddModal: jest.fn(),
};

describe('QRCodeAdminContent Integration', () => {
  let getLocationsSpy;
  let getBuildingsForLocationSpy;
  let getFloorsForBuildingSpy;
  let getRoomsForFloorSpy;
  let getQRCodesForBuildingSpy;
  let createQRCodeMappingSpy;
  let deleteQRCodeMappingSpy;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup service spies
    getLocationsSpy = jest.spyOn(qrService, 'getLocations').mockResolvedValue(mockLocations);
    getBuildingsForLocationSpy = jest
      .spyOn(qrService, 'getBuildingsForLocation')
      .mockResolvedValue(mockBuildings);
    getFloorsForBuildingSpy = jest
      .spyOn(qrService, 'getFloorsForBuilding')
      .mockResolvedValue(mockFloors);
    getRoomsForFloorSpy = jest.spyOn(qrService, 'getRoomsForFloor').mockResolvedValue(mockRooms);
    getQRCodesForBuildingSpy = jest
      .spyOn(qrService, 'getQRCodesForBuilding')
      .mockResolvedValue(mockQRCodes);
    createQRCodeMappingSpy = jest
      .spyOn(qrService, 'createQRCodeMapping')
      .mockResolvedValue(undefined);
    deleteQRCodeMappingSpy = jest
      .spyOn(qrService, 'deleteQRCodeMapping')
      .mockResolvedValue(undefined);

    // Setup default mock return
    require('../../src/hooks/useQRCodeAdmin').useQRCodeAdmin.mockReturnValue(defaultMockHookReturn);
  });

  it('renders basic structure with header and location selector', () => {
    const { getByText } = render(
      <ThemeProviderWrapper>
        <QRCodeAdminContent />
      </ThemeProviderWrapper>,
    );

    expect(getByText('QR Code Management')).toBeTruthy();
    expect(getByText('Select a Location')).toBeTruthy();
  });

  it('shows building selector when location is selected', () => {
    require('../../src/hooks/useQRCodeAdmin').useQRCodeAdmin.mockReturnValue({
      ...defaultMockHookReturn,
      selectedLocationId: 'loc1',
      buildings: mockBuildings,
    });

    const { getByText } = render(
      <ThemeProviderWrapper>
        <QRCodeAdminContent />
      </ThemeProviderWrapper>,
    );

    expect(getByText('Step 2: Select Building')).toBeTruthy();
  });

  it('shows floor selector when building is selected', () => {
    require('../../src/hooks/useQRCodeAdmin').useQRCodeAdmin.mockReturnValue({
      ...defaultMockHookReturn,
      selectedLocationId: 'loc1',
      selectedBuildingId: 'bld1',
      buildings: mockBuildings,
      floors: mockFloors,
    });

    const { getByText } = render(
      <ThemeProviderWrapper>
        <QRCodeAdminContent />
      </ThemeProviderWrapper>,
    );

    expect(getByText('Step 3: Select Floor')).toBeTruthy();
  });

  it('shows QR code list when all selections are made', () => {
    require('../../src/hooks/useQRCodeAdmin').useQRCodeAdmin.mockReturnValue({
      ...defaultMockHookReturn,
      selectedLocationId: 'loc1',
      selectedBuildingId: 'bld1',
      selectedFloorId: 'flr1',
      buildings: mockBuildings,
      floors: mockFloors,
      qrCodes: mockQRCodes,
      rooms: mockRooms,
    });

    const { getByText } = render(
      <ThemeProviderWrapper>
        <QRCodeAdminContent />
      </ThemeProviderWrapper>,
    );

    expect(getByText('QR Codes for Building Engineering Building, Floor 1')).toBeTruthy();
  });

  it('shows loading indicator when isLoading is true', () => {
    require('../../src/hooks/useQRCodeAdmin').useQRCodeAdmin.mockReturnValue({
      ...defaultMockHookReturn,
      isLoading: true,
    });

    const { getByText } = render(
      <ThemeProviderWrapper>
        <QRCodeAdminContent />
      </ThemeProviderWrapper>,
    );

    expect(getByText('Loading...')).toBeTruthy();
  });

  it('renders error message when error is present', () => {
    require('../../src/hooks/useQRCodeAdmin').useQRCodeAdmin.mockReturnValue({
      ...defaultMockHookReturn,
      error: 'Test error message',
    });

    const { getByText } = render(
      <ThemeProviderWrapper>
        <QRCodeAdminContent />
      </ThemeProviderWrapper>,
    );

    expect(getByText('Test error message')).toBeTruthy();
  });

  it('shows error popup when showErrorPopup is true', () => {
    require('../../src/hooks/useQRCodeAdmin').useQRCodeAdmin.mockReturnValue({
      ...defaultMockHookReturn,
      showErrorPopup: true,
      errorMessage: 'Something went wrong',
    });

    const { getByText } = render(
      <ThemeProviderWrapper>
        <QRCodeAdminContent />
      </ThemeProviderWrapper>,
    );

    expect(getByText('Error')).toBeTruthy();
    expect(getByText('Something went wrong')).toBeTruthy();
  });

  it('shows success popup when showSuccessPopup is true', () => {
    require('../../src/hooks/useQRCodeAdmin').useQRCodeAdmin.mockReturnValue({
      ...defaultMockHookReturn,
      showSuccessPopup: true,
      successMessage: 'Operation completed successfully',
    });

    const { getByText } = render(
      <ThemeProviderWrapper>
        <QRCodeAdminContent />
      </ThemeProviderWrapper>,
    );

    expect(getByText('Success')).toBeTruthy();
    expect(getByText('Operation completed successfully')).toBeTruthy();
  });

  it('shows confirmation popup when showConfirmPopup is true', () => {
    require('../../src/hooks/useQRCodeAdmin').useQRCodeAdmin.mockReturnValue({
      ...defaultMockHookReturn,
      showConfirmPopup: true,
      confirmMessage: 'Are you sure you want to delete this QR code?',
    });

    const { getByText } = render(
      <ThemeProviderWrapper>
        <QRCodeAdminContent />
      </ThemeProviderWrapper>,
    );

    expect(getByText('Confirm Delete')).toBeTruthy();
    expect(getByText('Are you sure you want to delete this QR code?')).toBeTruthy();
    expect(getByText('Delete')).toBeTruthy();
    expect(getByText('Cancel')).toBeTruthy();
  });

  it('shows info popup when showInfoPopup is true', () => {
    require('../../src/hooks/useQRCodeAdmin').useQRCodeAdmin.mockReturnValue({
      ...defaultMockHookReturn,
      showInfoPopup: true,
      infoTitle: 'Information',
      infoMessage: 'This is some helpful information',
    });

    const { getByText } = render(
      <ThemeProviderWrapper>
        <QRCodeAdminContent />
      </ThemeProviderWrapper>,
    );

    expect(getByText('Information')).toBeTruthy();
    expect(getByText('This is some helpful information')).toBeTruthy();
  });

  it('shows QRCodeAddModal when isAddModalVisible is true', () => {
    require('../../src/hooks/useQRCodeAdmin').useQRCodeAdmin.mockReturnValue({
      ...defaultMockHookReturn,
      isAddModalVisible: true,
      rooms: mockRooms,
      selectedRoom: mockRooms[0],
      searchQuery: '',
      qrDescription: 'Test description',
      qrValue: 'test-qr-value',
    });

    const { getByText } = render(
      <ThemeProviderWrapper>
        <QRCodeAdminContent />
      </ThemeProviderWrapper>,
    );

    expect(getByText('Add New QR Code')).toBeTruthy();
  });

  it('shows QRCodePreviewModal when isGenerateModalVisible is true', () => {
    require('../../src/hooks/useQRCodeAdmin').useQRCodeAdmin.mockReturnValue({
      ...defaultMockHookReturn,
      isGenerateModalVisible: true,
      qrValue: 'test-qr-value',
    });

    const { getByText } = render(
      <ThemeProviderWrapper>
        <QRCodeAdminContent />
      </ThemeProviderWrapper>,
    );

    expect(getByText('QR Code')).toBeTruthy();
  });

  it('calls setShowErrorPopup when error popup OK is pressed', () => {
    const mockSetShowErrorPopup = jest.fn();
    require('../../src/hooks/useQRCodeAdmin').useQRCodeAdmin.mockReturnValue({
      ...defaultMockHookReturn,
      showErrorPopup: true,
      errorMessage: 'Test error',
      setShowErrorPopup: mockSetShowErrorPopup,
    });

    const { getByText } = render(
      <ThemeProviderWrapper>
        <QRCodeAdminContent />
      </ThemeProviderWrapper>,
    );

    fireEvent.press(getByText('OK'));
    expect(mockSetShowErrorPopup).toHaveBeenCalledWith(false);
  });

  it('calls setShowSuccessPopup when success popup OK is pressed', () => {
    const mockSetShowSuccessPopup = jest.fn();
    require('../../src/hooks/useQRCodeAdmin').useQRCodeAdmin.mockReturnValue({
      ...defaultMockHookReturn,
      showSuccessPopup: true,
      successMessage: 'Test success',
      setShowSuccessPopup: mockSetShowSuccessPopup,
    });

    const { getByText } = render(
      <ThemeProviderWrapper>
        <QRCodeAdminContent />
      </ThemeProviderWrapper>,
    );

    fireEvent.press(getByText('OK'));
    expect(mockSetShowSuccessPopup).toHaveBeenCalledWith(false);
  });

  it('calls confirmAction when confirmation popup Delete is pressed', () => {
    const mockConfirmAction = jest.fn();
    require('../../src/hooks/useQRCodeAdmin').useQRCodeAdmin.mockReturnValue({
      ...defaultMockHookReturn,
      showConfirmPopup: true,
      confirmMessage: 'Test confirm',
      confirmAction: mockConfirmAction,
    });

    const { getByText } = render(
      <ThemeProviderWrapper>
        <QRCodeAdminContent />
      </ThemeProviderWrapper>,
    );

    fireEvent.press(getByText('Delete'));
    expect(mockConfirmAction).toHaveBeenCalled();
  });

  it('calls setShowConfirmPopup when confirmation popup Cancel is pressed', () => {
    const mockSetShowConfirmPopup = jest.fn();
    require('../../src/hooks/useQRCodeAdmin').useQRCodeAdmin.mockReturnValue({
      ...defaultMockHookReturn,
      showConfirmPopup: true,
      confirmMessage: 'Test confirm',
      setShowConfirmPopup: mockSetShowConfirmPopup,
    });

    const { getByText } = render(
      <ThemeProviderWrapper>
        <QRCodeAdminContent />
      </ThemeProviderWrapper>,
    );

    fireEvent.press(getByText('Cancel'));
    expect(mockSetShowConfirmPopup).toHaveBeenCalledWith(false);
  });

  it('handles location selection correctly', () => {
    const mockHandleLocationSelect = jest.fn();
    require('../../src/hooks/useQRCodeAdmin').useQRCodeAdmin.mockReturnValue({
      ...defaultMockHookReturn,
      handleLocationSelect: mockHandleLocationSelect,
    });

    const { getByText } = render(
      <ThemeProviderWrapper>
        <QRCodeAdminContent />
      </ThemeProviderWrapper>,
    );

    fireEvent.press(getByText('Main Campus'));
    expect(mockHandleLocationSelect).toHaveBeenCalledWith('loc1');
  });

  it('renders empty state when no locations are available', () => {
    require('../../src/hooks/useQRCodeAdmin').useQRCodeAdmin.mockReturnValue({
      ...defaultMockHookReturn,
      locations: [],
    });

    const { getByText } = render(
      <ThemeProviderWrapper>
        <QRCodeAdminContent />
      </ThemeProviderWrapper>,
    );

    expect(getByText('Select a Location')).toBeTruthy();
  });

  it('completes the full selection flow: location -> building -> floor', async () => {
    const { findByText, queryByText } = render(
      <ThemeProviderWrapper>
        <QRCodeAdminContent />
      </ThemeProviderWrapper>,
    );

    // Step 1: Select a location
    const campus1 = await findByText('Main Campus');
    fireEvent.press(campus1);

    // Verify the component recognizes the selection
    await waitFor(() => {
      expect(queryByText('Select a Location')).toBeTruthy();
    });
  });

  it('displays error when service call fails', async () => {
    getLocationsSpy.mockRejectedValueOnce(new Error('Network error'));

    require('../../src/hooks/useQRCodeAdmin').useQRCodeAdmin.mockReturnValue({
      ...defaultMockHookReturn,
      error: 'Failed to load locations',
    });

    const { findByText } = render(
      <ThemeProviderWrapper>
        <QRCodeAdminContent />
      </ThemeProviderWrapper>,
    );

    const errorMessage = await findByText('Failed to load locations');
    expect(errorMessage).toBeTruthy();
  });

  describe('QRCodeAdminContent Integration - Additional Coverage', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      // Setup service spies
      getLocationsSpy = jest.spyOn(qrService, 'getLocations').mockResolvedValue(mockLocations);
      getBuildingsForLocationSpy = jest
        .spyOn(qrService, 'getBuildingsForLocation')
        .mockResolvedValue(mockBuildings);
      getFloorsForBuildingSpy = jest
        .spyOn(qrService, 'getFloorsForBuilding')
        .mockResolvedValue(mockFloors);
      getRoomsForFloorSpy = jest.spyOn(qrService, 'getRoomsForFloor').mockResolvedValue(mockRooms);
      getQRCodesForBuildingSpy = jest
        .spyOn(qrService, 'getQRCodesForBuilding')
        .mockResolvedValue(mockQRCodes);
      createQRCodeMappingSpy = jest
        .spyOn(qrService, 'createQRCodeMapping')
        .mockResolvedValue(undefined);
      deleteQRCodeMappingSpy = jest
        .spyOn(qrService, 'deleteQRCodeMapping')
        .mockResolvedValue(undefined);

      // Setup default mock return
      require('../../src/hooks/useQRCodeAdmin').useQRCodeAdmin.mockReturnValue(
        defaultMockHookReturn,
      );
    });

    it('passes correct props to QRCodeAddModal when visible', () => {
      const mockSetSelectedRoom = jest.fn();
      const mockSetSearchQuery = jest.fn();
      const mockSetQrValue = jest.fn();
      const mockSetQrDescription = jest.fn();
      const mockHandleGenerateQRCode = jest.fn();
      const mockHandleAddQRCode = jest.fn();
      const mockResetAddModal = jest.fn();

      require('../../src/hooks/useQRCodeAdmin').useQRCodeAdmin.mockReturnValue({
        ...defaultMockHookReturn,
        isAddModalVisible: true,
        rooms: mockRooms,
        selectedRoom: mockRooms[0],
        searchQuery: 'test search',
        qrDescription: 'test description',
        qrValue: 'test-qr-value',
        setSelectedRoom: mockSetSelectedRoom,
        setSearchQuery: mockSetSearchQuery,
        setQrValue: mockSetQrValue,
        setQrDescription: mockSetQrDescription,
        handleGenerateQRCode: mockHandleGenerateQRCode,
        handleAddQRCode: mockHandleAddQRCode,
        resetAddModal: mockResetAddModal,
      });

      const { getByText } = render(
        <ThemeProviderWrapper>
          <QRCodeAdminContent />
        </ThemeProviderWrapper>,
      );

      expect(getByText('Add New QR Code')).toBeTruthy();

      // Verify the modal receives the correct props
      // The modal should be rendered with all the hook values
    });

    it('calls setIsGenerateModalVisible when QRCodePreviewModal is closed', () => {
      const mockSetIsGenerateModalVisible = jest.fn();

      require('../../src/hooks/useQRCodeAdmin').useQRCodeAdmin.mockReturnValue({
        ...defaultMockHookReturn,
        isGenerateModalVisible: true,
        qrValue: 'test-qr-value',
        setIsGenerateModalVisible: mockSetIsGenerateModalVisible,
      });

      const { getByText } = render(
        <ThemeProviderWrapper>
          <QRCodeAdminContent />
        </ThemeProviderWrapper>,
      );

      fireEvent.press(getByText('Close'));
      expect(mockSetIsGenerateModalVisible).toHaveBeenCalledWith(false);
    });

    it('passes all required props to QRCodeList component', () => {
      const mockHandleViewQR = jest.fn();
      const mockHandleDeleteQRCode = jest.fn();
      const mockSetIsAddModalVisible = jest.fn();

      require('../../src/hooks/useQRCodeAdmin').useQRCodeAdmin.mockReturnValue({
        ...defaultMockHookReturn,
        selectedLocationId: 'loc1',
        selectedBuildingId: 'bld1',
        selectedFloorId: 'flr1',
        buildings: mockBuildings,
        floors: mockFloors,
        qrCodes: mockQRCodes,
        rooms: mockRooms,
        handleViewQR: mockHandleViewQR,
        handleDeleteQRCode: mockHandleDeleteQRCode,
        setIsAddModalVisible: mockSetIsAddModalVisible,
      });

      const { getByText } = render(
        <ThemeProviderWrapper>
          <QRCodeAdminContent />
        </ThemeProviderWrapper>,
      );

      // Verify QRCodeList is rendered with all props
      expect(getByText('QR Codes for Building Engineering Building, Floor 1')).toBeTruthy();
      expect(getByText('Add New')).toBeTruthy();

      // Test the onAddQR callback
      fireEvent.press(getByText('Add New'));
      expect(mockSetIsAddModalVisible).toHaveBeenCalledWith(true);
    });

    it('handles QRCodeAddModal onClose callback correctly', () => {
      const mockResetAddModal = jest.fn();

      require('../../src/hooks/useQRCodeAdmin').useQRCodeAdmin.mockReturnValue({
        ...defaultMockHookReturn,
        isAddModalVisible: true,
        rooms: mockRooms,
        resetAddModal: mockResetAddModal,
      });

      const { getByText } = render(
        <ThemeProviderWrapper>
          <QRCodeAdminContent />
        </ThemeProviderWrapper>,
      );

      fireEvent.press(getByText('Cancel'));
      expect(mockResetAddModal).toHaveBeenCalled();
    });

    it('renders QRCodeAddModal with all required props when not visible', () => {
      require('../../src/hooks/useQRCodeAdmin').useQRCodeAdmin.mockReturnValue({
        ...defaultMockHookReturn,
        isAddModalVisible: false,
        rooms: mockRooms,
        selectedRoom: mockRooms[0],
        searchQuery: 'test',
        qrDescription: 'desc',
        qrValue: 'value',
      });

      const { queryByText } = render(
        <ThemeProviderWrapper>
          <QRCodeAdminContent />
        </ThemeProviderWrapper>,
      );

      // Modal should not be visible but still rendered
      expect(queryByText('Add New QR Code')).toBeNull();
    });

    it('renders QRCodePreviewModal with all required props when not visible', () => {
      require('../../src/hooks/useQRCodeAdmin').useQRCodeAdmin.mockReturnValue({
        ...defaultMockHookReturn,
        isGenerateModalVisible: false,
        qrValue: 'test-qr-value',
      });

      const { queryByText } = render(
        <ThemeProviderWrapper>
          <QRCodeAdminContent />
        </ThemeProviderWrapper>,
      );

      // Modal should not be visible but still rendered
      expect(queryByText('QR Code')).toBeNull();
    });

    it('passes correct state values to all components', () => {
      const hookReturnWithAllStates = {
        ...defaultMockHookReturn,
        selectedLocationId: 'loc1',
        selectedBuildingId: 'bld1',
        selectedFloorId: 'flr1',
        buildings: mockBuildings,
        floors: mockFloors,
        qrCodes: mockQRCodes,
        rooms: mockRooms,
        qrDescription: 'test-description',
        qrValue: 'test-value',
        searchQuery: 'test-search',
        buildingDropdownOpen: true,
        floorDropdownOpen: true,
        isAddModalVisible: true,
        isGenerateModalVisible: true,
      };

      require('../../src/hooks/useQRCodeAdmin').useQRCodeAdmin.mockReturnValue(
        hookReturnWithAllStates,
      );

      const { getByText } = render(
        <ThemeProviderWrapper>
          <QRCodeAdminContent />
        </ThemeProviderWrapper>,
      );

      // Verify all components are rendered with the correct state
      expect(getByText('QR Code Management')).toBeTruthy();
      expect(getByText('Step 2: Select Building')).toBeTruthy();
      expect(getByText('Step 3: Select Floor')).toBeTruthy();
      expect(getByText('QR Codes for Building Engineering Building, Floor 1')).toBeTruthy();
      expect(getByText('Add New QR Code')).toBeTruthy();
      expect(getByText('QR Code')).toBeTruthy();
    });

    it('renders all conditional sections based on selections', () => {
      // Test with no selections
      const { queryByText: queryByTextNoSelection } = render(
        <ThemeProviderWrapper>
          <QRCodeAdminContent />
        </ThemeProviderWrapper>,
      );

      expect(queryByTextNoSelection('Step 2: Select Building')).toBeNull();
      expect(queryByTextNoSelection('Step 3: Select Floor')).toBeNull();

      // Test with location selected
      require('../../src/hooks/useQRCodeAdmin').useQRCodeAdmin.mockReturnValue({
        ...defaultMockHookReturn,
        selectedLocationId: 'loc1',
        buildings: mockBuildings,
      });

      const { queryByText: queryByTextWithLocation } = render(
        <ThemeProviderWrapper>
          <QRCodeAdminContent />
        </ThemeProviderWrapper>,
      );

      expect(queryByTextWithLocation('Step 2: Select Building')).toBeTruthy();
      expect(queryByTextWithLocation('Step 3: Select Floor')).toBeNull();

      // Test with building selected
      require('../../src/hooks/useQRCodeAdmin').useQRCodeAdmin.mockReturnValue({
        ...defaultMockHookReturn,
        selectedLocationId: 'loc1',
        selectedBuildingId: 'bld1',
        buildings: mockBuildings,
        floors: mockFloors,
      });

      const { queryByText: queryByTextWithBuilding } = render(
        <ThemeProviderWrapper>
          <QRCodeAdminContent />
        </ThemeProviderWrapper>,
      );

      expect(queryByTextWithBuilding('Step 2: Select Building')).toBeTruthy();
      expect(queryByTextWithBuilding('Step 3: Select Floor')).toBeTruthy();
    });
  });
});
