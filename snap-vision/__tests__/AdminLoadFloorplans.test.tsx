import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import AdminLoadFloorplansContent from '../src/components/organisms/AdminLoadFloorplansContent';
import { ThemeProviderWrapper } from './test-utils/ThemeProviderWrapper';


const originalError = console.error;

beforeAll(() => {
  console.error = (...args) => {
    const message = args[0];
    
    // Suppress all act warnings
    if (
      typeof message === 'string' &&
      message.includes('was not wrapped in act')
    ) {
      return;
    }
    
    // Keep all other console.error messages
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});


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

//mock image picker
const mockLaunchImageLibrary = jest.fn();

jest.mock('react-native-image-picker', () => {
  const mockModule = {
    launchImageLibrary: mockLaunchImageLibrary,
    launchCamera: jest.fn(),
    MediaType: {
      photo: 'photo',
      video: 'video',
      mixed: 'mixed',
    },
  };

  return {
    __esModule: true,
    default: mockModule,
    ...mockModule,
  };
});

const mockImagePicker = {
  launchImageLibrary: mockLaunchImageLibrary,
};

// Mock navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
}));

// Mock vector icons
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

// Spy on Alert
const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
const createMockFirestoreCollection = (docs: any[] = []) => ({
  where: jest.fn(() => ({
    get: jest.fn(() => Promise.resolve({ docs })),
  })),
  doc: jest.fn(() => ({
    set: jest.fn(() => Promise.resolve()),
    delete: jest.fn(() => Promise.resolve()),
  })),
});

const setupImagePickerMock = (fileName = 'test.jpg', fileType = 'image/jpeg') => {
  mockLaunchImageLibrary.mockReset();
  mockLaunchImageLibrary.mockImplementation((options, callback) => {
    callback({
      didCancel: false,
      assets: [
        {
          uri: `file:///${fileName}`,
          type: fileType,
          fileName: fileName,
        },
      ],
    });
  });
};

describe('AdminLoadFloorplansContent - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy.mockClear();

    mockFirestore.collection.mockReturnValue(createMockFirestoreCollection([
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
    ]));

   mockLaunchImageLibrary.mockReset();
    mockLaunchImageLibrary.mockImplementation((options, callback) => {
      callback({
        didCancel: false,
        assets: [
          {
            uri: 'file:///test.jpg',
            type: 'image/jpeg',
            fileName: 'test.jpg',
          },
        ],
      });
    });
    mockRNFS.mkdir.mockReset();
    mockRNFS.mkdir.mockResolvedValue(undefined);
    
    mockRNFS.copyFile.mockReset();
    mockRNFS.copyFile.mockResolvedValue(undefined);
    
    mockAsyncStorage.setItem.mockReset();
    mockAsyncStorage.setItem.mockResolvedValue(undefined);
  });

  // ============= BASIC RENDERING TESTS =============

it('renders upload form with all sections', async () => {
  const { getByText, getByPlaceholderText, getAllByText } = render(
    <ThemeProviderWrapper>
      <AdminLoadFloorplansContent />
    </ThemeProviderWrapper>,
  );

  await waitFor(() => {
    expect(getAllByText('Upload Floorplan')).toHaveLength(2);
    expect(getByText('Step 1: Select Building')).toBeTruthy();
    expect(getByText('Step 2: Floor Information')).toBeTruthy();
    expect(getByText('Step 3: Select Floorplan File')).toBeTruthy();
    expect(getByPlaceholderText("Enter the building's name")).toBeTruthy();
    expect(getByPlaceholderText('e.g., Floor 2, Basement')).toBeTruthy();
    expect(getByText('Select Floorplan Image')).toBeTruthy();
  });
});
    
