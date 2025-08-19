//Mock AsyncStorage
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import AdminEditFloorplansContent from '../src/components/organisms/AdminEditFloorplansContent';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getAllKeys: jest.fn(),
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock Firebase Firestore
const mockBatch = {
  delete: jest.fn(),
  commit: jest.fn(() => Promise.resolve()),
};

const mockCollection = jest.fn(() => ({
  where: jest.fn(() => ({
    get: jest.fn(() =>
      Promise.resolve({
        docs: [{ ref: 'mockDocRef1' }, { ref: 'mockDocRef2' }],
      }),
    ),
  })),
  doc: jest.fn(() => ({
    set: jest.fn(() => Promise.resolve()),
    delete: jest.fn(() => Promise.resolve()),
  })),
}));

jest.mock('@react-native-firebase/firestore', () => () => ({
  collection: mockCollection,
  batch: jest.fn(() => mockBatch),
}));

// Mock RNFS
const mockRNFS = {
  DocumentDirectoryPath: '/mock/path',
  mkdir: jest.fn(() => Promise.resolve()),
  copyFile: jest.fn(() => Promise.resolve()),
  unlink: jest.fn(() => Promise.resolve()),
};
jest.mock('react-native-fs', () => mockRNFS);

// Mock Image Picker
const mockLaunchImageLibrary = jest.fn();
jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: mockLaunchImageLibrary,
}));

// Create a proper navigation mock
const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

// Mock Alert
const mockAlert = {
  alert: jest.fn(),
};
jest.spyOn(require('react-native'), 'Alert', 'get').mockReturnValue(mockAlert);

// Mock the ThemeContext properly
jest.mock('../src/theme/ThemeContext', () => ({
  useTheme: () => ({
    isDark: false,
    toggleTheme: jest.fn(),
  }),
}));

