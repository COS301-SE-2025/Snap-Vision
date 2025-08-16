import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import AdminLoadFloorplansContent from '../src/components/organisms/AdminLoadFloorplansContent';

// Mock all dependencies
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
  }),
}));

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock Firebase modules with proper structure
const mockFirestore = {
  collection: jest.fn(() => ({
    get: jest.fn().mockResolvedValue({
      docs: [
        { id: 'loc1', data: () => ({ name: 'Test Location 1' }) },
        { id: 'loc2', data: () => ({ name: 'Test Location 2' }) },
      ],
    }),
  })),
  doc: jest.fn(() => ({
    get: jest.fn().mockResolvedValue({
      data: () => ({
        role: 'admin',
        adminLocations: ['loc1', 'loc2'],
      }),
    }),
    set: jest.fn().mockResolvedValue(undefined),
  })),
  FieldValue: {
    serverTimestamp: jest.fn(),
  },
};

const mockAuth = {
  currentUser: {
    uid: 'test-user-id',
  },
};

const mockStorage = {
  ref: jest.fn(() => ({
    putFile: jest.fn().mockResolvedValue(undefined),
    getDownloadURL: jest.fn().mockResolvedValue('https://test-url.com/image.jpg'),
  })),
};

jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  default: () => mockFirestore,
}));

jest.mock('@react-native-firebase/auth', () => ({
  __esModule: true,
  default: () => mockAuth,
}));

jest.mock('@react-native-firebase/storage', () => ({
  __esModule: true,
  default: () => mockStorage,
}));

// Mock theme
jest.mock('../src/theme/ThemeContext', () => ({
  useTheme: () => ({
    isDark: false,
    colors: {
      background: '#FFFFFF',
      text: '#000000',
      primary: '#007AFF',
      secondary: '#8E8E93',
      card: '#F2F2F7',
    },
  }),
}));

jest.mock('../src/theme', () => ({
  getThemeColors: () => ({
    background: '#FFFFFF',
    text: '#000000',
    primary: '#007AFF',
    secondary: '#8E8E93',
    card: '#F2F2F7',
  }),
}));

// Mock components
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');
jest.mock('react-native-dropdown-picker', () => 'DropDownPicker');

describe('AdminLoadFloorplansContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', async () => {
    const { getByText } = render(<AdminLoadFloorplansContent />);
    
    await waitFor(() => {
      expect(getByText('Upload Floorplan')).toBeTruthy();
    });
  });

  it('displays the main title', async () => {
    const { getByText } = render(<AdminLoadFloorplansContent />);
    
    await waitFor(() => {
      expect(getByText('Upload Floorplan')).toBeTruthy();
    });
  });

  it('shows location selection', async () => {
    const { getByText } = render(<AdminLoadFloorplansContent />);
    
    await waitFor(() => {
      expect(getByText('Select a Location')).toBeTruthy();
    });
  });

  it('loads locations on mount', async () => {
    render(<AdminLoadFloorplansContent />);
    
    await waitFor(() => {
      expect(mockFirestore.collection).toHaveBeenCalledWith('locations');
    });
  });

  it('loads user information', async () => {
    render(<AdminLoadFloorplansContent />);
    
    await waitFor(() => {
      expect(mockFirestore.doc).toHaveBeenCalledWith('userInformation/test-user-id');
    });
  });

  it('handles admin user role', async () => {
    const { getByText } = render(<AdminLoadFloorplansContent />);
    
    await waitFor(() => {
      expect(getByText('Test Location 1')).toBeTruthy();
      expect(getByText('Test Location 2')).toBeTruthy();
    });
  });

  it('handles editor user role', async () => {
    mockFirestore.doc.mockReturnValue({
      get: jest.fn().mockResolvedValue({
        data: () => ({
          role: 'editor',
          adminLocations: ['loc1'],
        }),
      }),
      set: jest.fn().mockResolvedValue(undefined),
    });

    const { getByText } = render(<AdminLoadFloorplansContent />);
    
    await waitFor(() => {
      expect(getByText('Test Location 1')).toBeTruthy();
    });
  });

  it('handles no user role', async () => {
    mockFirestore.doc.mockReturnValue({
      get: jest.fn().mockResolvedValue({
        data: () => ({
          role: undefined,
          adminLocations: [],
        }),
      }),
      set: jest.fn().mockResolvedValue(undefined),
    });

    const { getByText } = render(<AdminLoadFloorplansContent />);
    
    await waitFor(() => {
      expect(getByText('Upload Floorplan')).toBeTruthy();
    });
  });

  it('handles empty buildings', async () => {
    mockFirestore.collection.mockReturnValueOnce({
      get: jest.fn().mockResolvedValue({
        docs: [],
      }),
    });

    const { getByText } = render(<AdminLoadFloorplansContent />);
    
    await waitFor(() => {
      expect(getByText('Upload Floorplan')).toBeTruthy();
    });
  });

