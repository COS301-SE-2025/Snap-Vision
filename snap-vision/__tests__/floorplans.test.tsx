import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
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
      get: jest.fn(() => Promise.resolve({ 
        docs: [
          { 
            id: 'building1', 
            data: () => ({ 
              name: 'Science Hall',
              type: 'building',
              centroid: { latitude: 10.1, longitude: 20.1 } 
            })
          },
          { 
            id: 'building2', 
            data: () => ({ 
              name: 'Engineering Building',
              type: 'building',
              centroid: { latitude: 10.2, longitude: 20.2 } 
            })
          },
        ]
      })),
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
const mockInjectJavaScript = jest.fn();
jest.mock('react-native-webview', () => {
  const React = require('react');
  const { forwardRef, useImperativeHandle } = require('react');
  const { View } = require('react-native');

  const WebView = forwardRef((props: any, ref: any) => {
    useImperativeHandle(ref, () => ({
      injectJavaScript: mockInjectJavaScript,
    }));
    return React.createElement(View, { ...props, testID: 'mocked-webview' });
  });
  WebView.displayName = 'WebView';
  return { WebView };
});

// Mock vector icons
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

// Mock Modal
jest.mock('react-native-modal', () => {
  const React = require('react');
  const { View } = require('react-native');
  return ({ isVisible, children, ...props }: any) => {
    if (!isVisible) return null;
    return React.createElement(View, { ...props, testID: 'modal' }, children);
  };
});

