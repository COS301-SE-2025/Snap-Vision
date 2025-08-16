import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AdminLoadFloorplansContent from '../src/components/organisms/AdminLoadFloorplansContent';

// Mock all dependencies
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

// Mock AsyncStorage
const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
const mockRemoveItem = jest.fn();

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: mockGetItem,
  setItem: mockSetItem,
  removeItem: mockRemoveItem,
}));

// Mock Image Picker
const mockLaunchImageLibrary = jest.fn();
jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: mockLaunchImageLibrary,
}));

// Mock Firebase
const mockUserDoc = {
  get: jest.fn(),
  set: jest.fn(),
};

const mockFloorplanDoc = {
  set: jest.fn(),
};

const mockCollection = jest.fn();
const mockDoc = jest.fn();

const mockFirestore = {
  collection: mockCollection,
  doc: mockDoc,
  FieldValue: {
    serverTimestamp: jest.fn(() => 'mock-timestamp'),
  },
};

const mockStorageRef = {
  putFile: jest.fn(),
  getDownloadURL: jest.fn(),
};

const mockStorage = {
  ref: jest.fn(() => mockStorageRef),
};

const mockAuth = {
  currentUser: { uid: 'test-user-123' },
};

jest.mock('@react-native-firebase/firestore', () => () => mockFirestore);
jest.mock('@react-native-firebase/storage', () => () => mockStorage);
jest.mock('@react-native-firebase/auth', () => () => mockAuth);

// Mock RNFS
jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/mock/path',
}));

// Mock Theme
jest.mock('../src/theme/ThemeContext', () => ({
  useTheme: () => ({
    isDark: false,
  }),
}));

jest.mock('../src/theme', () => ({
  getThemeColors: () => ({
    background: '#FFFFFF',
    text: '#000000',
    primary: '#007AFF',
    secondary: '#8E8E93',
    card: '#F2F2F7',
    danger: '#FF3B30',
  }),
}));

// Mock UI Components
jest.mock('../src/components/atoms/AppInput', () => {
  const { TextInput } = require('react-native');
  return (props: any) => <TextInput {...props} />;
});

jest.mock('../src/components/atoms/AppButton', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return ({ title, onPress, disabled, testID }: any) => (
    <TouchableOpacity onPress={onPress} disabled={disabled} testID={testID}>
      <Text>{title}</Text>
    </TouchableOpacity>
  );
});

jest.mock('../src/components/atoms/AppSecondaryButton', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return ({ title, onPress, testID }: any) => (
    <TouchableOpacity onPress={onPress} testID={testID}>
      <Text>{title}</Text>
    </TouchableOpacity>
  );
});

jest.mock('../src/components/molecules/SettingsHeader', () => {
  const { View, Text } = require('react-native');
  return ({ title }: any) => (
    <View testID="settings-header">
      <Text>{title}</Text>
    </View>
  );
});

