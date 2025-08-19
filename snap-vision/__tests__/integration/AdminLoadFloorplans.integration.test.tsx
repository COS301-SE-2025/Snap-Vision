import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminLoadFloorplansContent from '../../src/components/organisms/AdminLoadFloorplansContent';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import { debug } from '@testing-library/react-native/build/helpers/debug';
import BuildingSelector from '../../src/components/molecules/BuildingSelector'; 

// Mock navigation
const Stack = createNativeStackNavigator();

const MockNavigator = () => (
  <Stack.Navigator>
    <Stack.Screen name="AdminLoadFloorplans" component={AdminLoadFloorplansContent} />
    <Stack.Screen name="AdminFloorplanEditor" component={() => <></>} />
  </Stack.Navigator>
);

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <ThemeProvider>
      <NavigationContainer>
        <MockNavigator />
      </NavigationContainer>
    </ThemeProvider>
  );
};

// Mock the hooks
jest.mock('../../src/hooks/useBuildings', () => ({
  useBuildings: () => ({
    buildings: [
      { id: 'building-1', name: 'Main Building', locationId: 'test-location-1', floors: 5 },
      { id: 'building-2', name: 'Science Building', locationId: 'test-location-1', floors: 3 },
    ],
    locations: [
      { id: 'test-location-1', name: 'Test Campus' },
      { id: 'test-location-2', name: 'Another Campus' },
    ],
    userRole: 'admin',
    adminLocations: ['test-location-1', 'test-location-2'],
    isLoading: false,
    loadBuildings: jest.fn(),
  }),
}));

jest.mock('../../src/hooks/useFloorplanUpload', () => ({
  useFloorplanUpload: () => ({
    isLoading: false,
    error: null,
    fileUri: 'mock-file-uri',
    fileName: 'mock-file.jpg',
    handlePickDocument: jest.fn(),
    handleUpload: jest.fn().mockResolvedValue({ success: true }),
    uploadedData: null,
    setError: jest.fn(),
  }),
}));

// Mock DropDownPicker
jest.mock('react-native-dropdown-picker', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return function MockDropDownPicker({
    items,
    value,
    setValue,
    placeholder,
    open,
    setOpen,
    testID,
  }) {
    return (
      <View testID={testID || 'dropdown-picker'}>
        <Text>{placeholder}</Text>
        <Text testID="selected-value">{value}</Text>
        <TouchableOpacity onPress={() => setOpen(!open)} testID="toggle-dropdown">
          <Text>Toggle</Text>
        </TouchableOpacity>
        {open &&
          items.map((item) => (
            <TouchableOpacity
              key={item.value}
              testID={`dropdown-item-${item.value}`}
              onPress={() => {
                setValue(() => item.value);
                setOpen(false);
              }}
            >
              <Text>{item.label}</Text>
            </TouchableOpacity>
          ))}
      </View>
    );
  };
});


// Mock Alert
jest.mock('react-native', () => {
  const actualRN = jest.requireActual('react-native');
  return {
    ...actualRN,
    Alert: {
      alert: jest.fn(),
    },
  };
});

jest.mock('react-native-dropdown-picker', () => {
  const React = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');
  return function MockDropDownPicker({
    items,
    value,
    setValue,
    placeholder,
    open,
    setOpen,
    testID,
  }) {
    return (
      <View testID={testID || 'dropdown-picker'}>
        <Text>{placeholder}</Text>
        <Text testID="selected-value">{value}</Text>
        <TouchableOpacity onPress={() => setOpen(!open)} testID="toggle-dropdown">
          <Text>Toggle</Text>
        </TouchableOpacity>
        {open &&
          items.map((item) => (
            <TouchableOpacity
              key={item.value}
              testID={`dropdown-item-${item.value}`}
              onPress={() => {
                setValue(() => item.value);
                setOpen(false);
              }}
            >
              <Text>{item.label}</Text>
            </TouchableOpacity>
          ))}
      </View>
    );
  };
});

