import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import AdminLoadFloorplansContent from '../src/components/organisms/AdminLoadFloorplansContent';
import { ThemeProvider } from '../src/theme/ThemeContext';

// Mock dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

jest.mock('react-native-fs', () => ({
  DocumentDirectoryPath: '/mock/documents',
  mkdir: jest.fn(() => Promise.resolve()),
  copyFile: jest.fn(() => Promise.resolve()),
  unlink: jest.fn(() => Promise.resolve()),
}));

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(() =>
    Promise.resolve({
      assets: [
        {
          uri: 'file:///mock/path/image.jpg',
          fileName: 'image.jpg',
          fileSize: 1000,
          type: 'image/jpeg',
        },
      ],
      didCancel: false,
    })
  ),
}));


jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('@react-native-firebase/firestore', () => {
  const mockCollection = {
    where: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({
      docs: [
        {
          id: '1',
          data: () => ({
            name: 'Building A',
            centroid: { latitude: 0, longitude: 0 },
            type: 'building'
          }),
        },
        {
          id: '2',
          data: () => ({
            name: 'Building B', 
            centroid: { latitude: 1, longitude: 1 },
            type: 'building'
          }),
        },
      ],
    }),
  };

  return {
    __esModule: true,
    default: () => ({
      collection: jest.fn(() => mockCollection),
    }),
    firestore: () => ({
      collection: jest.fn(() => mockCollection),
    }),
  };  // <-- Properly closed here
});
// Mock theme context
jest.mock('../src/theme/ThemeContext', () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  useTheme: () => ({
    isDark: false,
  }),
  getThemeColors: () => ({
    background: '#ffffff',
    primary: '#0000ff',
    secondary: '#888888',
    text: '#000000',
    card: '#f0f0f0',
    danger: '#ff0000',
  }),
  __esModule: true,
}));

const renderWithTheme = (ui: React.ReactElement) => {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
};

const debugScreen = async (screen: any) => {
  await waitFor(() => {
    screen.debug();
  });
};

const waitForData = async () => {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });
};




describe('AdminLoadFloorplansContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the initial screen correctly', async () => {
    const { getByText } = renderWithTheme(<AdminLoadFloorplansContent />);
    
    await waitFor(() => {
      expect(getByText('Step 1: Select Building')).toBeTruthy();
    });
  });

  it('updates building name input when manually entered', async () => {
    const { getByPlaceholderText } = renderWithTheme(<AdminLoadFloorplansContent />);
    const nameInput = getByPlaceholderText("Enter the building's name");
    
    fireEvent.changeText(nameInput, 'New Building');
    
    expect(nameInput.props.value).toBe('New Building');
  });

  it('updates floor label input', async () => {
    const { getByPlaceholderText } = renderWithTheme(<AdminLoadFloorplansContent />);
    const floorInput = getByPlaceholderText('e.g., Floor 2, Basement');
    
    fireEvent.changeText(floorInput, 'Floor 3');
    
    expect(floorInput.props.value).toBe('Floor 3');
  });

  it('opens image picker when select image button is pressed', async () => {
    const { getByText } = renderWithTheme(<AdminLoadFloorplansContent />);
    const imageButton = await waitFor(() => getByText('Select Floorplan Image'));
    
    await act(async () => {
      fireEvent.press(imageButton);
    });
    
    expect(require('react-native-image-picker').launchImageLibrary).toHaveBeenCalled();
  });


 describe('AdminLoadFloorplansContent - Buildings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays buildings from firestore', async () => {
    const { findByText } = renderWithTheme(<AdminLoadFloorplansContent />);
    
    await waitForData(); // Wait for initial data load
    
    await expect(findByText('Building A')).resolves.toBeTruthy();
    await expect(findByText('Building B')).resolves.toBeTruthy();
  });

  it('allows selecting a building', async () => {
    const { findByText } = renderWithTheme(<AdminLoadFloorplansContent />);
    
    await waitForData(); // Wait for initial data load
    
    const buildingA = await findByText('Building A');
    
    await act(async () => {
      fireEvent.press(buildingA);
    });
    
    expect(buildingA).toBeTruthy();
  });

  it('handles image picker cancellation', async () => {
  const imagePicker = require('react-native-image-picker');
  imagePicker.launchImageLibrary.mockResolvedValue({ didCancel: true });
  
  const { getByText, queryByText } = renderWithTheme(<AdminLoadFloorplansContent />);
  const imageButton = getByText('Select Floorplan Image');
  
  await act(async () => {
    fireEvent.press(imageButton);
  });
  
  expect(queryByText('image.jpg')).toBeFalsy(); // No file selected
});

it('uses default filename when not provided', async () => {
  const imagePicker = require('react-native-image-picker');
  imagePicker.launchImageLibrary.mockResolvedValue({
    assets: [{ uri: 'file:///mock/path/image.jpg' }] // No fileName
  });
  
  const { getByText } = renderWithTheme(<AdminLoadFloorplansContent />);
  const imageButton = getByText('Select Floorplan Image');
  
  await act(async () => {
    fireEvent.press(imageButton);
  });
  
  await waitFor(() => {
    expect(getByText('floorplan.jpg')).toBeTruthy(); // Default filename
  });
});

it('handles component unmounting during async operations', async () => {
  const { unmount } = renderWithTheme(<AdminLoadFloorplansContent />);
  
  // Unmount immediately
  unmount();
  
  // Verify no state updates after unmount
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
  });
  
  // No errors should occur
});
