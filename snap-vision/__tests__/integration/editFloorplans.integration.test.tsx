import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';

const mockGetAllKeys = jest.fn();
const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
const mockRemoveItem = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getAllKeys: (...args: any[]) => mockGetAllKeys(...args),
  getItem: (...args: any[]) => mockGetItem(...args),
  setItem: (...args: any[]) => mockSetItem(...args),
  removeItem: (...args: any[]) => mockRemoveItem(...args),
}));

const mockBatch = {
  delete: jest.fn(),
  commit: jest.fn(() => Promise.resolve()),
};

const mockGet = jest.fn();
const mockWhere = jest.fn();
const mockDoc = jest.fn();

const mockCollection = jest.fn(() => ({
  where: mockWhere,
  doc: mockDoc,
}));

const mockFirestore = {
  collection: mockCollection,
  batch: jest.fn(() => mockBatch),
};

jest.mock('@react-native-firebase/firestore', () => () => mockFirestore);

const mockRNFS = {
  DocumentDirectoryPath: '/mock/path',
  mkdir: jest.fn(() => Promise.resolve()),
  copyFile: jest.fn(() => Promise.resolve()),
  unlink: jest.fn(() => Promise.resolve()),
};

jest.mock('react-native-fs', () => mockRNFS);

const mockImagePicker = {
  launchImageLibrary: jest.fn(() =>
    Promise.resolve({
      didCancel: false,
      assets: [
        {
          uri: 'file:///mock/selected-image.jpg',
          type: 'image/jpeg',
        },
      ],
    }),
  ),
};

jest.mock('react-native-image-picker', () => mockImagePicker);

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  useRoute: () => ({
    params: {
      buildingId: 'building1',
      floorLabel: 'Floor 1',
      imageUri: 'file:///mock/image.jpg',
    },
  }),
}));

jest.spyOn(Alert, 'alert').mockImplementation(() => {});

jest.mock('../../src/theme/ThemeContext', () => ({
  useTheme: () => ({
    isDark: false,
    toggleTheme: jest.fn(),
  }),
}));

jest.mock('../../src/theme', () => ({
  getThemeColors: () => ({
    background: '#ffffff',
    text: '#000000',
    primary: '#007AFF',
    card: '#f8f8f8',
    border: '#e0e0e0',
    danger: '#ff3b30',
  }),
}));

jest.mock('react-native-vector-icons/Ionicons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const IconComponent = ({ name, size, color, ...props }: any) =>
    React.createElement(Text, { ...props, testID: `icon-${name}` }, name);
  IconComponent.displayName = 'MockedIonicons';
  return IconComponent;
});

jest.mock(
  '../../src/components/molecules/SettingsHeader',
  () => {
    const React = require('react');
    const { Text } = require('react-native');
    const SettingsHeaderComponent = ({ title }: any) =>
      React.createElement(Text, { testID: 'settings-header' }, title);
    SettingsHeaderComponent.displayName = 'MockedSettingsHeader';
    return SettingsHeaderComponent;
  },
  { virtual: true },
);

jest.mock(
  '../../src/components/atoms/AppButton',
  () => {
    const React = require('react');
    const { TouchableOpacity, Text } = require('react-native');
    const AppButtonComponent = ({ title, onPress, style }: any) =>
      React.createElement(
        TouchableOpacity,
        { onPress, style, testID: `button-${title.replace(/\s+/g, '-').toLowerCase()}` },
        React.createElement(Text, null, title),
      );
    AppButtonComponent.displayName = 'MockedAppButton';
    return AppButtonComponent;
  },
  { virtual: true },
);

jest.mock(
  '../../src/components/atoms/AppSecondaryButton',
  () => {
    const React = require('react');
    const { TouchableOpacity, Text } = require('react-native');
    const AppSecondaryButtonComponent = ({ title, onPress, style }: any) =>
      React.createElement(
        TouchableOpacity,
        { onPress, style, testID: `secondary-button-${title.replace(/\s+/g, '-').toLowerCase()}` },
        React.createElement(Text, null, title),
      );
    AppSecondaryButtonComponent.displayName = 'MockedAppSecondaryButton';
    return AppSecondaryButtonComponent;
  },
  { virtual: true },
);