// Spy on Alert
const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('AdminEditFloorplansContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy.mockClear();
    
    // Mock AsyncStorage with sample floorplan data
    mockAsyncStorage.getAllKeys.mockResolvedValue([
      'floorplan_building1_Floor_1',
      'floorplan_building2_Floor_2',
    ]);
    mockAsyncStorage.getItem.mockImplementation((key) => {
      if (key === 'floorplan_building1_Floor_1') {
        return Promise.resolve(JSON.stringify({
          buildingId: 'building1',
          buildingName: 'Science Hall',
          floorLabel: 'Floor 1',
          uri: 'file:///mock/floorplan1.jpg',
          timestamp: '2024-01-01T00:00:00.000Z',
        }));
      }
      if (key === 'floorplan_building2_Floor_2') {
        return Promise.resolve(JSON.stringify({
          buildingId: 'building2',
          buildingName: 'Engineering Building',
          floorLabel: 'Floor 2',
          uri: 'file:///mock/floorplan2.jpg',
          timestamp: '2024-01-02T00:00:00.000Z',
        }));
      }
      return Promise.resolve(null);
    });
  });

  it('renders loading state initially', () => {
    const { getByText } = render(
      <ThemeProviderWrapper>
        <AdminEditFloorplansContent />
      </ThemeProviderWrapper>
    );
    
    expect(getByText('Loading floorplans...')).toBeTruthy();
  });

  it('loads and displays floorplans', async () => {
    const { getByText, queryByText } = render(
      <ThemeProviderWrapper>
        <AdminEditFloorplansContent />
      </ThemeProviderWrapper>
    );

    await waitFor(() => {
      expect(queryByText('Loading floorplans...')).toBeNull();
      expect(getByText('Science Hall')).toBeTruthy();
      expect(getByText('Engineering Building')).toBeTruthy();
    });
  });

  it('navigates to add new floorplan screen', async () => {
    const { getByText } = render(
      <ThemeProviderWrapper>
        <AdminEditFloorplansContent />
      </ThemeProviderWrapper>
    );

    await waitFor(() => {
      expect(getByText('Add New Floorplan')).toBeTruthy();
    });

    fireEvent.press(getByText('Add New Floorplan'));
    expect(mockNavigate).toHaveBeenCalledWith('AdminLoadFloorplansScreen');
  });

  it('selects a floorplan and shows actions', async () => {
    const { getByText } = render(
      <ThemeProviderWrapper>
        <AdminEditFloorplansContent />
      </ThemeProviderWrapper>
    );

    await waitFor(() => {
      expect(getByText('Science Hall')).toBeTruthy();
    });

    fireEvent.press(getByText('Science Hall'));

    await waitFor(() => {
      expect(getByText('Floorplan Actions')).toBeTruthy();
      expect(getByText('Edit Room POIs')).toBeTruthy();
      expect(getByText('Delete Floorplan')).toBeTruthy();
    });
  });

  it('navigates to floorplan editor when editing rooms', async () => {
    const { getByText } = render(
      <ThemeProviderWrapper>
        <AdminEditFloorplansContent />
      </ThemeProviderWrapper>
    );

    await waitFor(() => {
      expect(getByText('Science Hall')).toBeTruthy();
    });

    fireEvent.press(getByText('Science Hall'));

    await waitFor(() => {
      expect(getByText('Edit Room POIs')).toBeTruthy();
    });

    fireEvent.press(getByText('Edit Room POIs'));
    expect(mockNavigate).toHaveBeenCalledWith('AdminFloorplanEditor', {
      buildingId: 'building1',
      floorLabel: 'Floor 1',
      imageUri: 'file:///mock/floorplan1.jpg',
    });
  });

  it('shows delete confirmation and deletes floorplan', async () => {
    const { getByText } = render(
      <ThemeProviderWrapper>
        <AdminEditFloorplansContent />
      </ThemeProviderWrapper>
    );

    await waitFor(() => {
      expect(getByText('Science Hall')).toBeTruthy();
    });

    fireEvent.press(getByText('Science Hall'));

    await waitFor(() => {
      expect(getByText('Delete Floorplan')).toBeTruthy();
    });

    fireEvent.press(getByText('Delete Floorplan'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Delete Floorplan',
      'Are you sure you want to delete this floorplan? This will also delete all associated room POIs.',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel' }),
        expect.objectContaining({ text: 'Delete' }),
      ])
    );
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
      </ThemeProviderWrapper>
    );

    await waitFor(() => {
      expect(getByText('Step 1: Select Building')).toBeTruthy();
      expect(getByText('Step 2: Floor Information')).toBeTruthy();
      expect(getByText('Step 3: Select Floorplan File')).toBeTruthy();
      expect(getByPlaceholderText("Enter the building's name")).toBeTruthy();
      expect(getByPlaceholderText('e.g., Floor 2, Basement')).toBeTruthy();
    });
  });

  it('loads and displays buildings from Firestore', async () => {
    const { getByText } = render(
      <ThemeProviderWrapper>
        <AdminLoadFloorplansContent />
      </ThemeProviderWrapper>
    );

    await waitFor(() => {
      expect(getByText('Science Hall')).toBeTruthy();
      expect(getByText('Engineering Building')).toBeTruthy();
    });
  });

  it('allows manual building name entry', async () => {
    const { getByPlaceholderText } = render(
      <ThemeProviderWrapper>
        <AdminLoadFloorplansContent />
      </ThemeProviderWrapper>
    );

    const buildingInput = getByPlaceholderText("Enter the building's name");
    fireEvent.changeText(buildingInput, 'Custom Building');

    expect(buildingInput.props.value).toBe('Custom Building');
  });

  it('allows floor label entry', async () => {
    const { getByPlaceholderText } = render(
      <ThemeProviderWrapper>
        <AdminLoadFloorplansContent />
      </ThemeProviderWrapper>
    );

    const floorInput = getByPlaceholderText('e.g., Floor 2, Basement');
    fireEvent.changeText(floorInput, 'Ground Floor');

    expect(floorInput.props.value).toBe('Ground Floor');
  });

  it('opens image picker when selecting floorplan', async () => {
    mockImagePicker.launchImageLibrary.mockResolvedValueOnce({
      assets: [{
        uri: 'file:///mock/selected-image.jpg',
        fileName: 'floorplan.jpg',
      }],
    });

    const { getByText } = render(
      <ThemeProviderWrapper>
        <AdminLoadFloorplansContent />
      </ThemeProviderWrapper>
    );

    await waitFor(() => {
      expect(getByText('Select Floorplan Image')).toBeTruthy();
    });

    fireEvent.press(getByText('Select Floorplan Image'));
    
    await waitFor(() => {
      expect(mockImagePicker.launchImageLibrary).toHaveBeenCalledWith({
        mediaType: 'photo',
        quality: 0.8,
      });
    });
  });

  it('uploads floorplan successfully', async () => {
    // Mock image picker response
    mockImagePicker.launchImageLibrary.mockResolvedValueOnce({
      assets: [{
        uri: 'file:///mock/selected-image.jpg',
        fileName: 'floorplan.jpg',
      }],
    });

    const { getByText, getByPlaceholderText } = render(
      <ThemeProviderWrapper>
        <AdminLoadFloorplansContent />
      </ThemeProviderWrapper>
    );

    // Wait for buildings to load and select one
    await waitFor(() => {
      expect(getByText('Science Hall')).toBeTruthy();
    });
    fireEvent.press(getByText('Science Hall'));

    // Enter floor label
    const floorInput = getByPlaceholderText('e.g., Floor 2, Basement');
    fireEvent.changeText(floorInput, 'Floor 1');

    // Select image
    fireEvent.press(getByText('Select Floorplan Image'));
    await waitFor(() => {
      expect(mockImagePicker.launchImageLibrary).toHaveBeenCalled();
    });

    // Upload
    await waitFor(() => {
      expect(getByText('Upload Floorplan')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText('Upload Floorplan'));
    });

    await waitFor(() => {
      expect(mockRNFS.mkdir).toHaveBeenCalled();
      expect(mockRNFS.copyFile).toHaveBeenCalled();
      expect(mockAsyncStorage.setItem).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith(
        'Success',
        'Floorplan uploaded successfully. Would you like to add room POIs now?',
        expect.any(Array)
      );
    });
  });

  it('shows error when required fields are missing', async () => {
    const { getByText } = render(
      <ThemeProviderWrapper>
        <AdminLoadFloorplansContent />
      </ThemeProviderWrapper>
    );

    await waitFor(() => {
      expect(getByText('Upload Floorplan')).toBeTruthy();
    });

    fireEvent.press(getByText('Upload Floorplan'));

    await waitFor(() => {
      expect(getByText('Please select a building')).toBeTruthy();
    });
  });
});

