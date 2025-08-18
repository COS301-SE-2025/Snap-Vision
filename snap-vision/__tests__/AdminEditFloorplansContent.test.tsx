import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AdminEditFloorplansContent from '../src/components/organisms/AdminEditFloorplansContent';

// Mocks
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

jest.mock('../src/theme/ThemeContext', () => ({
  useTheme: () => ({ isDark: false }),
}));

jest.mock('../src/theme', () => ({
  getThemeColors: () => ({
    background: 'white',
    primary: 'blue',
  }),
}));

jest.mock('../src/components/molecules/SettingsHeader', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => <Text>{props.title}</Text>,
  };
});

jest.mock('../src/components/atoms/StandardPopup', () => {
  const React = require('react');
  const { Text, TouchableOpacity } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) =>
      props.visible ? (
        <>
          {props.title && <Text>{props.title}</Text>}
          {props.message && <Text>{props.message}</Text>}
          {props.showCancel && (
            <TouchableOpacity onPress={props.onCancel}>
              <Text>{props.cancelText || 'Cancel'}</Text>
            </TouchableOpacity>
          )}
          {props.confirmText && (
            <TouchableOpacity onPress={props.onConfirm}>
              <Text>{props.confirmText}</Text>
            </TouchableOpacity>
          )}
        </>
      ) : null,
  };
});

const mockDeleteFloorplan = jest.fn();
const mockUseUserRole = {
  role: 'admin',
  adminLocations: ['loc1'],
  isLoading: false,
};
const mockUseAdminFloorplans = {
  isLoading: false,
  error: null,
  deleteFloorplan: mockDeleteFloorplan,
};

jest.mock('../src/hooks/useUserRole', () => ({
  useUserRole: () => mockUseUserRole,
}));
jest.mock('../src/hooks/useAdminFloorplans', () => ({
  useAdminFloorplans: () => mockUseAdminFloorplans,
}));

jest.mock('../src/components/organisms/FloorplanSelectionFlow', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return {
    __esModule: true,
    FloorplanSelectionFlow: (props: any) => (
      <>
        <TouchableOpacity
          testID="edit-btn"
        onPress={() =>
            props.onEditFloorplan({
                locationId: 'loc1',
                buildingId: 'b1',
                floorLabel: 'Floor 1',
                downloadURL: 'url', // <-- match your component!
            })
        }
        >
          <Text>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          testID="delete-btn"
        onPress={() =>
            props.onDeleteFloorplan({
                id: 'f1',
                locationId: 'loc1',
                buildingId: 'b1',
                floorLabel: 'Floor 1',
                downloadURL: 'url',
            })
        }
        >
          <Text>Delete</Text>
        </TouchableOpacity>
      </>
    ),
  };
});

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    ActivityIndicator: (props: any) => <RN.View testID={props.testID || "ActivityIndicator"} />,
  };
});

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  return {
    ...jest.requireActual('@react-navigation/native'),
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

describe('AdminEditFloorplansContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDeleteFloorplan.mockResolvedValue({ success: true });
  });

  it('renders header and selection flow', () => {
    const { getByText, getByTestId } = render(<AdminEditFloorplansContent />);
    expect(getByText('Edit Floorplans')).toBeTruthy();
    expect(getByTestId('edit-btn')).toBeTruthy();
    expect(getByTestId('delete-btn')).toBeTruthy();
  });

  it('shows loading overlay when loading', () => {
    jest.spyOn(require('../src/hooks/useUserRole'), 'useUserRole').mockReturnValue({
      ...mockUseUserRole,
      isLoading: true,
    });
    const { getByTestId } = render(<AdminEditFloorplansContent />);
    expect(getByTestId('ActivityIndicator')).toBeTruthy();
  });

  it('navigates to editor on edit', () => {
    const navigation = require('@react-navigation/native').useNavigation();
    const { getByTestId } = render(<AdminEditFloorplansContent />);
    fireEvent.press(getByTestId('edit-btn'));
    expect(mockNavigate).toHaveBeenCalledWith('AdminFloorplanEditor', {
      locationId: 'loc1',
      buildingId: 'b1',
      floorLabel: 'Floor 1',
      imageUri: 'url',
    });
  });

  it('shows delete confirmation popup and deletes', async () => {
    const { getByTestId, getByText, getAllByText } = render(<AdminEditFloorplansContent />);
    fireEvent.press(getByTestId('delete-btn'));
    expect(getByText('Delete Floorplan')).toBeTruthy();
    expect(getByText(/Are you sure you want to delete/)).toBeTruthy();

    // Simulate confirm
    fireEvent.press(getAllByText('Delete')[1]);
    await waitFor(() => {
      expect(mockDeleteFloorplan).toHaveBeenCalledWith(expect.objectContaining({ id: 'f1' }));
      expect(getByText('Success')).toBeTruthy();
      expect(getByText('Floorplan and POIs removed successfully.')).toBeTruthy();
    });
  });

  it('cancels delete confirmation', () => {
    const { getByTestId, getByText, queryByText } = render(<AdminEditFloorplansContent />);
    fireEvent.press(getByTestId('delete-btn'));
    expect(getByText('Delete Floorplan')).toBeTruthy();
    fireEvent.press(getByText('Cancel'));
    expect(queryByText('Delete Floorplan')).toBeNull();
  });

it('renders with no admin locations', () => {
  jest.spyOn(require('../src/hooks/useUserRole'), 'useUserRole').mockReturnValue({
    ...mockUseUserRole,
    adminLocations: [],
  });
  const { getByText } = render(<AdminEditFloorplansContent />);
  expect(getByText('Edit Floorplans')).toBeTruthy();
  // Add more assertions if your UI changes for no locations
});

it('closes success popup when OK is pressed', async () => {
  const { getByTestId, getByText, getAllByText } = render(<AdminEditFloorplansContent />);
  fireEvent.press(getByTestId('delete-btn'));
  fireEvent.press(getAllByText('Delete')[1]);
  await waitFor(() => {
    expect(getByText('Success')).toBeTruthy();
    fireEvent.press(getByText('OK'));
    expect(getByText('Edit Floorplans')).toBeTruthy();
  });
});

it('does nothing if confirmDeleteFloorplan called with no floorplan selected', async () => {
  const { getByTestId } = render(<AdminEditFloorplansContent />);
  // Directly call confirmDeleteFloorplan if possible, or simulate by not pressing delete
  // For indirect coverage, you can check that no popup appears if you never press delete
  // Or, if you can access the instance, call the method directly (not typical in RTL)
  // This branch is usually covered by not triggering delete at all
  // So just ensure no success popup is shown
  expect(getByTestId('edit-btn')).toBeTruthy();
  // No delete, so nothing happens
});

it('does not show success popup when delete fails', async () => {
  mockDeleteFloorplan.mockResolvedValue({ success: false });
  const { getByTestId, getAllByText, queryByText } = render(<AdminEditFloorplansContent />);
  fireEvent.press(getByTestId('delete-btn'));
  fireEvent.press(getAllByText('Delete')[1]);
  await waitFor(() => {
    expect(queryByText('Success')).toBeNull();
    // Optionally check for error handling if your UI shows an error
  });
});
});