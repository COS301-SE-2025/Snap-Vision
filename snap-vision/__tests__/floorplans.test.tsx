import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert, View } from 'react-native';
import AdminEditFloorplansContent from '../src/components/organisms/AdminEditFloorplansContent';
import AdminLoadFloorplansContent from '../src/components/organisms/AdminLoadFloorplansContent';
import AdminFloorplanEditorContent from '../src/components/organisms/AdminFloorplanEditorContent';
import { ThemeProviderWrapper } from './test-utils/ThemeProviderWrapper';

// Mock AsyncStorage
const mockAsyncStorage = {
  getAllKeys: jest.fn(),
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Mock Firebase Firestore
const mockFirestore = {
  collection: jest.fn(() => ({
    where: jest.fn(() => ({
      get: jest.fn(() =>
        Promise.resolve({
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
        }),
      ),
    })),
    doc: jest.fn(() => ({
      set: jest.fn(() => Promise.resolve()),
      delete: jest.fn(() => Promise.resolve()),
    })),
  })),
  batch: jest.fn(() => ({
    delete: jest.fn(),
    commit: jest.fn(() => Promise.resolve()),
  })),
};
jest.mock('@react-native-firebase/firestore', () => () => mockFirestore);

// Mock RNFS
const mockRNFS = {
  DocumentDirectoryPath: '/mock/path',
  mkdir: jest.fn(() => Promise.resolve()),
  copyFile: jest.fn(() => Promise.resolve()),
  unlink: jest.fn(() => Promise.resolve()),
};
jest.mock('react-native-fs', () => mockRNFS);

// Mock Image Picker
const mockImagePicker = {
  launchImageLibrary: jest.fn(),
};
jest.mock('react-native-image-picker', () => mockImagePicker);

// Mock navigation
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

// Mock WebView
// Mock WebView
const mockInjectJavaScript = jest.fn();
jest.mock('react-native-webview', () => {
  const React = require('react');
  const { forwardRef, useImperativeHandle } = React;
  const { View } = require('react-native');

  const WebView = forwardRef((props: any, ref: any) => {
    useImperativeHandle(ref, () => ({
      injectJavaScript: mockInjectJavaScript,
    }));
    return React.createElement(View, { ...props, testID: 'mocked-webview' });
  });
  WebView.displayName = 'WebView'; // Add display name
  return { WebView };
});
// Mock vector icons
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

// Mock Modal
// Mock Modal
jest.mock('react-native-modal', () => {
  const React = require('react');
  const { View } = require('react-native');

  const Modal = ({ isVisible, children, ...props }: any) => {
    if (!isVisible) return null;
    return React.createElement(View, { ...props, testID: 'modal' }, children);
  };
  Modal.displayName = 'Modal'; // Add display name
  return Modal;
});

// Spy on Alert
const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('AdminEditFloorplansContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy.mockClear();

    mockAsyncStorage.getAllKeys.mockResolvedValue([
      'floorplan_building1_Floor_1',
      'floorplan_building2_Floor_2',
    ]);
    mockAsyncStorage.getItem.mockImplementation((key) => {
      if (key === 'floorplan_building1_Floor_1') {
        return Promise.resolve(
          JSON.stringify({
            buildingId: 'building1',
            buildingName: 'Science Hall',
            floorLabel: 'Floor 1',
            uri: 'file:///mock/floorplan1.jpg',
            timestamp: '2024-01-01T00:00:00.000Z',
          }),
        );
      }
      if (key === 'floorplan_building2_Floor_2') {
        return Promise.resolve(
          JSON.stringify({
            buildingId: 'building2',
            buildingName: 'Engineering Building',
            floorLabel: 'Floor 2',
            uri: 'file:///mock/floorplan2.jpg',
            timestamp: '2024-01-02T00:00:00.000Z',
          }),
        );
      }
      return Promise.resolve(null);
    });
  });

  it('navigates to add new floorplan screen', async () => {
    const { getByText } = render(
      <ThemeProviderWrapper>
        <AdminEditFloorplansContent />
      </ThemeProviderWrapper>,
    );

    await waitFor(() => {
      expect(getByText('Add New Floorplan')).toBeTruthy();
    });

    fireEvent.press(getByText('Add New Floorplan'));
    expect(mockNavigate).toHaveBeenCalledWith('AdminLoadFloorplansScreen');
  });
});