describe('AdminFloorplanEditorContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy.mockClear();
    
    // Reset the Firestore mock to return room POIs
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
    
    const mockCollection = jest.fn(() => ({
      where: mockWhere,
      doc: mockDoc,
    }));
    
    // Override the mockFirestore with fresh mocks
    mockFirestore.collection = mockCollection;
  });

  it('renders floorplan editor with header and footer', async () => {
    const { getByText } = render(
      <ThemeProviderWrapper>
        <AdminFloorplanEditorContent />
      </ThemeProviderWrapper>
    );

    await waitFor(() => {
      expect(getByText('Add Room POIs - Floor 1')).toBeTruthy();
      expect(getByText('Tap on the floorplan to add rooms or tap existing markers to edit')).toBeTruthy();
      expect(getByText('Done')).toBeTruthy();
    });
  });

  it('loads existing room POIs', async () => {
    const { getByText } = render(
      <ThemeProviderWrapper>
        <AdminFloorplanEditorContent />
      </ThemeProviderWrapper>
    );

    await waitFor(() => {
      expect(getByText('1 rooms added')).toBeTruthy();
    });

    // Check that JavaScript was injected to add markers
    await waitFor(() => {
      expect(mockInjectJavaScript).toHaveBeenCalledWith(
        expect.stringContaining('addMarker("room1", 0.5, 0.5, "Room 101")')
      );
    });
  });

  it('handles WebView message for adding new marker', async () => {
    const { getByTestId } = render(
      <ThemeProviderWrapper>
        <AdminFloorplanEditorContent />
      </ThemeProviderWrapper>
    );

    const webView = getByTestId('mocked-webview');
    
    // Simulate WebView message for adding marker
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

  it('handles WebView message for editing existing marker', async () => {
    const { getByTestId } = render(
      <ThemeProviderWrapper>
        <AdminFloorplanEditorContent />
      </ThemeProviderWrapper>
    );

    const webView = getByTestId('mocked-webview');
    
    // Wait for room POIs to load
    await waitFor(() => {
      expect(mockFirestore.collection).toHaveBeenCalled();
    });

    // Simulate WebView message for editing marker
    await act(async () => {
      fireEvent(webView, 'message', {
        nativeEvent: {
          data: JSON.stringify({
            type: 'edit_marker',
            id: 'room1',
          }),
        },
      });
    });

    await waitFor(() => {
      expect(getByTestId('modal')).toBeTruthy();
    });
  });

  it('saves new room POI', async () => {
    const { getByTestId, getByPlaceholderText, getByText } = render(
      <ThemeProviderWrapper>
        <AdminFloorplanEditorContent />
      </ThemeProviderWrapper>
    );

    const webView = getByTestId('mocked-webview');
    
    // Trigger add marker modal
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

    // Fill in room details
    const nameInput = getByPlaceholderText('Room Name/Number');
    fireEvent.changeText(nameInput, 'Room 102');

    const officeType = getByText('Office');
    fireEvent.press(officeType);

    const saveButton = getByText('Save');
    await act(async () => {
      fireEvent.press(saveButton);
    });

    await waitFor(() => {
      expect(mockFirestore.collection().doc().set).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Room 102',
          type: 'office',
          buildingId: 'building1',
          floorId: 'Floor 1',
          coordinates: { x: 0.3, y: 0.7 },
        })
      );
    });
  });

  it('shows error when room name is empty', async () => {
    const { getByTestId, getByText } = render(
      <ThemeProviderWrapper>
        <AdminFloorplanEditorContent />
      </ThemeProviderWrapper>
    );

    const webView = getByTestId('mocked-webview');
    
    // Trigger add marker modal
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

  it('deletes room POI with confirmation', async () => {
    const { getByTestId, getByText } = render(
      <ThemeProviderWrapper>
        <AdminFloorplanEditorContent />
      </ThemeProviderWrapper>
    );

    const webView = getByTestId('mocked-webview');
    
    // Wait for room POIs to load
    await waitFor(() => {
      expect(mockFirestore.collection).toHaveBeenCalled();
    });

    // Trigger edit marker modal
    await act(async () => {
      fireEvent(webView, 'message', {
        nativeEvent: {
          data: JSON.stringify({
            type: 'edit_marker',
            id: 'room1',
          }),
        },
      });
    });

    await waitFor(() => {
      expect(getByTestId('modal')).toBeTruthy();
      expect(getByText('Delete')).toBeTruthy();
    });

    fireEvent.press(getByText('Delete'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Delete Room',
      'Are you sure you want to delete Room 101?',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel' }),
        expect.objectContaining({ text: 'Delete' }),
      ])
    );
  });

  it('navigates back when Done is pressed', async () => {
    const { getByText } = render(
      <ThemeProviderWrapper>
        <AdminFloorplanEditorContent />
      </ThemeProviderWrapper>
    );

    await waitFor(() => {
      expect(getByText('Done')).toBeTruthy();
    });

    fireEvent.press(getByText('Done'));
    expect(mockGoBack).toHaveBeenCalled();
  });

  it('handles missing route parameters gracefully', () => {
    // Mock useRoute to return no params
    jest.spyOn(require('@react-navigation/native'), 'useRoute').mockReturnValue({
      params: null,
    });

    const { getByText } = render(
      <ThemeProviderWrapper>
        <AdminFloorplanEditorContent />
      </ThemeProviderWrapper>
    );

    expect(getByText('Missing floorplan information')).toBeTruthy();
    expect(getByText('Go Back')).toBeTruthy();
  });
});
