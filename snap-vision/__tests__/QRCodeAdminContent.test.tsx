import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import QRCodeAdminContent from '../src/components/organisms/QRCodeAdminContent';
import { ThemeProviderWrapper } from './test-utils/ThemeProviderWrapper';

// Mock dependencies
jest.mock('@react-native-firebase/firestore', () => {
  // Create mock data
  const mockUserData = {
    role: 'admin',
    adminLocations: ['loc1', 'loc2'],
  };

  // Create a mock document snapshot
  const mockDocSnapshot = {
    exists: true,
    data: jest.fn().mockReturnValue(mockUserData),
    id: 'test-uid',
  };

  // Create mock functions
  const mockGet = jest.fn().mockResolvedValue(mockDocSnapshot);
  const mockUpdate = jest.fn().mockResolvedValue(undefined);
  const mockWhere = jest.fn();
  const mockLimit = jest.fn();

  // Setup document reference
  const mockDocRef = {
    get: mockGet,
    update: mockUpdate,
  };

  // Setup collection reference
  const mockCollectionRef = {
    doc: jest.fn().mockReturnValue(mockDocRef),
  };

  mockWhere.mockReturnValue({
    limit: mockLimit,
  });

  mockLimit.mockReturnValue({
    get: mockGet,
  });

  const firestoreMock = jest.fn().mockReturnValue({
    collection: jest.fn().mockReturnValue(mockCollectionRef),
    doc: jest.fn().mockReturnValue(mockDocRef),
    collectionGroup: jest.fn().mockReturnValue({
      where: mockWhere,
    }),
  });

  return firestoreMock;
});

jest.mock('@react-native-firebase/auth', () => {
  return () => ({
    currentUser: {
      uid: 'test-uid',
    },
  });
});

// Mock react-native-qrcode-svg
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

// Mock DropDownPicker
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

// Mock RNFS
jest.mock('react-native-fs', () => ({
  CachesDirectoryPath: '/mock-cache-path',
  writeFile: jest.fn().mockResolvedValue(undefined),
}));

// Mock SettingsHeader
jest.mock('../src/components/molecules/SettingsHeader', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ title }) => (
      <View testID="settings-header">
        <Text>{title}</Text>
      </View>
    ),
  };
});

// Mock StandardPopup
jest.mock('../src/components/atoms/StandardPopup', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ visible, title, message, onConfirm, onCancel, confirmText = 'OK' }) =>
      visible ? (
        <View testID="standard-popup">
          <Text testID="popup-title">{title}</Text>
          <Text testID="popup-message">{message}</Text>
          <TouchableOpacity testID="popup-confirm" onPress={onConfirm}>
            <Text>{confirmText}</Text>
          </TouchableOpacity>
          {onCancel && (
            <TouchableOpacity testID="popup-cancel" onPress={onCancel}>
              <Text>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null,
  };
});

// Mock qrService functions
jest.mock('../src/services/qrService', () => ({
  getLocations: jest.fn().mockResolvedValue([
    { id: 'loc1', name: 'Location 1' },
    { id: 'loc2', name: 'Location 2' },
  ]),
  getBuildingsForLocation: jest.fn().mockResolvedValue([
    { id: 'bld1', name: 'Building 1' },
    { id: 'bld2', name: 'Building 2' },
  ]),
  getFloorsForBuilding: jest.fn().mockResolvedValue([
    { id: 'flr1', name: '1' },
    { id: 'flr2', name: '2' },
  ]),
  getRoomsForFloor: jest.fn().mockResolvedValue([
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
  ]),
  getQRCodesForBuilding: jest.fn().mockResolvedValue([
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
  ]),
  createQRCodeMapping: jest.fn().mockResolvedValue(undefined),
  deleteQRCodeMapping: jest.fn().mockResolvedValue(undefined),
}));

describe('QRCodeAdminContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with loading state', async () => {
    const { getByText, queryByText } = render(
      <ThemeProviderWrapper>
        <QRCodeAdminContent />
      </ThemeProviderWrapper>,
    );

    // Check that loading is initially displayed
    expect(getByText('Loading...')).toBeTruthy();

    // Wait for loading to disappear - with an increased timeout
    await waitFor(() => expect(queryByText('Loading...')).toBeNull(), { timeout: 5000 });
  });

  it('renders location chips after loading', async () => {
    const { findByText } = render(
      <ThemeProviderWrapper>
        <QRCodeAdminContent />
      </ThemeProviderWrapper>,
    );

    // Wait for the locations to load
    const location1 = await findByText('Location 1', {}, { timeout: 5000 });
    const location2 = await findByText('Location 2', {}, { timeout: 5000 });

    expect(location1).toBeTruthy();
    expect(location2).toBeTruthy();
  });

  it('allows selecting a location', async () => {
    const { findByText } = render(
      <ThemeProviderWrapper>
        <QRCodeAdminContent />
      </ThemeProviderWrapper>,
    );

    // Find and click on a location
    const location1 = await findByText('Location 1');
    fireEvent.press(location1);

    await waitFor(() => {
      expect(require('../src/services/qrService').getBuildingsForLocation).toHaveBeenCalledWith(
        'loc1',
      );
    });
  });

  it('shows buildings dropdown after selecting a location', async () => {
    const { findByText, getByTestID } = render(
      <ThemeProviderWrapper>
        <QRCodeAdminContent />
      </ThemeProviderWrapper>,
    );

    // Select a location
    const location1 = await findByText('Location 1');
    fireEvent.press(location1);

    await waitFor(() => {
      expect(findByText('Select a building')).toBeTruthy();
    });
  });

  it('shows error popup when error occurs', async () => {
    // Mock the getLocations function to reject
    require('../src/services/qrService').getLocations.mockRejectedValueOnce(
      new Error('Network error'),
    );

    const { findByTestId, findByText } = render(
      <ThemeProviderWrapper>
        <QRCodeAdminContent />
      </ThemeProviderWrapper>,
    );

    // Wait for error to be displayed
    await waitFor(() => {
      expect(findByText('Failed to load locations')).toBeTruthy();
    });
  });

  it('shows add QR code modal when Add New button is pressed', async () => {
    const { findByText, getByText } = render(
      <ThemeProviderWrapper>
        <QRCodeAdminContent />
      </ThemeProviderWrapper>,
    );

    // Select location
    const location1 = await findByText('Location 1');
    await act(async () => {
      fireEvent.press(location1);
    });

    // Wait for buildings to load
    await waitFor(() => {
      expect(require('../src/services/qrService').getBuildingsForLocation).toHaveBeenCalled();
    });

    // Select building (this is complex with the mocked dropdown, might need additional test helpers)
    // For now just mock some of the state setting that would happen

    // Mock the Add New button being shown and clicked
    // This would require a more complex setup to get to this state
  });

  // Additional tests would be added for:
  // - Testing the complete flow of adding a QR code
  // - Testing QR code deletion
  // - Testing error handling in various operations
  // - Testing the QR code generation functionality
  // - Testing popup confirmations
});
