jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    ActivityIndicator: (props: any) => <RN.View testID="activity-indicator" {...props} />,
  };
});
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AdminLoadFloorplansContent from '../src/components/organisms/AdminLoadFloorplansContent';

// Mock all dependencies
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
    secondary: 'gray',
    text: 'black',
    card: 'lightgray',
  }),
}));

jest.mock('../src/components/atoms/AppInput', () => {
  const React = require('react');
  const { TextInput } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => (
      <TextInput
        {...props}
        testID={props.testID || 'app-input'}
        onChangeText={props.onChangeText}
      />
    ),
  };
});

jest.mock('../src/components/atoms/AppButton', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => (
      <TouchableOpacity
        {...props}
        testID={props.testID || 'app-button'}
        onPress={props.onPress}
        disabled={props.disabled}
      >
        <Text>{props.title}</Text>
      </TouchableOpacity>
    ),
  };
});

jest.mock('../src/components/atoms/AppSecondaryButton', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => (
      <TouchableOpacity
        {...props}
        testID={props.testID || 'app-secondary-button'}
        onPress={props.onPress}
      >
        <Text>{props.title}</Text>
      </TouchableOpacity>
    ),
  };
});

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
  const { Text, TouchableOpacity, View } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) =>
      props.visible ? (
        <View testID="standard-popup">
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
        </View>
      ) : null,
  };
});

jest.mock('../src/components/molecules/LocationSelector', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  return {
    __esModule: true,
    LocationSelector: (props: any) => (
      <>
        <Text>Location Selector</Text>
        {props.locations.map((location: any) => (
          <TouchableOpacity
            key={location.id}
            onPress={() => props.onLocationSelect(location.id)}
            testID={`location-${location.id}`}
          >
            <Text>{location.name}</Text>
          </TouchableOpacity>
        ))}
      </>
    ),
  };
});

