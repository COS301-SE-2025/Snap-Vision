import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AdminEditFloorplansContent from '../../src/components/organisms/AdminEditFloorplansContent';

// Mocks
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

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

jest.mock('../src/components/molecules/SettingsHeader', () => {
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => <Text>{props.title}</Text>,
  };
});

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
              downloadURL: 'url',
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

jest.mock('../src/components/atoms/StandardPopup', () => {
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