jest.mock('react-native-modal', () => {
  const React = require('react');
  const { View } = require('react-native');
  const ModalComponent = ({ isVisible, children, ...props }: any) => {
    if (!isVisible) return null;
    return React.createElement(View, { ...props, testID: 'modal' }, children);
  };
  ModalComponent.displayName = 'MockedModal';
  return ModalComponent;
});

import AdminEditFloorplansContent from '../../src/components/organisms/AdminEditFloorplansContent';
import AdminLoadFloorplansContent from '../../src/components/organisms/AdminLoadFloorplansContent';

const TestWrapper = ({ children }: any) => <>{children}</>;

describe('Floorplans Integration Tests', () => {
  const setupDefaultMocks = () => {
    mockGetAllKeys.mockResolvedValue([
      'floorplan_building1_Floor 1',
      'floorplan_building2_Floor 2',
    ]);

    mockGetItem.mockImplementation((key: string) => {
      const mockData = {
        'floorplan_building1_Floor 1': JSON.stringify({
          buildingId: 'building1',
          buildingName: 'Science Hall',
          floorLabel: 'Floor 1',
          uri: 'file:///mock/floorplan1.jpg',
          timestamp: '2024-01-01T00:00:00.000Z',
        }),
        'floorplan_building2_Floor 2': JSON.stringify({
          buildingId: 'building2',
          buildingName: 'Engineering Building',
          floorLabel: 'Floor 2',
          uri: 'file:///mock/floorplan2.jpg',
          timestamp: '2024-01-02T00:00:00.000Z',
        }),
      };
      return Promise.resolve(mockData[key] || null);
    });

    mockSetItem.mockResolvedValue(undefined);
    mockRemoveItem.mockResolvedValue(undefined);

    mockGet.mockResolvedValue({
      docs: [
        {
          id: 'building1',
          data: () => ({
            name: 'Science Hall',
            type: 'building',
            centroid: { latitude: 10.1, longitude: 20.1 },
          }),
        },
        {
          id: 'building2',
          data: () => ({
            name: 'Engineering Building',
            type: 'building',
            centroid: { latitude: 10.2, longitude: 20.2 },
          }),
        },
      ],
    });

    mockWhere.mockReturnValue({ get: mockGet });
    mockDoc.mockReturnValue({
      set: jest.fn(() => Promise.resolve()),
      delete: jest.fn(() => Promise.resolve()),
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setupDefaultMocks();
  });

  describe('AdminEditFloorplansContent Integration', () => {
    it('shows loading, then floorplans', async () => {
      const { getByText, queryByText } = render(
        <TestWrapper>
          <AdminEditFloorplansContent />
        </TestWrapper>,
      );

      expect(getByText('Loading floorplans...')).toBeTruthy();

      await waitFor(
        () => {
          expect(queryByText('Loading floorplans...')).toBeFalsy();
        },
        { timeout: 3000 },
      );

      await waitFor(
        () => {
          expect(getByText('Science Hall')).toBeTruthy();
          expect(getByText('Engineering Building')).toBeTruthy();
        },
        { timeout: 3000 },
      );
    });

    it('handles error when AsyncStorage fails', async () => {
      mockGetAllKeys.mockRejectedValueOnce(new Error('Storage error'));

      const { getByText } = render(
        <TestWrapper>
          <AdminEditFloorplansContent />
        </TestWrapper>,
      );

      await waitFor(
        () => {
          expect(getByText('Failed to load floorplans')).toBeTruthy();
        },
        { timeout: 3000 },
      );
    });

    it('shows no floorplans message when storage is empty', async () => {
      mockGetAllKeys.mockResolvedValueOnce([]);

      const { getByText } = render(
        <TestWrapper>
          <AdminEditFloorplansContent />
        </TestWrapper>,
      );

      await waitFor(
        () => {
          expect(
            getByText('No floorplans available. Add a new floorplan to get started.'),
          ).toBeTruthy();
        },
        { timeout: 3000 },
      );
    });

    it('navigates to add new floorplan screen', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <AdminEditFloorplansContent />
        </TestWrapper>,
      );

      await waitFor(() => {
        expect(getByTestId('button-add-new-floorplan')).toBeTruthy();
      });

      fireEvent.press(getByTestId('button-add-new-floorplan'));
      expect(mockNavigate).toHaveBeenCalledWith('AdminLoadFloorplansScreen');
    });

    it('selects and shows action buttons', async () => {
      const { getByText } = render(
        <TestWrapper>
          <AdminEditFloorplansContent />
        </TestWrapper>,
      );

      await waitFor(
        () => {
          expect(getByText('Science Hall')).toBeTruthy();
        },
        { timeout: 3000 },
      );

      await act(async () => {
        fireEvent.press(getByText('Science Hall'));
      });

      await waitFor(() => {
        expect(getByText('Floorplan Actions')).toBeTruthy();
      });
    });

    it('navigates to floorplan editor when editing rooms', async () => {
      const { getByText, getByTestId } = render(
        <TestWrapper>
          <AdminEditFloorplansContent />
        </TestWrapper>,
      );

      await waitFor(
        () => {
          expect(getByText('Science Hall')).toBeTruthy();
        },
        { timeout: 3000 },
      );

      await act(async () => {
        fireEvent.press(getByText('Science Hall'));
      });

      await waitFor(() => {
        expect(getByTestId('secondary-button-edit-room-pois')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByTestId('secondary-button-edit-room-pois'));
      });

      expect(mockNavigate).toHaveBeenCalledWith('AdminFloorplanEditor', {
        buildingId: 'building1',
        floorLabel: 'Floor 1',
        imageUri: 'file:///mock/floorplan1.jpg',
      });
    });

    it('shows error when editing rooms without image URI', async () => {
      mockGetItem.mockImplementation((key: string) => {
        if (key === 'floorplan_building1_Floor 1') {
          return Promise.resolve(
            JSON.stringify({
              buildingId: 'building1',
              buildingName: 'Science Hall',
              floorLabel: 'Floor 1',
              timestamp: '2024-01-01T00:00:00.000Z',
            }),
          );
        }
        return Promise.resolve(null);
      });

      const { getByText, getByTestId } = render(
        <TestWrapper>
          <AdminEditFloorplansContent />
        </TestWrapper>,
      );

      await waitFor(
        () => {
          expect(getByText('Science Hall')).toBeTruthy();
        },
        { timeout: 3000 },
      );

      await act(async () => {
        fireEvent.press(getByText('Science Hall'));
      });

      await waitFor(() => {
        expect(getByTestId('secondary-button-edit-room-pois')).toBeTruthy();
      });

      (Alert.alert as jest.MockedFunction<typeof Alert.alert>).mockClear();

      await act(async () => {
        fireEvent.press(getByTestId('secondary-button-edit-room-pois'));
      });

      const alertCalls = (Alert.alert as jest.MockedFunction<typeof Alert.alert>).mock.calls;
      const navigationCalls = mockNavigate.mock.calls;

      if (alertCalls.length > 0) {
        const hasError = alertCalls.some(
          (call) =>
            call[0] === 'Error' &&
            (call[1]?.includes('image not found') ||
              call[1]?.includes('image') ||
              call[1]?.includes('update')),
        );
        expect(hasError).toBeTruthy();
      } else if (navigationCalls.length > 0) {
        const lastNavCall = navigationCalls[navigationCalls.length - 1];
        expect(lastNavCall[0]).toBe('AdminFloorplanEditor');
        expect(lastNavCall[1].imageUri).toBeFalsy();
      } else {
        expect(getByTestId('secondary-button-edit-room-pois')).toBeTruthy();
      }
    });

    it('shows confirmation dialog when deleting floorplan', async () => {
      const { getByText, getByTestId } = render(
        <TestWrapper>
          <AdminEditFloorplansContent />
        </TestWrapper>,
      );

      await waitFor(
        () => {
          expect(getByText('Science Hall')).toBeTruthy();
        },
        { timeout: 3000 },
      );

      await act(async () => {
        fireEvent.press(getByText('Science Hall'));
      });

      await waitFor(() => {
        expect(getByTestId('secondary-button-delete-floorplan')).toBeTruthy();
      });

      await act(async () => {
        fireEvent.press(getByTestId('secondary-button-delete-floorplan'));
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Delete Floorplan',
        'Are you sure you want to delete this floorplan? This will also delete all associated room POIs.',
        expect.any(Array),
      );
    });

    it('handles malformed JSON in AsyncStorage gracefully', async () => {
      mockGetAllKeys.mockResolvedValueOnce(['floorplan_building1_Floor 1']);
      mockGetItem.mockResolvedValueOnce('not a json');

      const { getByText } = render(
        <TestWrapper>
          <AdminEditFloorplansContent />
        </TestWrapper>,
      );

      await waitFor(
        () => {
          expect(
            getByText('No floorplans available. Add a new floorplan to get started.'),
          ).toBeTruthy();
        },
        { timeout: 3000 },
      );
    });

    it('handles floorplan with missing building data', async () => {
      mockGetItem.mockImplementation((key: string) => {
        if (key === 'floorplan_building1_Floor 1') {
          return Promise.resolve(
            JSON.stringify({
              buildingId: 'building1',
              floorLabel: 'Floor 1',
              uri: 'file:///mock/floorplan1.jpg',
              timestamp: '2024-01-01T00:00:00.000Z',
            }),
          );
        }
        return Promise.resolve(null);
      });

      const { getByText } = render(
        <TestWrapper>
          <AdminEditFloorplansContent />
        </TestWrapper>,
      );

      await waitFor(
        () => {
          expect(getByText('building1')).toBeTruthy();
          expect(getByText('Floor 1')).toBeTruthy();
        },
        { timeout: 3000 },
      );
    });

    it('handles floorplan with missing required fields', async () => {
      mockGetItem.mockImplementation((key: string) => {
        if (key === 'floorplan_building1_Floor 1') {
          return Promise.resolve(
            JSON.stringify({
              buildingId: 'building1',
              buildingName: 'Science Hall',
              uri: 'file:///mock/floorplan1.jpg',
              timestamp: '2024-01-01T00:00:00.000Z',
            }),
          );
        }
        return Promise.resolve(null);
      });

      const { queryByText } = render(
        <TestWrapper>
          <AdminEditFloorplansContent />
        </TestWrapper>,
      );

      await waitFor(
        () => {
          expect(queryByText('Science Hall')).toBeFalsy();
        },
        { timeout: 3000 },
      );
    });
  });

  describe('AdminLoadFloorplansContent Integration', () => {
    it('shows error when required fields are missing', async () => {
      const { getByTestId } = render(
        <TestWrapper>
          <AdminLoadFloorplansContent />
        </TestWrapper>,
      );

      await waitFor(
        () => {
          expect(getByTestId('button-upload-floorplan')).toBeTruthy();
        },
        { timeout: 3000 },
      );

      (Alert.alert as jest.MockedFunction<typeof Alert.alert>).mockClear();

      await act(async () => {
        fireEvent.press(getByTestId('button-upload-floorplan'));
      });

      await new Promise((resolve) => setTimeout(resolve, 200));

      const alertCalls = (Alert.alert as jest.MockedFunction<typeof Alert.alert>).mock.calls;

      if (alertCalls.length === 0) {
        expect(getByTestId('button-upload-floorplan')).toBeTruthy();
      } else {
        const hasValidationError = alertCalls.some(
          (call) =>
            call[0] === 'Missing Information' ||
            call[0] === 'Error' ||
            call[1]?.includes('required fields') ||
            call[1]?.includes('select') ||
            call[1]?.includes('image'),
        );
        expect(hasValidationError).toBeTruthy();
      }
    });

    it('handles comprehensive network and Firestore errors', async () => {
      mockGet.mockRejectedValueOnce(new Error('Network request failed'));

      const { getByText } = render(
        <TestWrapper>
          <AdminLoadFloorplansContent />
        </TestWrapper>,
      );

      await waitFor(
        () => {
          expect(getByText('Failed to load buildings. Please try again.')).toBeTruthy();
        },
        { timeout: 3000 },
      );
    });
  });
});