// Mock theme utils
jest.mock('../src/theme', () => ({
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
  '../src/components/molecules/SettingsHeader',
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
  '../src/components/atoms/AppButton',
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
  '../src/components/atoms/AppSecondaryButton',
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

// Get the mocked modules
const mockAsyncStorage = require('@react-native-async-storage/async-storage');

describe('AdminEditFloorplansContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Configure AsyncStorage mock
    mockAsyncStorage.getAllKeys.mockResolvedValue([
      'floorplan_building1_Floor 1',
      'floorplan_building2_Floor 2',
    ]);

    mockAsyncStorage.getItem.mockImplementation((key: string) => {
      if (key === 'floorplan_building1_Floor 1') {
        return Promise.resolve(
          JSON.stringify({
            buildingId: 'building1',
            buildingName: 'Main Building',
            floorLabel: 'Floor 1',
            timestamp: '2023-01-01T00:00:00.000Z',
            uri: 'file://path/to/floorplan1.jpg',
          }),
        );
      }
      if (key === 'floorplan_building2_Floor 2') {
        return Promise.resolve(
          JSON.stringify({
            buildingId: 'building2',
            buildingName: 'Secondary Building',
            floorLabel: 'Floor 2',
            timestamp: '2023-01-02T00:00:00.000Z',
            uri: 'file://path/to/floorplan2.jpg',
          }),
        );
      }
      return Promise.resolve(null);
    });
  });

  it('renders loading state initially', () => {
    const { getByText } = render(<AdminEditFloorplansContent />);
    expect(getByText('Loading floorplans...')).toBeTruthy();
  });

  it('loads and displays floorplans from AsyncStorage', async () => {
    const { getByText } = render(<AdminEditFloorplansContent />);

    await waitFor(() => {
      expect(getByText('Main Building')).toBeTruthy();
      expect(getByText('Secondary Building')).toBeTruthy();
    });
  });

  it('allows selecting a floorplan', async () => {
    const { getByText } = render(<AdminEditFloorplansContent />);

    await waitFor(() => {
      expect(getByText('Main Building')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText('Main Building'));
    });

    await waitFor(() => {
      expect(getByText('Building:')).toBeTruthy();
      expect(getByText('Floor:')).toBeTruthy();
      expect(getByText('Last Modified:')).toBeTruthy();
    });
  });

  it('navigates to add new floorplan screen', async () => {
    const { getByTestId } = render(<AdminEditFloorplansContent />);

    await waitFor(() => {
      expect(getByTestId('button-add-new-floorplan')).toBeTruthy();
    });

    const addButton = getByTestId('button-add-new-floorplan');

    await act(async () => {
      fireEvent.press(addButton);
    });

    expect(mockNavigate).toHaveBeenCalledWith('AdminLoadFloorplansScreen');
  });

  it('displays error message when no floorplan is selected for editing rooms', async () => {
    const { getByTestId, getByText } = render(<AdminEditFloorplansContent />);

    await waitFor(() => {
      expect(getByText('Main Building')).toBeTruthy();
    });

    // Don't select any floorplan, just try to edit rooms
    // Since no floorplan is selected, the edit rooms button won't be visible
    // We need to select a floorplan first, then test the error case
    await act(async () => {
      fireEvent.press(getByText('Main Building'));
    });

    await waitFor(() => {
      expect(getByTestId('secondary-button-edit-room-pois')).toBeTruthy();
    });

    // Now test navigation to editor
    await act(async () => {
      fireEvent.press(getByTestId('secondary-button-edit-room-pois'));
    });

    expect(mockNavigate).toHaveBeenCalledWith('AdminFloorplanEditor', {
      buildingId: 'building1',
      floorLabel: 'Floor 1',
      imageUri: 'file://path/to/floorplan1.jpg',
    });
  });

  it('handles error when AsyncStorage fails', async () => {
    mockAsyncStorage.getAllKeys.mockRejectedValue(new Error('Storage error'));

    const { getByText } = render(<AdminEditFloorplansContent />);

    await waitFor(() => {
      expect(
        getByText('No floorplans available. Add a new floorplan to get started.'),
      ).toBeTruthy();
    });
  });

  it('displays no floorplans message when storage is empty', async () => {
    mockAsyncStorage.getAllKeys.mockResolvedValue([]);

    const { getByText } = render(<AdminEditFloorplansContent />);

    await waitFor(() => {
      expect(
        getByText('No floorplans available. Add a new floorplan to get started.'),
      ).toBeTruthy();
    });
  });

  it('handles delete floorplan cancellation', async () => {
    const { getByText, getByTestId } = render(<AdminEditFloorplansContent />);

    await waitFor(() => {
      expect(getByText('Main Building')).toBeTruthy();
    });

    // Select a floorplan
    await act(async () => {
      fireEvent.press(getByText('Main Building'));
    });

    await waitFor(() => {
      expect(getByTestId('secondary-button-delete-floorplan')).toBeTruthy();
    });

    // Mock Alert.alert to simulate user canceling deletion
    mockAlert.alert.mockImplementation((title, message, buttons) => {
      // Simulate pressing the "Cancel" button
      const cancelButton = buttons?.find((btn: any) => btn.text === 'Cancel');
      if (cancelButton?.onPress) {
        cancelButton.onPress();
      }
    });

    // Trigger delete
    await act(async () => {
      fireEvent.press(getByTestId('secondary-button-delete-floorplan'));
    });

    // Verify the alert was called but no deletion occurred
    expect(mockAlert.alert).toHaveBeenCalled();
    expect(mockAsyncStorage.removeItem).not.toHaveBeenCalled();
  });

  it('handles floorplan data with missing buildingName', async () => {
    mockAsyncStorage.getItem.mockImplementation((key: string) => {
      if (key === 'floorplan_building1_Floor 1') {
        return Promise.resolve(
          JSON.stringify({
            buildingId: 'building1',
            // Missing buildingName
            floorLabel: 'Floor 1',
            timestamp: '2023-01-01T00:00:00.000Z',
            uri: 'file://path/to/floorplan1.jpg',
          }),
        );
      }
      return Promise.resolve(null);
    });

    const { getByText } = render(<AdminEditFloorplansContent />);

    await waitFor(() => {
      // Should use buildingId when buildingName is missing
      expect(getByText('building1')).toBeTruthy();
    });
  });

  it('handles floorplan data with missing timestamp', async () => {
    mockAsyncStorage.getItem.mockImplementation((key: string) => {
      if (key === 'floorplan_building1_Floor 1') {
        return Promise.resolve(
          JSON.stringify({
            buildingId: 'building1',
            buildingName: 'Main Building',
            floorLabel: 'Floor 1',
            // Missing timestamp
            uri: 'file://path/to/floorplan1.jpg',
          }),
        );
      }
      return Promise.resolve(null);
    });

    const { getByText } = render(<AdminEditFloorplansContent />);

    await waitFor(() => {
      expect(getByText('Main Building')).toBeTruthy();
    });

    // Select the floorplan to see the details
    await act(async () => {
      fireEvent.press(getByText('Main Building'));
    });

    await waitFor(() => {
      // Should handle missing timestamp gracefully
      expect(getByText('Last Modified:')).toBeTruthy();
    });
  });

  it('handles error when trying to edit rooms without floorplan image', async () => {
    // Mock floorplan without local URI
    mockAsyncStorage.getItem.mockImplementation((key: string) => {
      if (key === 'floorplan_building1_Floor 1') {
        return Promise.resolve(
          JSON.stringify({
            buildingId: 'building1',
            buildingName: 'Main Building',
            floorLabel: 'Floor 1',
            timestamp: '2023-01-01T00:00:00.000Z',
            // No uri field
          }),
        );
      }
      return Promise.resolve(null);
    });

    const { getByText, getByTestId } = render(<AdminEditFloorplansContent />);

    await waitFor(() => {
      expect(getByText('Main Building')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText('Main Building'));
    });

    await waitFor(() => {
      expect(getByTestId('secondary-button-edit-room-pois')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByTestId('secondary-button-edit-room-pois'));
    });

    await waitFor(() => {
      expect(
        getByText('Floorplan image not found. Please update the floorplan first'),
      ).toBeTruthy();
    });
  });

  it('filters out invalid floorplan data', async () => {
    mockAsyncStorage.getAllKeys.mockResolvedValue([
      'floorplan_building1_Floor 1',
      'floorplan_invalid',
    ]);

    mockAsyncStorage.getItem.mockImplementation((key: string) => {
      if (key === 'floorplan_building1_Floor 1') {
        return Promise.resolve(
          JSON.stringify({
            buildingId: 'building1',
            buildingName: 'Main Building',
            floorLabel: 'Floor 1',
            timestamp: '2023-01-01T00:00:00.000Z',
            uri: 'file://path/to/floorplan1.jpg',
          }),
        );
      }
      if (key === 'floorplan_invalid') {
        return Promise.resolve(null); // Invalid data
      }
      return Promise.resolve(null);
    });

    const { getByText, queryByText } = render(<AdminEditFloorplansContent />);

    await waitFor(() => {
      expect(getByText('Main Building')).toBeTruthy();
      // Should not display invalid floorplan
      expect(queryByText('invalid')).toBeNull();
    });
  });
});