jest.mock('../src/components/molecules/BuildingSelector', () => {
  const React = require('react');
  const { TouchableOpacity, Text, View } = require('react-native');
  return {
    __esModule: true,
    default: (props: any) => (
      <View>
        <Text>{props.title}</Text>
        {props.buildings.length === 0 ? (
          <Text>No buildings available. Please check your connection.</Text>
        ) : (
          props.buildings.map((building: any) => (
            <TouchableOpacity
              key={building.id}
              onPress={() => props.setSelectedBuildingId(building.id)}
              testID={`building-${building.id}`}
            >
              <Text>{building.name}</Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    ),
  };
});

// Mock hooks
const mockUseBuildings = {
  buildings: [
    { id: 'b1', name: 'Building 1' },
    { id: 'b2', name: 'Building 2' },
  ],
  locations: [
    { id: 'loc1', name: 'Location 1' },
    { id: 'loc2', name: 'Location 2' },
  ],
  userRole: 'admin',
  adminLocations: ['loc1', 'loc2'],
  isLoading: false,
  loadBuildings: jest.fn(),
};

type UploadedDataType = {
  buildingId: string;
  floorLabel: string;
  imageUri: string;
  locationId: string;
} | null;

const mockUseFloorplanUpload: {
  isLoading: boolean;
  error: string;
  fileUri: string;
  fileName: string;
  uploadedData: UploadedDataType;
  handlePickDocument: jest.Mock;
  handleUpload: jest.Mock;
  setError: jest.Mock;
} = {
  isLoading: false,
  error: '',
  fileUri: '',
  fileName: '',
  uploadedData: null,
  handlePickDocument: jest.fn(),
  handleUpload: jest.fn(),
  setError: jest.fn(),
};

jest.mock('../src/hooks/useBuildings', () => ({
  useBuildings: () => mockUseBuildings,
}));

jest.mock('../src/hooks/useFloorplanUpload', () => ({
  useFloorplanUpload: () => mockUseFloorplanUpload,
}));

const mockNavigate = jest.fn();

jest.mock('@react-navigation/native', () => {
  return {
    ...jest.requireActual('@react-navigation/native'),
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

describe('AdminLoadFloorplansContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFloorplanUpload.handleUpload.mockResolvedValue({ success: true });
    mockUseFloorplanUpload.handlePickDocument.mockResolvedValue({ success: true, uri: 'test-uri', name: 'test.jpg' });
  });

  it('renders header and initial state', () => {
    const { getByText } = render(<AdminLoadFloorplansContent />);
    expect(getByText('Upload Floorplan')).toBeTruthy();
  });

  it('selects location and loads buildings', () => {
    const { getByTestId } = render(<AdminLoadFloorplansContent />);
    fireEvent.press(getByTestId('location-loc1'));
    expect(mockUseBuildings.loadBuildings).toHaveBeenCalledWith('loc1');
  });

  it('selects building and shows floor label input', () => {
    const { getByTestId, getByText } = render(<AdminLoadFloorplansContent />);
    fireEvent.press(getByTestId('location-loc1'));
    fireEvent.press(getByTestId('building-b1'));
    expect(getByText('Step 2: Floor Information')).toBeTruthy();
  });

  it('enters floor label and shows file selection', () => {
    const { getByTestId, getByText, getByPlaceholderText } = render(<AdminLoadFloorplansContent />);
    fireEvent.press(getByTestId('location-loc1'));
    fireEvent.press(getByTestId('building-b1'));
    
    const input = getByPlaceholderText('Enter floor number (e.g., 1, 2, 3...)');
    fireEvent.changeText(input, '2');
    
    expect(getByText('Step 3: Select Floorplan File')).toBeTruthy();
  });

    it('calls handleUpload with correct arguments and shows success popup on upload', async () => {
    // Set up the mock to simulate a file being selected
    mockUseFloorplanUpload.fileUri = 'test-uri';
    mockUseFloorplanUpload.fileName = 'test.jpg';
    mockUseFloorplanUpload.handleUpload.mockResolvedValue({ success: true });
  
    const { getByTestId, getByText } = render(<AdminLoadFloorplansContent />);
    
    // Select location
    fireEvent.press(getByTestId('location-loc1'));
    // Select building
    fireEvent.press(getByTestId('building-b1'));
    // Enter floor label
    fireEvent.changeText(getByTestId('input-floor-label'), '2');
    // Simulate file already picked (mock above)
    // Press upload button
    fireEvent.press(getByTestId('button-upload-floorplan'));
  
    await waitFor(() => {
      // handleUpload should be called with correct arguments
      expect(mockUseFloorplanUpload.handleUpload).toHaveBeenCalledWith(
        { id: 'b1', name: 'Building 1' },
        'loc1',
        '2',
        'admin',
        ['loc1', 'loc2']
      );
      // Success popup should be shown
      expect(getByText('Upload Successful')).toBeTruthy();
    });
  });

    it('shows error popup when upload fails', async () => {
      // Set up the mock to simulate a file being selected and upload failure
      mockUseFloorplanUpload.fileUri = 'test-uri';
      mockUseFloorplanUpload.fileName = 'test.jpg';
      mockUseFloorplanUpload.handleUpload.mockResolvedValue({ success: false });
      mockUseFloorplanUpload.error = "Upload failed";
    
      const { getByTestId, getByText } = render(<AdminLoadFloorplansContent />);
      
      // Select location
      fireEvent.press(getByTestId('location-loc1'));
      // Select building
      fireEvent.press(getByTestId('building-b1'));
      // Enter floor label
      fireEvent.changeText(getByTestId('input-floor-label'), '2');
      // Press upload button
      fireEvent.press(getByTestId('button-upload-floorplan'));
    
      await waitFor(() => {
        // handleUpload should be called with correct arguments
        expect(mockUseFloorplanUpload.handleUpload).toHaveBeenCalledWith(
          { id: 'b1', name: 'Building 1' },
          'loc1',
          '2',
          'admin',
          ['loc1', 'loc2']
        );
        // Error popup should be shown
        expect(getByText('Error')).toBeTruthy();
      });
    });

    it('shows navigation confirmation popup after successful upload and navigates to POI editor', async () => {
      // Simulate a successful upload and uploadedData
      mockUseFloorplanUpload.fileUri = 'test-uri';
      mockUseFloorplanUpload.fileName = 'test.jpg';
      mockUseFloorplanUpload.handleUpload.mockResolvedValue({ success: true });
      mockUseFloorplanUpload.uploadedData = {
        buildingId: 'b1',
        floorLabel: '2',
        imageUri: 'test-uri',
        locationId: 'loc1',
      };
    
      const { getByTestId, getByText } = render(<AdminLoadFloorplansContent />);
      
      // Select location
      fireEvent.press(getByTestId('location-loc1'));
      // Select building
      fireEvent.press(getByTestId('building-b1'));
      // Enter floor label
      fireEvent.changeText(getByTestId('input-floor-label'), '2');
      // Press upload button
      fireEvent.press(getByTestId('button-upload-floorplan'));
    
      // Wait for success popup
      await waitFor(() => {
        expect(getByText('Upload Successful')).toBeTruthy();
      });
    
      // Confirm success popup to show navigation confirmation
      fireEvent.press(getByText('Continue'));
    
      await waitFor(() => {
        expect(getByText('Add Room POIs')).toBeTruthy();
      });
    
      // Confirm navigation to POI editor
      fireEvent.press(getByText('Add POIs'));
    
      expect(mockNavigate).toHaveBeenCalledWith('AdminFloorplanEditor', mockUseFloorplanUpload.uploadedData);
    });
    
    it('resets form when choosing Later on navigation confirmation popup', async () => {
      // Simulate a successful upload and uploadedData
      mockUseFloorplanUpload.fileUri = 'test-uri';
      mockUseFloorplanUpload.fileName = 'test.jpg';
      mockUseFloorplanUpload.handleUpload.mockResolvedValue({ success: true });
      mockUseFloorplanUpload.uploadedData = {
        buildingId: 'b1',
        floorLabel: '2',
        imageUri: 'test-uri',
        locationId: 'loc1',
      };
    
      const { getByTestId, getByText, queryByText } = render(<AdminLoadFloorplansContent />);
      
      // Select location
      fireEvent.press(getByTestId('location-loc1'));
      // Select building
      fireEvent.press(getByTestId('building-b1'));
      // Enter floor label
      fireEvent.changeText(getByTestId('input-floor-label'), '2');
      // Press upload button
      fireEvent.press(getByTestId('button-upload-floorplan'));
    
      // Wait for success popup
      await waitFor(() => {
        expect(getByText('Upload Successful')).toBeTruthy();
      });
    
      // Confirm success popup to show navigation confirmation
      fireEvent.press(getByText('Continue'));
    
      await waitFor(() => {
        expect(getByText('Add Room POIs')).toBeTruthy();
      });
    
      // Press Later to reset form
      fireEvent.press(getByText('Later'));
    
      // The navigation confirmation popup should be gone
      expect(queryByText('Add Room POIs')).toBeNull();
    });
});
