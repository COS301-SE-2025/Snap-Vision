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