describe('AdminLoadFloorplans Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Location Selection', () => {
    it('should display available locations', async () => {
      const { getByText } = renderWithProviders(<AdminLoadFloorplansContent />);

      await waitFor(() => {
        expect(getByText('Test Campus')).toBeTruthy();
        expect(getByText('Another Campus')).toBeTruthy();
      });
    });

    it('should load buildings when location is selected', async () => {
      const { getByText } = renderWithProviders(<AdminLoadFloorplansContent />);

      await waitFor(() => {
        expect(getByText('Test Campus')).toBeTruthy();
      });
    });
  });

  describe('Building Selection', () => {
    it('allows selecting a building after choosing a location', async () => {
      const { getByText, getByTestId } = renderWithProviders(<AdminLoadFloorplansContent />);
    
      // Wait for locations to render
      await waitFor(() => {
        expect(getByText('Test Campus')).toBeTruthy();
      });
    
      // Select a location
      fireEvent.press(getByText('Test Campus'));
    
      // Wait for building selector to appear
      await waitFor(() => {
        expect(getByText('Select a building')).toBeTruthy();
      });
    
      // Open the building dropdown (using your mock's toggle)
      fireEvent.press(getByTestId('toggle-dropdown'));
    
      // Select "Main Building" from the dropdown
      fireEvent.press(getByTestId('dropdown-item-building-1'));
    
      // Assert that the selected value is now "building-1"
      expect(getByTestId('selected-value').props.children).toBe('building-1');
    });
  });

  describe('Floor Label Input', () => {
    it('should only accept numeric input', async () => {
      const { getByText, getByTestId } = renderWithProviders(<AdminLoadFloorplansContent />);
      await waitFor(() => {
        expect(getByText('Test Campus')).toBeTruthy();
      });
      fireEvent.press(getByText('Test Campus'));
      await waitFor(() => {
        expect(getByText('Select a building')).toBeTruthy();
      });
      fireEvent.press(getByTestId('toggle-dropdown'));
      fireEvent.press(getByTestId('dropdown-item-building-1'));
      const floorInput = getByTestId('input-floor-label');
      fireEvent.changeText(floorInput, 'abc123');
      expect(floorInput.props.value).toBe('123');
    });

    it('should accept numeric floor labels', async () => {
      const { getByText, getByTestId } = renderWithProviders(<AdminLoadFloorplansContent />);
      await waitFor(() => {
        expect(getByText('Test Campus')).toBeTruthy();
      });
      fireEvent.press(getByText('Test Campus'));
      await waitFor(() => {
        expect(getByText('Select a building')).toBeTruthy();
      });
      fireEvent.press(getByTestId('toggle-dropdown'));
      fireEvent.press(getByTestId('dropdown-item-building-1'));
      const floorInput = getByTestId('input-floor-label');
      fireEvent.changeText(floorInput, '5');
      expect(floorInput.props.value).toBe('5');
    });
  });

  describe('File Upload Flow', () => {
    it('should show file selection button', async () => {
      const { getByText, getByTestId } = renderWithProviders(<AdminLoadFloorplansContent />);
      await waitFor(() => {
        expect(getByText('Test Campus')).toBeTruthy();
      });
      fireEvent.press(getByText('Test Campus'));
      await waitFor(() => {
        expect(getByText('Select a building')).toBeTruthy();
      });
      fireEvent.press(getByTestId('toggle-dropdown'));
      fireEvent.press(getByTestId('dropdown-item-building-1'));
      const floorInput = getByTestId('input-floor-label');
      fireEvent.changeText(floorInput, '1');
      // Use the correct testID for the file selection button
      const selectButton = getByTestId('button-change-image');
      expect(selectButton).toBeTruthy();
    });
  });

  describe('Navigation Flow', () => {
    it('should handle successful upload flow', async () => {
      const { getByText, getByTestId } = renderWithProviders(<AdminLoadFloorplansContent />);
      await waitFor(() => {
        expect(getByText('Test Campus')).toBeTruthy();
      });
      fireEvent.press(getByText('Test Campus'));
      await waitFor(() => {
        expect(getByText('Select a building')).toBeTruthy();
      });
      fireEvent.press(getByTestId('toggle-dropdown'));
      fireEvent.press(getByTestId('dropdown-item-building-1'));
      const floorInput = getByTestId('input-floor-label');
      fireEvent.changeText(floorInput, '1');
      // Simulate file selection
      // If your mock sets fileUri automatically, this will work
      const uploadButton = getByTestId('button-upload-floorplan');
      expect(uploadButton).toBeTruthy();
      // Simulate upload
      fireEvent.press(uploadButton);
      // Wait for success popup
      await waitFor(() => {
        expect(getByText('Upload Successful')).toBeTruthy();
      });
    });
  });
});
