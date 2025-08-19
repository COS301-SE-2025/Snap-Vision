import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FloorplanSelectionFlow } from '../src/components/organisms/FloorplanSelectionFlow';
import { TouchableOpacity, Text } from 'react-native';

// Mock child components
jest.mock('../src/components/molecules/LocationSelector', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return {
    LocationSelector: ({ locations, selectedLocation, onLocationSelect }: any) => (
      <>
        {locations.map((loc: string) => (
          <TouchableOpacity
            key={loc}
            testID={`location-${loc}`}
            onPress={() => onLocationSelect(loc)}
          >
            <Text>{loc}</Text>
          </TouchableOpacity>
        ))}
      </>
    ),
  };
});

jest.mock('../src/components/molecules/BuildingSelector', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ buildings, selectedBuildingId, setSelectedBuildingId }: any) => (
      <>
        {buildings.map((b: any) => (
          <TouchableOpacity
            key={b.id}
            testID={`building-${b.id}`}
            onPress={() => setSelectedBuildingId(b.id)}
          >
            <Text>{b.name}</Text>
          </TouchableOpacity>
        ))}
      </>
    ),
  };
});

jest.mock('../src/components/molecules/FloorSelector', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ floors, selectedFloorId, setSelectedFloorId }: any) => (
      <>
        {floors.map((f: any) => (
          <TouchableOpacity
            key={f.id}
            testID={`floor-${f.id}`}
            onPress={() => setSelectedFloorId(f.id)}
          >
            <Text>{f.name}</Text>
          </TouchableOpacity>
        ))}
      </>
    ),
  };
});

jest.mock('../src/components/molecules/FloorplanActions', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return {
    FloorplanActions: ({ selectedFloorplan, onEdit, onDelete }: any) => (
      <>
        <TouchableOpacity testID="edit-btn" onPress={onEdit}>
          <Text>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity testID="delete-btn" onPress={onDelete}>
          <Text>Delete</Text>
        </TouchableOpacity>
      </>
    ),
  };
});

// Mock hook
const mockUseAdminFloorplans = {
  locations: ['loc1', 'loc2'],
  buildings: [
    { id: 'b1', name: 'Building 1' },
    { id: 'b2', name: 'Building 2' },
  ],
  floorplans: [
    { id: 'f1', floorLabel: 'Floor 1' },
    { id: 'f2', floorLabel: 'Floor 2' },
  ],
  fetchLocations: jest.fn(),
  fetchBuildings: jest.fn(),
  fetchFloorplans: jest.fn(),
};
jest.mock('../src/hooks/useAdminFloorplans', () => ({
  useAdminFloorplans: () => mockUseAdminFloorplans,
}));

describe('FloorplanSelectionFlow', () => {
  const onEditFloorplan = jest.fn();
  const onDeleteFloorplan = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders location selector and calls fetchLocations', () => {
    render(
      <FloorplanSelectionFlow
        role="admin"
        adminLocations={['loc1', 'loc2']}
        onEditFloorplan={onEditFloorplan}
        onDeleteFloorplan={onDeleteFloorplan}
      />,
    );
    expect(mockUseAdminFloorplans.fetchLocations).toHaveBeenCalled();
  });

  it('shows building selector after location selection', () => {
    const { getByTestId, queryByTestId } = render(
      <FloorplanSelectionFlow
        role="admin"
        adminLocations={['loc1', 'loc2']}
        onEditFloorplan={onEditFloorplan}
        onDeleteFloorplan={onDeleteFloorplan}
      />,
    );
    expect(queryByTestId('building-b1')).toBeNull();
    fireEvent.press(getByTestId('location-loc1'));
    expect(getByTestId('building-b1')).toBeTruthy();
  });

  it('shows floor selector after building selection', () => {
    const { getByTestId } = render(
      <FloorplanSelectionFlow
        role="admin"
        adminLocations={['loc1', 'loc2']}
        onEditFloorplan={onEditFloorplan}
        onDeleteFloorplan={onDeleteFloorplan}
      />,
    );
    fireEvent.press(getByTestId('location-loc1'));
    fireEvent.press(getByTestId('building-b1'));
    expect(getByTestId('floor-f1')).toBeTruthy();
  });

  it('shows actions after floor selection and triggers callbacks', () => {
    const { getByTestId } = render(
      <FloorplanSelectionFlow
        role="admin"
        adminLocations={['loc1', 'loc2']}
        onEditFloorplan={onEditFloorplan}
        onDeleteFloorplan={onDeleteFloorplan}
      />,
    );
    fireEvent.press(getByTestId('location-loc1'));
    fireEvent.press(getByTestId('building-b1'));
    fireEvent.press(getByTestId('floor-f1'));
    expect(getByTestId('edit-btn')).toBeTruthy();
    expect(getByTestId('delete-btn')).toBeTruthy();

    fireEvent.press(getByTestId('edit-btn'));
    expect(onEditFloorplan).toHaveBeenCalledWith({ id: 'f1', floorLabel: 'Floor 1' });

    fireEvent.press(getByTestId('delete-btn'));
    expect(onDeleteFloorplan).toHaveBeenCalledWith({ id: 'f1', floorLabel: 'Floor 1' });
  });
});
