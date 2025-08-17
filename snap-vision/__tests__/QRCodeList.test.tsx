import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import QRCodeList from '../src/components/organisms/QRCodeList';
import { ThemeProviderWrapper } from './test-utils/ThemeProviderWrapper';

// Mock QRCodeItem component
jest.mock('../src/components/molecules/QRCodeItem', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: ({ item, onViewQR, onDelete }) => (
      <View testID={`qr-code-item-${item.id}`}>
        <Text>{item.roomName}</Text>
        <TouchableOpacity testID={`view-qr-${item.id}`} onPress={() => onViewQR(item)}>
          <Text>View</Text>
        </TouchableOpacity>
        <TouchableOpacity testID={`delete-qr-${item.id}`} onPress={() => onDelete(item)}>
          <Text>Delete</Text>
        </TouchableOpacity>
      </View>
    ),
  };
});

// Mock Icon
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

describe('QRCodeList', () => {
  const mockQRCodes = [
    {
      id: 'qr1',
      roomId: 'rm1',
      roomName: 'Room 101',
      buildingId: 'bld1',
      buildingName: 'Building 1',
      floorId: 'flr1',
      qrValue: 'qr:loc1:bld1:flr1:rm1:abc123',
      description: 'Test QR 1',
    },
    {
      id: 'qr2',
      roomId: 'rm2',
      roomName: 'Room 102',
      buildingId: 'bld1',
      buildingName: 'Building 1',
      floorId: 'flr1',
      qrValue: 'qr:loc1:bld1:flr1:rm2:def456',
      description: 'Test QR 2',
    },
    {
      id: 'qr3',
      roomId: 'rm3',
      roomName: 'Room 201',
      buildingId: 'bld1',
      buildingName: 'Building 1',
      floorId: 'flr2',
      qrValue: 'qr:loc1:bld1:flr2:rm3:ghi789',
      description: 'Test QR 3',
    },
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
    {
      id: 'rm3',
      name: 'Room 201',
      floorId: 'flr2',
      buildingId: 'bld1',
      buildingName: 'Building 1',
    },
  ];

  const mockBuildings = [{ id: 'bld1', name: 'Building 1' }];

  const mockFloors = [
    { id: 'flr1', name: '1' },
    { id: 'flr2', name: '2' },
  ];

  const mockOnViewQR = jest.fn();
  const mockOnDeleteQR = jest.fn();
  const mockOnAddQR = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with QR codes for selected floor', () => {
    const { getByText, queryByText, getAllByTestId } = render(
      <ThemeProviderWrapper>
        <QRCodeList
          qrCodes={mockQRCodes}
          rooms={mockRooms}
          buildings={mockBuildings}
          floors={mockFloors}
          selectedBuildingId="bld1"
          selectedFloorId="flr1"
          onViewQR={mockOnViewQR}
          onDeleteQR={mockOnDeleteQR}
          onAddQR={mockOnAddQR}
        />
      </ThemeProviderWrapper>,
    );

    // Header should show building and floor info
    expect(getByText('QR Codes for Building Building 1, Floor 1')).toBeTruthy();

    // Only QR codes for floor 1 should be rendered
    expect(getByText('Room 101')).toBeTruthy();
    expect(getByText('Room 102')).toBeTruthy();
    expect(queryByText('Room 201')).toBeNull();

    // Should have 2 QR code items
    const qrItems = getAllByTestId(/qr-code-item/);
    expect(qrItems).toHaveLength(2);
  });

  it('shows empty state when no QR codes match the selected floor', () => {
    const { getByText, queryByTestId } = render(
      <ThemeProviderWrapper>
        <QRCodeList
          qrCodes={mockQRCodes}
          rooms={mockRooms}
          buildings={mockBuildings}
          floors={mockFloors}
          selectedBuildingId="bld1"
          selectedFloorId="flr3" // No QR codes for this floor
          onViewQR={mockOnViewQR}
          onDeleteQR={mockOnDeleteQR}
          onAddQR={mockOnAddQR}
        />
      </ThemeProviderWrapper>,
    );

    expect(getByText('No QR codes found for this floor')).toBeTruthy();
    expect(queryByTestId(/qr-code-item/)).toBeNull();
  });

  it('renders Add New button', () => {
    const { getByText } = render(
      <ThemeProviderWrapper>
        <QRCodeList
          qrCodes={mockQRCodes}
          rooms={mockRooms}
          buildings={mockBuildings}
          floors={mockFloors}
          selectedBuildingId="bld1"
          selectedFloorId="flr1"
          onViewQR={mockOnViewQR}
          onDeleteQR={mockOnDeleteQR}
          onAddQR={mockOnAddQR}
        />
      </ThemeProviderWrapper>,
    );

    const addButton = getByText('Add New');
    expect(addButton).toBeTruthy();
  });

  it('calls onAddQR when Add New button is pressed', () => {
    const { getByText } = render(
      <ThemeProviderWrapper>
        <QRCodeList
          qrCodes={mockQRCodes}
          rooms={mockRooms}
          buildings={mockBuildings}
          floors={mockFloors}
          selectedBuildingId="bld1"
          selectedFloorId="flr1"
          onViewQR={mockOnViewQR}
          onDeleteQR={mockOnDeleteQR}
          onAddQR={mockOnAddQR}
        />
      </ThemeProviderWrapper>,
    );

    const addButton = getByText('Add New');
    fireEvent.press(addButton);
    expect(mockOnAddQR).toHaveBeenCalledTimes(1);
  });

  it('calls onViewQR when View button is pressed on a QR code item', () => {
    const { getByTestId } = render(
      <ThemeProviderWrapper>
        <QRCodeList
          qrCodes={mockQRCodes}
          rooms={mockRooms}
          buildings={mockBuildings}
          floors={mockFloors}
          selectedBuildingId="bld1"
          selectedFloorId="flr1"
          onViewQR={mockOnViewQR}
          onDeleteQR={mockOnDeleteQR}
          onAddQR={mockOnAddQR}
        />
      </ThemeProviderWrapper>,
    );

    const viewButton = getByTestId('view-qr-qr1');
    fireEvent.press(viewButton);
    expect(mockOnViewQR).toHaveBeenCalledTimes(1);
    expect(mockOnViewQR).toHaveBeenCalledWith(mockQRCodes[0]);
  });

  it('calls onDeleteQR when Delete button is pressed on a QR code item', () => {
    const { getByTestId } = render(
      <ThemeProviderWrapper>
        <QRCodeList
          qrCodes={mockQRCodes}
          rooms={mockRooms}
          buildings={mockBuildings}
          floors={mockFloors}
          selectedBuildingId="bld1"
          selectedFloorId="flr1"
          onViewQR={mockOnViewQR}
          onDeleteQR={mockOnDeleteQR}
          onAddQR={mockOnAddQR}
        />
      </ThemeProviderWrapper>,
    );

    const deleteButton = getByTestId('delete-qr-qr1');
    fireEvent.press(deleteButton);
    expect(mockOnDeleteQR).toHaveBeenCalledTimes(1);
    expect(mockOnDeleteQR).toHaveBeenCalledWith(mockQRCodes[0]);
  });

  it('handles string comparison correctly for floor filtering', () => {
    // Test with numeric IDs (common in real apps)
    const numericIdQRCodes = [
      {
        id: 'qr1',
        roomId: '101',
        roomName: 'Room 101',
        buildingId: '1',
        buildingName: 'Building 1',
        floorId: '1',
        qrValue: 'qr:loc:1:1:101:abc',
        description: 'Test QR 1',
      },
      {
        id: 'qr2',
        roomId: '201',
        roomName: 'Room 201',
        buildingId: '1',
        buildingName: 'Building 1',
        floorId: '2',
        qrValue: 'qr:loc:1:2:201:def',
        description: 'Test QR 2',
      },
    ];

    const { queryByText } = render(
      <ThemeProviderWrapper>
        <QRCodeList
          qrCodes={numericIdQRCodes}
          rooms={mockRooms}
          buildings={mockBuildings}
          floors={mockFloors}
          selectedBuildingId="1"
          selectedFloorId="1" // Numeric ID as string
          onViewQR={mockOnViewQR}
          onDeleteQR={mockOnDeleteQR}
          onAddQR={mockOnAddQR}
        />
      </ThemeProviderWrapper>,
    );

    // Should only show Room 101
    expect(queryByText('Room 101')).toBeTruthy();
    expect(queryByText('Room 201')).toBeNull();
  });
});