describe('AdminLoadFloorplansContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy.mockClear();
  });

  it('renders upload form with all sections', async () => {
    const { getByText, getByPlaceholderText } = render(
      <ThemeProviderWrapper>
        <AdminLoadFloorplansContent />
      </ThemeProviderWrapper>,
    );

    await waitFor(() => {
      expect(getByText('Step 1: Select Building')).toBeTruthy();
      expect(getByText('Step 2: Floor Information')).toBeTruthy();
      expect(getByText('Step 3: Select Floorplan File')).toBeTruthy();
      expect(getByPlaceholderText("Enter the building's name")).toBeTruthy();
      expect(getByPlaceholderText('e.g., Floor 2, Basement')).toBeTruthy();
    });
  });

  //it('loads and displays buildings from Firestore', async () => {
  //   const { getByText } = render(
  //     <ThemeProviderWrapper>
  //       <AdminLoadFloorplansContent />
  //     </ThemeProviderWrapper>,
  //   );

  //   await waitFor(() => {
  //     expect(getByText('Science Hall')).toBeTruthy();
  //     expect(getByText('Engineering Building')).toBeTruthy();
  //   });
  // });

  it('allows manual building name entry', async () => {
    const { getByPlaceholderText } = render(
      <ThemeProviderWrapper>
        <AdminLoadFloorplansContent />
      </ThemeProviderWrapper>,
    );

    const buildingInput = getByPlaceholderText("Enter the building's name");
    fireEvent.changeText(buildingInput, 'Custom Building');

    expect(buildingInput.props.value).toBe('Custom Building');
  });

  it('allows floor label entry', async () => {
    const { getByPlaceholderText } = render(
      <ThemeProviderWrapper>
        <AdminLoadFloorplansContent />
      </ThemeProviderWrapper>,
    );

    const floorInput = getByPlaceholderText('e.g., Floor 2, Basement');
    fireEvent.changeText(floorInput, 'Ground Floor');

    expect(floorInput.props.value).toBe('Ground Floor');
  });
});

describe('AdminFloorplanEditorContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy.mockClear();

    const mockGet = jest.fn().mockResolvedValue({
      docs: [
        {
          data: () => ({
            id: 'room1',
            name: 'Room 101',
            buildingId: 'building1',
            floorId: 'Floor 1',
            coordinates: { x: 0.5, y: 0.5 },
            type: 'classroom',
            description: 'Test room',
          }),
        },
      ],
    });

    const mockWhere = jest.fn().mockReturnValue({
      get: mockGet,
    });

    const mockDoc = jest.fn(() => ({
      set: jest.fn(() => Promise.resolve()),
      delete: jest.fn(() => Promise.resolve()),
    }));

    mockFirestore.collection = jest.fn(() => ({
      where: mockWhere,
      doc: mockDoc,
    }));
  });

  it('renders floorplan editor with header and footer', async () => {
    const { getByText } = render(
      <ThemeProviderWrapper>
        <AdminFloorplanEditorContent />
      </ThemeProviderWrapper>,
    );

    await waitFor(() => {
      expect(getByText('Add Room POIs - Floor 1')).toBeTruthy();
      expect(
        getByText('Tap on the floorplan to add rooms or tap existing markers to edit'),
      ).toBeTruthy();
      expect(getByText('Done')).toBeTruthy();
    });
  });

  it('handles WebView message for adding new marker', async () => {
    const { getByTestId } = render(
      <ThemeProviderWrapper>
        <AdminFloorplanEditorContent />
      </ThemeProviderWrapper>,
    );

    const webView = getByTestId('mocked-webview');

    await act(async () => {
      fireEvent(webView, 'message', {
        nativeEvent: {
          data: JSON.stringify({
            type: 'add_marker',
            x: 0.3,
            y: 0.7,
          }),
        },
      });
    });

    await waitFor(() => {
      expect(getByTestId('modal')).toBeTruthy();
    });
  });

  it('shows error when room name is empty', async () => {
    const { getByTestId, getByText } = render(
      <ThemeProviderWrapper>
        <AdminFloorplanEditorContent />
      </ThemeProviderWrapper>,
    );

    const webView = getByTestId('mocked-webview');

    await act(async () => {
      fireEvent(webView, 'message', {
        nativeEvent: {
          data: JSON.stringify({
            type: 'add_marker',
            x: 0.3,
            y: 0.7,
          }),
        },
      });
    });

    await waitFor(() => {
      expect(getByTestId('modal')).toBeTruthy();
    });

    const saveButton = getByText('Save');
    await act(async () => {
      fireEvent.press(saveButton);
    });

    expect(Alert.alert).toHaveBeenCalledWith('Error', 'Room name is required');
  });

  it('navigates back when Done is pressed', async () => {
    const { getByText } = render(
      <ThemeProviderWrapper>
        <AdminFloorplanEditorContent />
      </ThemeProviderWrapper>,
    );

    await waitFor(() => {
      expect(getByText('Done')).toBeTruthy();
    });

    fireEvent.press(getByText('Done'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('handles missing route parameters gracefully', () => {
    jest.spyOn(require('@react-navigation/native'), 'useRoute').mockReturnValue({
      params: null,
    });

    const { getByText } = render(
      <ThemeProviderWrapper>
        <AdminFloorplanEditorContent />
      </ThemeProviderWrapper>,
    );

    expect(getByText('Missing floorplan information')).toBeTruthy();
    expect(getByText('Go Back')).toBeTruthy();
  });
});