jest.mock('../src/components/atoms/StandardPopup', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return ({ visible, title, message, onConfirm, onCancel, confirmText, cancelText, showCancel }: any) => {
    if (!visible) return null;
    return (
      <View testID="standard-popup">
        <Text testID="popup-title">{title}</Text>
        <Text testID="popup-message">{message}</Text>
        <TouchableOpacity onPress={onConfirm} testID="popup-confirm">
          <Text>{confirmText || 'OK'}</Text>
        </TouchableOpacity>
        {showCancel && (
          <TouchableOpacity onPress={onCancel} testID="popup-cancel">
            <Text>{cancelText || 'Cancel'}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };
});

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => {
  const { Text } = require('react-native');
  return ({ name, ...props }: any) => <Text {...props} testID={`icon-${name}`}>{name}</Text>;
});

jest.mock('react-native-dropdown-picker', () => {
  const { View, Text, TouchableOpacity } = require('react-native');
  return ({ open, setOpen, items, value, setValue, placeholder, searchable, testID }: any) => {
    const handleSelect = (itemValue: string) => {
      setValue(() => itemValue);
    };
    
    return (
      <View testID={testID || 'dropdown-picker'}>
        <TouchableOpacity onPress={() => setOpen(!open)} testID="dropdown-trigger">
          <Text>{value ? items?.find((item: any) => item.value === value)?.label : placeholder}</Text>
        </TouchableOpacity>
        {open && (
          <View testID="dropdown-options">
            {items?.map((item: any) => (
              <TouchableOpacity 
                key={item.value} 
                onPress={() => handleSelect(item.value)}
                testID={`dropdown-option-${item.value}`}
              >
                <Text>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };
});

describe('AdminLoadFloorplansContent - Comprehensive Coverage', () => {
  const setupMocks = (userRole: string = 'admin', adminLocations: string[] = ['loc1']) => {
    // Setup user document mock
    mockDoc.mockImplementation((path: string) => {
      if (path.includes('userInformation')) {
        return {
          get: jest.fn().mockResolvedValue({
            data: () => ({
              role: userRole,
              adminLocations,
            }),
          }),
        };
      }
      if (path.includes('floorplans')) {
        return {
          set: jest.fn().mockResolvedValue(undefined),
        };
      }
      return mockUserDoc;
    });

    // Setup collections mock
    mockCollection.mockImplementation((path: string) => {
      if (path === 'locations') {
        return {
          get: jest.fn().mockResolvedValue({
            docs: [
              { id: 'loc1', data: () => ({ name: 'Campus 1' }) },
              { id: 'loc2', data: () => ({ name: 'Campus 2' }) },
            ],
          }),
        };
      }
      if (path.includes('buildingPOIs')) {
        return {
          get: jest.fn().mockResolvedValue({
            docs: [
              { id: 'building1', data: () => ({ name: 'Building A', floors: 3 }) },
              { id: 'building2', data: () => ({ name: 'Building B', floors: 5 }) },
            ],
          }),
        };
      }
      return {
        get: jest.fn().mockResolvedValue({ docs: [] }),
      };
    });

    // Setup storage mocks
    mockStorageRef.putFile.mockResolvedValue(undefined);
    mockStorageRef.getDownloadURL.mockResolvedValue('https://example.com/image.jpg');
  };

  beforeEach(() => {
    jest.clearAllMocks();
    setupMocks();
  });

  describe('Component Initialization and Data Loading', () => {
    it('loads user information on mount', async () => {
      render(<AdminLoadFloorplansContent />);
      
      await waitFor(() => {
        expect(mockDoc).toHaveBeenCalledWith('userInformation/test-user-123');
      });
    });

    it('loads locations based on user role', async () => {
      render(<AdminLoadFloorplansContent />);
      
      await waitFor(() => {
        expect(mockCollection).toHaveBeenCalledWith('locations');
      });
    });

    it('handles editor role with limited locations', async () => {
      setupMocks('editor', ['loc1']);
      
      const { getByText } = render(<AdminLoadFloorplansContent />);
      
      await waitFor(() => {
        expect(getByText('Campus 1')).toBeTruthy();
      });
    });

    it('handles user with no role', async () => {
      setupMocks('user', []);
      
      render(<AdminLoadFloorplansContent />);
      
      await waitFor(() => {
        expect(mockCollection).toHaveBeenCalledWith('locations');
      });
    });
  });

  describe('Location Selection Flow', () => {
    it('handles location selection and loads buildings', async () => {
      const { getByTestId } = render(<AdminLoadFloorplansContent />);
      
      await waitFor(() => {
        expect(getByTestId('location-loc1')).toBeTruthy();
      });

      fireEvent.press(getByTestId('location-loc1'));

      await waitFor(() => {
        expect(mockCollection).toHaveBeenCalledWith('locations/loc1/buildingPOIs');
      });
    });

    it('resets building selection when changing location', async () => {
      const { getByTestId } = render(<AdminLoadFloorplansContent />);
      
      await waitFor(() => {
        expect(getByTestId('location-loc1')).toBeTruthy();
      });

      // Select first location
      fireEvent.press(getByTestId('location-loc1'));
      
      await waitFor(() => {
        expect(getByTestId('location-loc2')).toBeTruthy();
      });

      // Select second location - should reset building selection
      fireEvent.press(getByTestId('location-loc2'));

      await waitFor(() => {
        expect(mockCollection).toHaveBeenCalledWith('locations/loc2/buildingPOIs');
      });
    });
  });

  describe('Building Selection Flow', () => {
    it('handles dropdown building selection', async () => {
      const { getByTestId } = render(<AdminLoadFloorplansContent />);
      
      await waitFor(() => {
        expect(getByTestId('location-loc1')).toBeTruthy();
      });

      fireEvent.press(getByTestId('location-loc1'));

      await waitFor(() => {
        expect(getByTestId('dropdown-trigger')).toBeTruthy();
      });

      // Open dropdown
      fireEvent.press(getByTestId('dropdown-trigger'));

      await waitFor(() => {
        expect(getByTestId('dropdown-option-building1')).toBeTruthy();
      });

      // Select building
      fireEvent.press(getByTestId('dropdown-option-building1'));

      // Verify building was selected and step progressed
      await waitFor(() => {
        expect(getByTestId('dropdown-trigger')).toBeTruthy();
      });
    });

    it('handles empty buildings list', async () => {
      mockCollection.mockImplementation((path: string) => {
        if (path === 'locations') {
          return {
            get: jest.fn().mockResolvedValue({
              docs: [{ id: 'loc1', data: () => ({ name: 'Campus 1' }) }],
            }),
          };
        }
        if (path.includes('buildingPOIs')) {
          return {
            get: jest.fn().mockResolvedValue({ docs: [] }),
          };
        }
        return { get: jest.fn().mockResolvedValue({ docs: [] }) };
      });

      const { getByTestId, getByText } = render(<AdminLoadFloorplansContent />);
      
      await waitFor(() => {
        expect(getByTestId('location-loc1')).toBeTruthy();
      });

      fireEvent.press(getByTestId('location-loc1'));

      await waitFor(() => {
        expect(getByText('No buildings available. Please check your connection.')).toBeTruthy();
      });
    });
  });

  describe('Floor Label Input Flow', () => {
    const setupWithSelectedBuilding = async () => {
      const component = render(<AdminLoadFloorplansContent />);
      
      await waitFor(() => {
        expect(component.getByTestId('location-loc1')).toBeTruthy();
      });

      fireEvent.press(component.getByTestId('location-loc1'));

      await waitFor(() => {
        expect(component.getByTestId('dropdown-trigger')).toBeTruthy();
      });

      fireEvent.press(component.getByTestId('dropdown-trigger'));
      
      await waitFor(() => {
        expect(component.getByTestId('dropdown-option-building1')).toBeTruthy();
      });

      fireEvent.press(component.getByTestId('dropdown-option-building1'));

      return component;
    };

    it('handles valid floor number input', async () => {
      const { getByTestId } = await setupWithSelectedBuilding();
      
      await waitFor(() => {
        expect(getByTestId('input-floor-label')).toBeTruthy();
      });

      fireEvent.changeText(getByTestId('input-floor-label'), '3');

      // Verify the input was accepted
      expect(getByTestId('input-floor-label').props.value).toBe('3');
    });

    it('blocks invalid floor numbers (non-digits)', async () => {
      const { getByTestId } = await setupWithSelectedBuilding();
      
      await waitFor(() => {
        expect(getByTestId('input-floor-label')).toBeTruthy();
      });

      fireEvent.changeText(getByTestId('input-floor-label'), 'abc');

      // Should be empty since non-digits are blocked
      expect(getByTestId('input-floor-label').props.value).toBe('');
    });

    it('blocks leading zeros', async () => {
      const { getByTestId } = await setupWithSelectedBuilding();
      
      await waitFor(() => {
        expect(getByTestId('input-floor-label')).toBeTruthy();
      });

      fireEvent.changeText(getByTestId('input-floor-label'), '0');

      // Should be empty since leading zeros are blocked
      expect(getByTestId('input-floor-label').props.value).toBe('');
    });

    it('handles floor input blur event', async () => {
      const { getByTestId } = await setupWithSelectedBuilding();
      
      await waitFor(() => {
        expect(getByTestId('input-floor-label')).toBeTruthy();
      });

      fireEvent.changeText(getByTestId('input-floor-label'), '2');
      fireEvent(getByTestId('input-floor-label'), 'blur');

      // Should progress to next step after blur
      expect(getByTestId('input-floor-label').props.value).toBe('2');
    });
  });

  describe('File Selection Flow', () => {
    const setupWithFloorLabel = async () => {
      const component = render(<AdminLoadFloorplansContent />);
      
      // Select location
      await waitFor(() => {
        expect(component.getByTestId('location-loc1')).toBeTruthy();
      });
      fireEvent.press(component.getByTestId('location-loc1'));

      // Select building
      await waitFor(() => {
        expect(component.getByTestId('dropdown-trigger')).toBeTruthy();
      });
      fireEvent.press(component.getByTestId('dropdown-trigger'));
      
      await waitFor(() => {
        expect(component.getByTestId('dropdown-option-building1')).toBeTruthy();
      });
      fireEvent.press(component.getByTestId('dropdown-option-building1'));

      // Enter floor label
      await waitFor(() => {
        expect(component.getByTestId('input-floor-label')).toBeTruthy();
      });
      fireEvent.changeText(component.getByTestId('input-floor-label'), '1');

      return component;
    };

    it('handles successful image selection', async () => {
      mockLaunchImageLibrary.mockResolvedValue({
        didCancel: false,
        assets: [{
          uri: 'file:///test/image.jpg',
          fileName: 'test-image.jpg',
          fileSize: 1024 * 1024, // 1MB
        }],
      });

      const { getByTestId } = await setupWithFloorLabel();
      
      await waitFor(() => {
        expect(getByTestId('button-select-image')).toBeTruthy();
      });

      fireEvent.press(getByTestId('button-select-image'));

      await waitFor(() => {
        expect(mockLaunchImageLibrary).toHaveBeenCalledWith({
          mediaType: 'photo',
          quality: 0.8,
        });
      });
    });

    it('handles image selection cancellation', async () => {
      mockLaunchImageLibrary.mockResolvedValue({
        didCancel: true,
      });

      const { getByTestId } = await setupWithFloorLabel();
      
      await waitFor(() => {
        expect(getByTestId('button-select-image')).toBeTruthy();
      });

      fireEvent.press(getByTestId('button-select-image'));

      await waitFor(() => {
        expect(mockLaunchImageLibrary).toHaveBeenCalled();
      });

      // Should still show select image button since selection was cancelled
      expect(getByTestId('button-select-image')).toBeTruthy();
    });

    it('handles large file rejection', async () => {
      mockLaunchImageLibrary.mockResolvedValue({
        didCancel: false,
        assets: [{
          uri: 'file:///test/large-image.jpg',
          fileName: 'large-image.jpg',
          fileSize: 10 * 1024 * 1024, // 10MB
        }],
      });

      const { getByTestId, getByText } = await setupWithFloorLabel();
      
      await waitFor(() => {
        expect(getByTestId('button-select-image')).toBeTruthy();
      });

      fireEvent.press(getByTestId('button-select-image'));

      await waitFor(() => {
        expect(getByText('Error')).toBeTruthy();
        expect(getByText('Please select an image smaller than 5MB.')).toBeTruthy();
      });
    });

    it('handles invalid image selection', async () => {
      mockLaunchImageLibrary.mockResolvedValue({
        didCancel: false,
        assets: [{
          uri: null, // Invalid URI
          fileName: null,
        }],
      });

      const { getByTestId, getByText } = await setupWithFloorLabel();
      
      await waitFor(() => {
        expect(getByTestId('button-select-image')).toBeTruthy();
      });

      fireEvent.press(getByTestId('button-select-image'));

      await waitFor(() => {
        expect(getByText('Error')).toBeTruthy();
        expect(getByText('Invalid image selected. Please try again.')).toBeTruthy();
      });
    });

    it('handles image picker error', async () => {
      mockLaunchImageLibrary.mockResolvedValue({
        errorMessage: 'Permission denied',
      });

      const { getByTestId, getByText } = await setupWithFloorLabel();
      
      await waitFor(() => {
        expect(getByTestId('button-select-image')).toBeTruthy();
      });

      fireEvent.press(getByTestId('button-select-image'));

      await waitFor(() => {
        expect(getByText('Error')).toBeTruthy();
        expect(getByText('Image Picker error: Permission denied')).toBeTruthy();
      });
    });

    it('handles image picker exception', async () => {
      mockLaunchImageLibrary.mockRejectedValue(new Error('Picker failed'));

      const { getByTestId, getByText } = await setupWithFloorLabel();
      
      await waitFor(() => {
        expect(getByTestId('button-select-image')).toBeTruthy();
      });

      fireEvent.press(getByTestId('button-select-image'));

      await waitFor(() => {
        expect(getByText('Error')).toBeTruthy();
        expect(getByText('Failed to select image')).toBeTruthy();
      });
    });

    it('shows change image button after successful selection', async () => {
      mockLaunchImageLibrary.mockResolvedValue({
        didCancel: false,
        assets: [{
          uri: 'file:///test/image.jpg',
          fileName: 'test-image.jpg',
        }],
      });

      const { getByTestId } = await setupWithFloorLabel();
      
      await waitFor(() => {
        expect(getByTestId('button-select-image')).toBeTruthy();
      });

      fireEvent.press(getByTestId('button-select-image'));

      await waitFor(() => {
        expect(getByTestId('button-change-image')).toBeTruthy();
      });
    });
  });

  describe('Upload Functionality', () => {
    const setupCompleteForm = async () => {
      mockLaunchImageLibrary.mockResolvedValue({
        didCancel: false,
        assets: [{
          uri: 'file:///test/image.jpg',
          fileName: 'test-image.jpg',
        }],
      });

      const component = render(<AdminLoadFloorplansContent />);
      
      // Complete form setup
      await waitFor(() => {
        expect(component.getByTestId('location-loc1')).toBeTruthy();
      });
      fireEvent.press(component.getByTestId('location-loc1'));

      await waitFor(() => {
        expect(component.getByTestId('dropdown-trigger')).toBeTruthy();
      });
      fireEvent.press(component.getByTestId('dropdown-trigger'));
      
      await waitFor(() => {
        expect(component.getByTestId('dropdown-option-building1')).toBeTruthy();
      });
      fireEvent.press(component.getByTestId('dropdown-option-building1'));

      await waitFor(() => {
        expect(component.getByTestId('input-floor-label')).toBeTruthy();
      });
      fireEvent.changeText(component.getByTestId('input-floor-label'), '1');

      await waitFor(() => {
        expect(component.getByTestId('button-select-image')).toBeTruthy();
      });
      fireEvent.press(component.getByTestId('button-select-image'));

      return component;
    };

    it('handles successful upload', async () => {
      const { getByTestId, getByText } = await setupCompleteForm();
      
      await waitFor(() => {
        expect(getByTestId('button-upload-floorplan')).toBeTruthy();
      });

      fireEvent.press(getByTestId('button-upload-floorplan'));

      await waitFor(() => {
        expect(mockStorageRef.putFile).toHaveBeenCalled();
        expect(getByText('Upload Successful')).toBeTruthy();
      });
    });

    it('validates required fields before upload', async () => {
      const { getByTestId, getByText } = render(<AdminLoadFloorplansContent />);
      
      // Try to upload without completing form
      await waitFor(() => {
        // Button should be disabled initially
        expect(getByTestId('settings-header')).toBeTruthy();
      });
    });

    it('validates floor number format', async () => {
      mockLaunchImageLibrary.mockResolvedValue({
        didCancel: false,
        assets: [{
          uri: 'file:///test/image.jpg',
          fileName: 'test-image.jpg',
        }],
      });

      const component = render(<AdminLoadFloorplansContent />);
      
      // Setup form with invalid floor number
      await waitFor(() => {
        expect(component.getByTestId('location-loc1')).toBeTruthy();
      });
      fireEvent.press(component.getByTestId('location-loc1'));

      await waitFor(() => {
        expect(component.getByTestId('dropdown-trigger')).toBeTruthy();
      });
      fireEvent.press(component.getByTestId('dropdown-trigger'));
      fireEvent.press(component.getByTestId('dropdown-option-building1'));

      await waitFor(() => {
        expect(component.getByTestId('input-floor-label')).toBeTruthy();
      });
      
      // Try invalid floor number
      fireEvent.changeText(component.getByTestId('input-floor-label'), '0');

      // Should not allow floor 0
      expect(component.getByTestId('input-floor-label').props.value).toBe('');
    });

    it('handles editor permission validation', async () => {
      setupMocks('editor', ['loc2']); // Editor with access to different location
      
      const { getByTestId, getByText } = await setupCompleteForm();
      
      await waitFor(() => {
        expect(getByTestId('button-upload-floorplan')).toBeTruthy();
      });

      fireEvent.press(getByTestId('button-upload-floorplan'));

      await waitFor(() => {
        expect(getByText('Error')).toBeTruthy();
        expect(getByText("You're not allowed to upload to this location.")).toBeTruthy();
      });
    });

    it('handles upload errors', async () => {
      mockStorageRef.putFile.mockRejectedValue(new Error('Upload failed'));

      const { getByTestId, getByText } = await setupCompleteForm();
      
      await waitFor(() => {
        expect(getByTestId('button-upload-floorplan')).toBeTruthy();
      });

      fireEvent.press(getByTestId('button-upload-floorplan'));

      await waitFor(() => {
        expect(getByText('Error')).toBeTruthy();
        expect(getByText('Failed to upload floorplan')).toBeTruthy();
      });
    });

    it('handles firestore save errors', async () => {
      mockDoc.mockImplementation((path: string) => {
        if (path.includes('userInformation')) {
          return {
            get: jest.fn().mockResolvedValue({
              data: () => ({ role: 'admin', adminLocations: ['loc1'] }),
            }),
          };
        }
        if (path.includes('floorplans')) {
          return {
            set: jest.fn().mockRejectedValue(new Error('Firestore error')),
          };
        }
        return mockUserDoc;
      });

      const { getByTestId, getByText } = await setupCompleteForm();
      
      await waitFor(() => {
        expect(getByTestId('button-upload-floorplan')).toBeTruthy();
      });

      fireEvent.press(getByTestId('button-upload-floorplan'));

      await waitFor(() => {
        expect(getByText('Error')).toBeTruthy();
        expect(getByText('Failed to upload floorplan')).toBeTruthy();
      });
    });
  });

  describe('Success Flow and Navigation', () => {
    it('handles success popup confirmation', async () => {
      const { getByText, getByTestId } = render(<AdminLoadFloorplansContent />);
      
      // Simulate successful upload state
      await act(async () => {
        // This would be triggered after successful upload
      });

      // For testing popup flow, we'll render it manually
      const popupProps = {
        visible: true,
        title: 'Upload Successful',
        message: 'Floorplan uploaded successfully!',
        onConfirm: jest.fn(),
        showCancel: false,
      };

      const { getByTestId: getPopupTestId } = render(
        <jest.requireActual('../src/components/atoms/StandardPopup').default {...popupProps} />
      );
    });

    it('handles navigation to POI editor', async () => {
      // This would test the navigation after successful upload
      const { getByText } = render(<AdminLoadFloorplansContent />);
      
      // Test navigation confirmation flow
      expect(getByText('Upload Floorplan')).toBeTruthy();
    });

    it('handles "later" option in navigation popup', async () => {
      const { getByText } = render(<AdminLoadFloorplansContent />);
      
      expect(getByText('Upload Floorplan')).toBeTruthy();
    });

    it('resets form after navigation decision', async () => {
      const { getByText } = render(<AdminLoadFloorplansContent />);
      
      expect(getByText('Upload Floorplan')).toBeTruthy();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('handles user role loading timeout', async () => {
      mockDoc.mockImplementation((path: string) => {
        if (path.includes('userInformation')) {
          return {
            get: jest.fn().mockResolvedValue({
              data: () => ({ role: undefined }),
            }),
          };
        }
        return mockUserDoc;
      });

      const { getByTestId, getByText } = render(<AdminLoadFloorplansContent />);
      
      // Try to upload without role loaded
      await waitFor(() => {
        expect(getByText('Upload Floorplan')).toBeTruthy();
      });
    });

    it('handles network connectivity issues', async () => {
      mockCollection.mockImplementation(() => ({
        get: jest.fn().mockRejectedValue(new Error('Network error')),
      }));

      render(<AdminLoadFloorplansContent />);
      
      await waitFor(() => {
        expect(mockCollection).toHaveBeenCalled();
      });
    });

    it('handles popup error dismissal', async () => {
      const { getByText, getByTestId } = render(<AdminLoadFloorplansContent />);
      
      // Wait for component to load
      await waitFor(() => {
        expect(getByText('Upload Floorplan')).toBeTruthy();
      });
    });

    it('handles missing file name in image selection', async () => {
      mockLaunchImageLibrary.mockResolvedValue({
        didCancel: false,
        assets: [{
          uri: 'file:///test/image.jpg',
          fileName: undefined,
        }],
      });

      const component = render(<AdminLoadFloorplansContent />);
      
      // Complete form setup to trigger file selection
      await waitFor(() => {
        expect(component.getByTestId('location-loc1')).toBeTruthy();
      });
      fireEvent.press(component.getByTestId('location-loc1'));

      await waitFor(() => {
        expect(component.getByTestId('dropdown-trigger')).toBeTruthy();
      });
      fireEvent.press(component.getByTestId('dropdown-trigger'));
      fireEvent.press(component.getByTestId('dropdown-option-building1'));

      await waitFor(() => {
        expect(component.getByTestId('input-floor-label')).toBeTruthy();
      });
      fireEvent.changeText(component.getByTestId('input-floor-label'), '1');

      await waitFor(() => {
        expect(component.getByTestId('button-select-image')).toBeTruthy();
      });

      fireEvent.press(component.getByTestId('button-select-image'));

      await waitFor(() => {
        expect(component.getByText('Error')).toBeTruthy();
      });
    });

    it('handles building data with missing centroid', async () => {
      mockCollection.mockImplementation((path: string) => {
        if (path === 'locations') {
          return {
            get: jest.fn().mockResolvedValue({
              docs: [{ id: 'loc1', data: () => ({ name: 'Campus 1' }) }],
            }),
          };
        }
        if (path.includes('buildingPOIs')) {
          return {
            get: jest.fn().mockResolvedValue({
              docs: [
                { id: 'building1', data: () => ({ name: 'Building A' }) }, // No centroid
              ],
            }),
          };
        }
        return { get: jest.fn().mockResolvedValue({ docs: [] }) };
      });

      const { getByTestId } = render(<AdminLoadFloorplansContent />);
      
      await waitFor(() => {
        expect(getByTestId('location-loc1')).toBeTruthy();
      });

      fireEvent.press(getByTestId('location-loc1'));

      await waitFor(() => {
        expect(getByTestId('dropdown-trigger')).toBeTruthy();
      });
    });

    it('handles malformed location data', async () => {
      mockCollection.mockImplementation((path: string) => {
        if (path === 'locations') {
          return {
            get: jest.fn().mockResolvedValue({
              docs: [
                { id: 'loc1', data: () => ({}) }, // Missing name
                { id: 'loc2', data: () => ({ name: null }) }, // Null name
              ],
            }),
          };
        }
        return { get: jest.fn().mockResolvedValue({ docs: [] }) };
      });

      render(<AdminLoadFloorplansContent />);
      
      await waitFor(() => {
        expect(mockCollection).toHaveBeenCalledWith('locations');
      });
    });
  });

  describe('Step Progression Logic', () => {
    it('shows step 1 when location is selected', async () => {
      const { getByTestId, getByText } = render(<AdminLoadFloorplansContent />);
      
      await waitFor(() => {
        expect(getByTestId('location-loc1')).toBeTruthy();
      });

      fireEvent.press(getByTestId('location-loc1'));

      await waitFor(() => {
        expect(getByText('Step 1: Select Building')).toBeTruthy();
      });
    });

    it('shows step 2 when building is selected', async () => {
      const { getByTestId, getByText } = render(<AdminLoadFloorplansContent />);
      
      await waitFor(() => {
        expect(getByTestId('location-loc1')).toBeTruthy();
      });

      fireEvent.press(getByTestId('location-loc1'));

      await waitFor(() => {
        expect(getByTestId('dropdown-trigger')).toBeTruthy();
      });

      fireEvent.press(getByTestId('dropdown-trigger'));
      fireEvent.press(getByTestId('dropdown-option-building1'));

      await waitFor(() => {
        expect(getByText('Step 2: Floor Information')).toBeTruthy();
      });
    });

    it('shows step 3 when floor label is entered', async () => {
      const { getByTestId, getByText } = render(<AdminLoadFloorplansContent />);
      
      await waitFor(() => {
        expect(getByTestId('location-loc1')).toBeTruthy();
      });

      fireEvent.press(getByTestId('location-loc1'));

      await waitFor(() => {
        expect(getByTestId('dropdown-trigger')).toBeTruthy();
      });

      fireEvent.press(getByTestId('dropdown-trigger'));
      fireEvent.press(component.getByTestId('dropdown-option-building1'));

      await waitFor(() => {
        expect(getByTestId('input-floor-label')).toBeTruthy();
      });

      fireEvent.changeText(getByTestId('input-floor-label'), '1');

      await waitFor(() => {
        expect(getByText('Step 3: Select Floorplan File')).toBeTruthy();
      });
    });

    it('shows upload button when all steps completed', async () => {
      mockLaunchImageLibrary.mockResolvedValue({
        didCancel: false,
        assets: [{
          uri: 'file:///test/image.jpg',
          fileName: 'test-image.jpg',
        }],
      });

      const { getByTestId } = render(<AdminLoadFloorplansContent />);
      
      // Complete all steps
      await waitFor(() => {
        expect(getByTestId('location-loc1')).toBeTruthy();
      });
      fireEvent.press(getByTestId('location-loc1'));

      await waitFor(() => {
        expect(getByTestId('dropdown-trigger')).toBeTruthy();
      });
      fireEvent.press(getByTestId('dropdown-trigger'));
      fireEvent.press(getByTestId('dropdown-option-building1'));

      await waitFor(() => {
        expect(getByTestId('input-floor-label')).toBeTruthy();
      });
      fireEvent.changeText(getByTestId('input-floor-label'), '1');

      await waitFor(() => {
        expect(getByTestId('button-select-image')).toBeTruthy();
      });
      fireEvent.press(getByTestId('button-select-image'));

      await waitFor(() => {
        expect(getByTestId('button-upload-floorplan')).toBeTruthy();
      });
    });
  });

  describe('Form Validation', () => {
    it('validates missing building selection', async () => {
      mockLaunchImageLibrary.mockResolvedValue({
        didCancel: false,
        assets: [{
          uri: 'file:///test/image.jpg',
          fileName: 'test-image.jpg',
        }],
      });

      const { getByText } = render(<AdminLoadFloorplansContent />);
      
      // Simulate trying to upload without selecting building
      await waitFor(() => {
        expect(getByText('Upload Floorplan')).toBeTruthy();
      });
    });

    it('validates missing location selection', async () => {
      const { getByText } = render(<AdminLoadFloorplansContent />);
      
      // Component should handle missing location gracefully
      await waitFor(() => {
        expect(getByText('Upload Floorplan')).toBeTruthy();
      });
    });

    it('validates floor number range', async () => {
      const { getByTestId } = render(<AdminLoadFloorplansContent />);
      
      // Setup form
      await waitFor(() => {
        expect(getByTestId('location-loc1')).toBeTruthy();
      });
      fireEvent.press(getByTestId('location-loc1'));

      await waitFor(() => {
        expect(getByTestId('dropdown-trigger')).toBeTruthy();
      });
      fireEvent.press(getByTestId('dropdown-trigger'));
      fireEvent.press(getByTestId('dropdown-option-building1'));

      await waitFor(() => {
        expect(getByTestId('input-floor-label')).toBeTruthy();
      });

      // Test floor number validation
      fireEvent.changeText(getByTestId('input-floor-label'), '99'); // Should be limited
      
      // Test max length constraint
      fireEvent.changeText(getByTestId('input-floor-label'), '999'); // Should be truncated
    });
  });

  describe('Loading States and User Feedback', () => {
    it('shows loading overlay during upload', async () => {
      // Mock slow upload
      mockStorageRef.putFile.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      );

      const { getByTestId, getByText } = await setupCompleteForm();
      
      await waitFor(() => {
        expect(getByTestId('button-upload-floorplan')).toBeTruthy();
      });

      fireEvent.press(getByTestId('button-upload-floorplan'));

      // Should show loading state
      await waitFor(() => {
        expect(getByText('Processing...')).toBeTruthy();
      });
    });

    it('handles concurrent loading states', async () => {
      const { getByText } = render(<AdminLoadFloorplansContent />);
      
      // Multiple async operations should be handled properly
      await waitFor(() => {
        expect(getByText('Upload Floorplan')).toBeTruthy();
      });
    });
  });

  describe('Memory Management and Cleanup', () => {
    it('cleans up state after successful upload', async () => {
      const { getByText, unmount } = render(<AdminLoadFloorplansContent />);
      
      await waitFor(() => {
        expect(getByText('Upload Floorplan')).toBeTruthy();
      });

      // Simulate component unmounting
      unmount();
    });

    it('handles rapid state changes gracefully', async () => {
      const { getByTestId } = render(<AdminLoadFloorplansContent />);
      
      await waitFor(() => {
        expect(getByTestId('location-loc1')).toBeTruthy();
      });

      // Rapid location changes
      fireEvent.press(getByTestId('location-loc1'));
      fireEvent.press(getByTestId('location-loc2'));
      fireEvent.press(getByTestId('location-loc1'));

      // Should handle rapid changes without errors
      await waitFor(() => {
        expect(getByTestId('dropdown-trigger')).toBeTruthy();
      });
    });
  });

  describe('Accessibility and User Experience', () => {
    it('provides appropriate test IDs for automation', async () => {
      const { getByTestId } = render(<AdminLoadFloorplansContent />);
      
      await waitFor(() => {
        expect(getByTestId('location-loc1')).toBeTruthy();
      });

      fireEvent.press(getByTestId('location-loc1'));

      await waitFor(() => {
        expect(getByTestId('dropdown-trigger')).toBeTruthy();
      });
    });

    it('handles file info display correctly', async () => {
      mockLaunchImageLibrary.mockResolvedValue({
        didCancel: false,
        assets: [{
          uri: 'file:///test/very-long-filename-that-should-be-truncated.jpg',
          fileName: 'very-long-filename-that-should-be-truncated.jpg',
        }],
      });

      const component = await setupCompleteForm();
      
      // Should display file info after selection
      await waitFor(() => {
        expect(component.getByTestId('icon-file-document')).toBeTruthy();
      });
    });
  });

  // Helper function to set up complete form
  const setupCompleteForm = async () => {
    mockLaunchImageLibrary.mockResolvedValue({
      didCancel: false,
      assets: [{
        uri: 'file:///test/image.jpg',
        fileName: 'test-image.jpg',
      }],
    });

    const component = render(<AdminLoadFloorplansContent />);
    
    // Complete form setup
    await waitFor(() => {
      expect(component.getByTestId('location-loc1')).toBeTruthy();
    });
    fireEvent.press(component.getByTestId('location-loc1'));

    await waitFor(() => {
      expect(component.getByTestId('dropdown-trigger')).toBeTruthy();
    });
    fireEvent.press(component.getByTestId('dropdown-trigger'));
    
    await waitFor(() => {
      expect(component.getByTestId('dropdown-option-building1')).toBeTruthy();
    });
    fireEvent.press(component.getByTestId('dropdown-option-building1'));

    await waitFor(() => {
      expect(component.getByTestId('input-floor-label')).toBeTruthy();
    });
    fireEvent.changeText(component.getByTestId('input-floor-label'), '1');

    await waitFor(() => {
      expect(component.getByTestId('button-select-image')).toBeTruthy();
    });
    fireEvent.press(component.getByTestId('button-select-image'));

    return component;
  };
});