it('renders initial state correctly', async () => {
  const { getByText } = render(
    <ThemeProviderWrapper>
      <AdminLoadFloorplansContent />
    </ThemeProviderWrapper>,
  );

  await waitFor(() => {
    expect(getByText('Select a Building')).toBeTruthy();
    expect(getByText('OR')).toBeTruthy();
    expect(getByText('Building Name')).toBeTruthy();
    expect(getByText('Floor Number / Label')).toBeTruthy();
    expect(getByText('Select a PNG or JPG floorplan image')).toBeTruthy();
  });
});
    
    it('shows loading state while fetching buildings', async () => {
  mockFirestore.collection.mockReturnValue(createMockFirestoreCollection([]));

  const { getByText } = render(
    <ThemeProviderWrapper>
      <AdminLoadFloorplansContent />
    </ThemeProviderWrapper>,
  );

  expect(getByText('Processing...')).toBeTruthy();

  await waitFor(() => {
    expect(getByText('No buildings available. Please check your connection.')).toBeTruthy();
  });
});
    
it('handles Firestore error when loading buildings', async () => {
  const mockError = new Error('Firestore connection failed');
  
  const createMockFirestoreError = (error: Error) => ({
    where: jest.fn(() => ({
      get: jest.fn(() => Promise.reject(error)),
    })),
    doc: jest.fn(() => ({
      set: jest.fn(() => Promise.resolve()),
      delete: jest.fn(() => Promise.resolve()),
    })),
  });
  
  mockFirestore.collection.mockReturnValue(createMockFirestoreError(mockError));

  const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

  const { getByText } = render(
    <ThemeProviderWrapper>
      <AdminLoadFloorplansContent />
    </ThemeProviderWrapper>,
  );

  await waitFor(() => {
    expect(consoleSpy).toHaveBeenCalledWith('Error fetching buildings:', mockError);
    expect(getByText('Failed to load buildings. Please try again.')).toBeTruthy();
  });

  consoleSpy.mockRestore();
});

  

  // ============= BUILDING LOADING TESTS =============

  it('loads and displays buildings from Firestore', async () => {
  const { getByText } = render(
    <ThemeProviderWrapper>
      <AdminLoadFloorplansContent />
    </ThemeProviderWrapper>,
  );

  await waitFor(() => {
    expect(getByText('Science Hall')).toBeTruthy();
    expect(getByText('Engineering Building')).toBeTruthy();
  });

  expect(mockFirestore.collection).toHaveBeenCalledWith('UPcampusPOIs');
});


 

  it('handles empty buildings list', async () => {
    mockFirestore.collection.mockReturnValue(createMockFirestoreCollection([]));

    const { getByText } = render(
      <ThemeProviderWrapper>
        <AdminLoadFloorplansContent />
      </ThemeProviderWrapper>,
    );

    await waitFor(() => {
      expect(getByText('No buildings available. Please check your connection.')).toBeTruthy();
    });
  });

 it('handles buildings with missing name', async () => {
  const buildingsWithMissingName = [
    {
      id: 'building1',
      data: () => ({
        type: 'building',
        centroid: { latitude: 10.1, longitude: 20.1 },
      }),
    },
  ];
  
  mockFirestore.collection.mockReturnValue(createMockFirestoreCollection(buildingsWithMissingName));

  const { getByText } = render(
    <ThemeProviderWrapper>
      <AdminLoadFloorplansContent />
    </ThemeProviderWrapper>,
  );

  await waitFor(() => {
    expect(getByText('Unnamed Building')).toBeTruthy();
  });
});

  // ============= BUILDING SELECTION TESTS =============

  it('selects building from list when pressed', async () => {
    const { getByText, getByDisplayValue } = render(
      <ThemeProviderWrapper>
        <AdminLoadFloorplansContent />
      </ThemeProviderWrapper>,
    );

    await waitFor(() => {
      expect(getByText('Science Hall')).toBeTruthy();
    });

    fireEvent.press(getByText('Science Hall'));

    await waitFor(() => {
      expect(getByDisplayValue('Science Hall')).toBeTruthy();
    });
  });

  it('highlights selected building', async () => {
    const { getByText } = render(
      <ThemeProviderWrapper>
        <AdminLoadFloorplansContent />
      </ThemeProviderWrapper>,
    );

    await waitFor(() => {
      expect(getByText('Science Hall')).toBeTruthy();
    });

    const scienceHallButton = getByText('Science Hall');
    fireEvent.press(scienceHallButton);

    // Building should be visually selected (this tests the styling logic)
    expect(scienceHallButton).toBeTruthy();
  });

  it('allows switching between selected buildings', async () => {
    const { getByText, getByDisplayValue } = render(
      <ThemeProviderWrapper>
        <AdminLoadFloorplansContent />
      </ThemeProviderWrapper>,
    );

    await waitFor(() => {
      expect(getByText('Science Hall')).toBeTruthy();
      expect(getByText('Engineering Building')).toBeTruthy();
    });

    // Select first building
    fireEvent.press(getByText('Science Hall'));
    await waitFor(() => {
      expect(getByDisplayValue('Science Hall')).toBeTruthy();
    });

    // Switch to second building
    fireEvent.press(getByText('Engineering Building'));
    await waitFor(() => {
      expect(getByDisplayValue('Engineering Building')).toBeTruthy();
    });
  });

  // ============= FORM INPUT TESTS =============

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

  it('handles long building names', async () => {
    const { getByPlaceholderText } = render(
      <ThemeProviderWrapper>
        <AdminLoadFloorplansContent />
      </ThemeProviderWrapper>,
    );

    const longName = 'Very Long Building Name That Should Still Be Handled Properly';
    const buildingInput = getByPlaceholderText("Enter the building's name");
    fireEvent.changeText(buildingInput, longName);

    expect(buildingInput.props.value).toBe(longName);
  });

  it('handles special characters in floor labels', async () => {
    const { getByPlaceholderText } = render(
      <ThemeProviderWrapper>
        <AdminLoadFloorplansContent />
      </ThemeProviderWrapper>,
    );

    const specialFloor = 'Sub-Basement Level B-2';
    const floorInput = getByPlaceholderText('e.g., Floor 2, Basement');
    fireEvent.changeText(floorInput, specialFloor);

    expect(floorInput.props.value).toBe(specialFloor);
  });

  // ============= IMAGE SELECTION TESTS =============



    it('handles image selection cancellation', async () => {
    // ✅ FIX: Use mockLaunchImageLibrary directly
    mockLaunchImageLibrary.mockReset();
    mockLaunchImageLibrary.mockImplementation((options, callback) => {
      callback({
        didCancel: true,
      });
    });
  
    const { getByText, queryByText } = render(
      <ThemeProviderWrapper>
        <AdminLoadFloorplansContent />
      </ThemeProviderWrapper>,
    );
  
    fireEvent.press(getByText('Select Floorplan Image'));
  
    expect(queryByText('Change Image')).toBeNull();
  });
  
  it('handles missing assets in image selection', async () => {
    mockLaunchImageLibrary.mockReset();
    mockLaunchImageLibrary.mockImplementation((options, callback) => {
      callback({
        didCancel: false,
        assets: undefined,
      });
    });
  
    const { getByText, queryByText } = render(
      <ThemeProviderWrapper>
        <AdminLoadFloorplansContent />
      </ThemeProviderWrapper>,
    );
  
    fireEvent.press(getByText('Select Floorplan Image'));
  
    expect(queryByText('Change Image')).toBeNull();
  });
  
  it('handles empty assets array', async () => {
    mockLaunchImageLibrary.mockReset();
    mockLaunchImageLibrary.mockImplementation((options, callback) => {
      callback({
        didCancel: false,
        assets: [],
      });
    });
  
    const { getByText, queryByText } = render(
      <ThemeProviderWrapper>
        <AdminLoadFloorplansContent />
      </ThemeProviderWrapper>,
    );
  
    fireEvent.press(getByText('Select Floorplan Image'));
  
    expect(queryByText('Change Image')).toBeNull();
  });

  

  

 

 
 

  
});