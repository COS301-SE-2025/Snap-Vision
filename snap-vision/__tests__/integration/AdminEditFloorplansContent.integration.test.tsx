import React from 'react';
import { render, waitFor, fireEvent } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import AdminEditFloorplansContent from '../../src/components/organisms/AdminEditFloorplansContent';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import { UserProvider } from '../../src/context/UserContext';

// Mock the hooks
jest.mock('../../src/hooks/useUserRole', () => ({
  useUserRole: jest.fn(),
}));

jest.mock('../../src/hooks/useAdminFloorplans', () => ({
  useAdminFloorplans: jest.fn(),
}));

jest.mock('../../src/components/organisms/FloorplanSelectionFlow', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return {
    FloorplanSelectionFlow: ({ onEditFloorplan, onDeleteFloorplan }: any) => (
      <View>
        <Text testID="floorplan-selection-flow">Floorplan Selection Flow</Text>
        <TouchableOpacity 
          testID="edit-floorplan-button" 
          onPress={() => onEditFloorplan({
            locationId: 'test-location',
            buildingId: 'test-building',
            floorLabel: 'Floor 1',
            downloadURL: 'https://test.com/floorplan.jpg'
          })}
        >
          <Text>Edit Floorplan</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          testID="delete-floorplan-button" 
          onPress={() => onDeleteFloorplan({
            locationId: 'test-location',
            buildingId: 'test-building',
            floorLabel: 'Floor 1',
            downloadURL: 'https://test.com/floorplan.jpg'
          })}
        >
          <Text>Delete Floorplan</Text>
        </TouchableOpacity>
      </View>
    ),
  };
});

// Mock navigation
const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
  isFocused: jest.fn(() => true),
  dangerouslyGetParent: jest.fn(),
};

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => mockNavigation,
  };
});

const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider>
      <UserProvider>
        <NavigationContainer>
          {children}
        </NavigationContainer>
      </UserProvider>
    </ThemeProvider>
  );
};

describe('AdminEditFloorplansContent Integration Tests', () => {
  const mockUseUserRole = require('../../src/hooks/useUserRole').useUserRole;
  const mockUseAdminFloorplans = require('../../src/hooks/useAdminFloorplans').useAdminFloorplans;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockUseUserRole.mockReturnValue({
      role: 'admin',
      adminLocations: ['location1', 'location2'],
      isLoading: false,
    });

    mockUseAdminFloorplans.mockReturnValue({
      isLoading: false,
      error: null,
      deleteFloorplan: jest.fn().mockResolvedValue({ success: true }),
    });
  });

  it('renders the component with all providers', async () => {
    const { getByText, getByTestId } = render(
      <AllTheProviders>
        <AdminEditFloorplansContent />
      </AllTheProviders>
    );

    await waitFor(() => {
      expect(getByText('Edit Floorplans')).toBeTruthy();
      expect(getByTestId('floorplan-selection-flow')).toBeTruthy();
    });
  });

  it('shows loading state when user role is loading', async () => {
    mockUseUserRole.mockReturnValue({
      role: 'admin',
      adminLocations: ['location1', 'location2'],
      isLoading: true,
    });

    const { getByTestId } = render(
      <AllTheProviders>
        <AdminEditFloorplansContent />
      </AllTheProviders>
    );

    await waitFor(() => {
      expect(getByTestId('ActivityIndicator')).toBeTruthy();
    });
  });

  it('shows loading state when floorplan data is loading', async () => {
    mockUseAdminFloorplans.mockReturnValue({
      isLoading: true,
      error: null,
      deleteFloorplan: jest.fn(),
    });

    const { getByTestId } = render(
      <AllTheProviders>
        <AdminEditFloorplansContent />
      </AllTheProviders>
    );

    await waitFor(() => {
      expect(getByTestId('ActivityIndicator')).toBeTruthy();
    });
  });

  it('navigates to floorplan editor when edit is triggered', async () => {
    const { getByTestId } = render(
      <AllTheProviders>
        <AdminEditFloorplansContent />
      </AllTheProviders>
    );

    const editButton = getByTestId('edit-floorplan-button');
    fireEvent.press(editButton);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('AdminFloorplanEditor', {
        locationId: 'test-location',
        buildingId: 'test-building',
        floorLabel: 'Floor 1',
        imageUri: 'https://test.com/floorplan.jpg'
      });
    });
  });

  it('handles successful floorplan deletion', async () => {
    const mockDeleteFloorplan = jest.fn().mockResolvedValue({ success: true });
    mockUseAdminFloorplans.mockReturnValue({
      isLoading: false,
      error: null,
      deleteFloorplan: mockDeleteFloorplan,
    });

    const { getByTestId, getByText } = render(
      <AllTheProviders>
        <AdminEditFloorplansContent />
      </AllTheProviders>
    );

    // Trigger delete
    const deleteButton = getByTestId('delete-floorplan-button');
    fireEvent.press(deleteButton);

    // Confirm delete
    const confirmButton = getByText('Delete');
    fireEvent.press(confirmButton);

    await waitFor(() => {
      expect(mockDeleteFloorplan).toHaveBeenCalled();
      expect(getByText('Floorplan and POIs removed successfully.')).toBeTruthy();
    });
  });

  it('handles failed floorplan deletion', async () => {
    const mockDeleteFloorplan = jest.fn().mockResolvedValue({ 
      success: false, 
      error: 'Deletion failed' 
    });
    mockUseAdminFloorplans.mockReturnValue({
      isLoading: false,
      error: null,
      deleteFloorplan: mockDeleteFloorplan,
    });

    const { getByTestId, getByText } = render(
      <AllTheProviders>
        <AdminEditFloorplansContent />
      </AllTheProviders>
    );

    // Trigger delete
    const deleteButton = getByTestId('delete-floorplan-button');
    fireEvent.press(deleteButton);

    // Confirm delete
    const confirmButton = getByText('Delete');
    fireEvent.press(confirmButton);

    await waitFor(() => {
      expect(mockDeleteFloorplan).toHaveBeenCalled();
      // Error should be handled by the hook, no UI change expected
    });
  });

  it('handles non-admin user role', async () => {
    mockUseUserRole.mockReturnValue({
      role: 'user',
      adminLocations: [],
      isLoading: false,
    });

    mockUseAdminFloorplans.mockReturnValue({
      isLoading: false,
      error: null,
      deleteFloorplan: jest.fn(),
    });

    const { getByText } = render(
      <AllTheProviders>
        <AdminEditFloorplansContent />
      </AllTheProviders>
    );

    await waitFor(() => {
      expect(getByText('Edit Floorplans')).toBeTruthy();
    });
  });

});
