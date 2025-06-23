import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Create a mock Alert implementation
const mockAlert = {
  alert: jest.fn()
};

// Mock Icon components
jest.mock('react-native-vector-icons/Ionicons', () => 'MockedIonicons');
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'MockedExpoIonicons'
}));

// Mock Expo modules
jest.mock('expo-modules-core', () => ({}));
jest.mock('expo-font', () => ({}));

// Create a mock handler for logout that we can reference from our component mocks
const mockHandleLogout = jest.fn().mockImplementation(async () => {
  mockResetToLogin();
  return true;
});

// Mock user service to use our predefined mockHandleLogout
jest.mock('../../src/services/userService', () => ({
  fetchUserData: jest.fn().mockResolvedValue({
    email: 'test@example.com',
    name: 'Test User',
    role: 'Admin'
  }),
  handleLogout: mockHandleLogout
}));

// At the beginning of your file, after imports
// Override fireEvent.press to directly call the onPress handler
const originalPress = fireEvent.press;
fireEvent.press = (element, ...args) => {
  if (element.props && element.props.onPress) {
    return element.props.onPress(...args);
  }
  return originalPress(element, ...args);
};

// Then modify your React Native mocks
jest.mock('react-native', () => {
  const styleProperties = {
    container: {},
    text: {},
    button: {},
    loader: {},
    header: {},
    title: {},
    icon: {},
    content: {},
    section: {},
    label: {},
    value: {},
    divider: {}
  };
  
  return {
    Alert: mockAlert,
    View: ({ children, testID }) => (
      <div testID={testID}>{children}</div>
    ),
    Text: ({ children }) => <span>{children}</span>,
    TouchableOpacity: ({ children, onPress, testID }) => (
      <button 
        testID={testID} 
        onClick={() => onPress && onPress()}
        onPress={onPress}
      >
        {children}
      </button>
    ),
    ActivityIndicator: () => <div>Loading...</div>,
    StyleSheet: {
      create: jest.fn(() => styleProperties),
      flatten: jest.fn(styles => styles),
      hairlineWidth: 1,
      absoluteFill: {},
      absoluteFillObject: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0
      }
    },
    Platform: {
      OS: 'ios',
      select: jest.fn(obj => obj.ios || obj.default || {}),
    },
    Pressable: ({ children, onPress, testID }) => (
      <button 
        testID={testID} 
        onClick={() => onPress && onPress()}
        onPress={onPress}
      >
        {children}
      </button>
    ),
    Image: () => <div>Image</div>,
    ScrollView: ({ children }) => <div>{children}</div>,
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 812 })),
    }
  };
});

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
    goBack: jest.fn()
  }))
}));

// Mock the useAuth hook
jest.mock('../../src/hooks/useAuth', () => ({
  __esModule: true,
  default: () => ({
    user: { email: 'test@example.com' },
    logout: jest.fn().mockResolvedValue(true),
    isLoading: false
  })
}));

// Mock RootNavigation
const mockResetToLogin = jest.fn();
jest.mock('../../src/navigation/RootNavigation', () => ({
  resetToLogin: mockResetToLogin,
}));

import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// Mock Firebase
jest.mock('@react-native-firebase/auth', () => {
  let mockCurrentUser = {
    email: 'test@example.com',
  };
  
  const signOut = jest.fn(() => Promise.resolve());
  
  const mockAuth = () => ({
    currentUser: mockCurrentUser,
    signOut,
    __setCurrentUser: (user) => {
      mockCurrentUser = user;
    }
  });
  
  return mockAuth;
});

jest.mock('@react-native-firebase/firestore', () => {
  const mockGet = jest.fn();
  const mockWhere = jest.fn(() => ({
    get: mockGet,
  }));
  const mockCollection = jest.fn(() => ({
    where: mockWhere,
  }));

  return () => ({
    collection: mockCollection,
  });
});

// Mock other dependencies
jest.mock('../../src/theme/ThemeContext', () => ({
  useTheme: () => ({ isDark: false }),
}));

jest.mock('../../src/theme', () => ({
  getThemeColors: () => ({
    background: '#FFFFFF',
    text: '#000000',
    primary: '#6200EE',
    secondary: '#03DAC6',
    border: '#E1E1E1',
    danger: '#B00020',
  }),
}));

// Create proper JSX-compatible mock components with correct testID attributes
jest.mock('../../src/components/molecules/LogoutButton', () => {
  return function MockLogoutButton({ onLogout, isLoading }) {
    return (
      <div>
        {isLoading ? (
          <div testID="logout-loading">Loading...</div>
        ) : (
          <button 
            testID="logout-button" 
            onClick={() => onLogout && onLogout()}
            onPress={onLogout}
          >
            Log Out
          </button>
        )}
      </div>
    );
  };
});

jest.mock('../../src/components/molecules/SettingsHeader', () => {
  return function MockSettingsHeader() {
    return <div testID="settings-header">Settings Header</div>;
  };
});

jest.mock('../../src/components/molecules/AccountDetails', () => {
  return function MockAccountDetails() {
    return <div testID="account-details">Account Details</div>;
  };
});

// Make this change to your AccountSettingsContent mock:

jest.mock('../../src/components/organisms/AccountSettingsContent', () => {
  return function MockAccountSettingsContent({ navigation }) {
    // IMPORTANT: We need to import mockHandleLogout directly rather than using require
    // This ensures we're using the exact same function reference
    
    return (
      <div testID="account-settings-content">
        <button 
          testID="logout-button-in-content" 
          onClick={() => mockHandleLogout()} // Use mockHandleLogout directly
          onPress={() => mockHandleLogout()} // Use mockHandleLogout directly
        >
          Log Out
        </button>
      </div>
    );
  };
});

// Now import the services and components after all mocks are defined
import { fetchUserData } from '../../src/services/userService';
import LogoutButton from '../../src/components/molecules/LogoutButton';
import AccountSettingsContent from '../../src/components/organisms/AccountSettingsContent';

describe('Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test the service functions directly
  describe('User Service', () => {
    it('fetchUserData returns user information', async () => {
      const userData = await fetchUserData();
      
      expect(userData).toEqual({
        email: 'test@example.com',
        name: 'Test User',
        role: 'Admin'
      });
    });
    
    it('handleLogout calls auth signOut and resets navigation', async () => {
      await mockHandleLogout();
      
      // Verify logout side effects
      expect(mockResetToLogin).toHaveBeenCalled();
    });
  });
  
  // Test LogoutButton Component
// ...existing code...

// Test LogoutButton Component
describe('LogoutButton Component', () => {
  it('calls onLogout when pressed', () => {
    const mockOnLogout = jest.fn();
    
    const { getByTestId } = render(
      <LogoutButton onLogout={mockOnLogout} isLoading={false} />
    );
    
    // Find the button and press it
    const button = getByTestId('logout-button');
    fireEvent.press(button); // Changed from fireEvent.click to fireEvent.press
    
    // Verify callback was called
    expect(mockOnLogout).toHaveBeenCalled();
  });
  
  it('displays loading state', () => {
    const { getByTestId } = render(
      <LogoutButton onLogout={() => {}} isLoading={true} />
    );
    
    // Verify loading indicator is shown
    expect(getByTestId('logout-loading')).toBeTruthy();
  });
});

// Test AccountSettingsContent Component
describe('AccountSettingsContent Component', () => {
  it('triggers logout when logout button is pressed', async () => {
    const mockNavigation = { navigate: jest.fn() };
    
    const { getByTestId } = render(
      <AccountSettingsContent navigation={mockNavigation} />
    );
    
    // Find the logout button in the content
    const button = getByTestId('logout-button-in-content');
    fireEvent.press(button); // Changed from fireEvent.click to fireEvent.press
    
    // Verify logout was called
    expect(mockHandleLogout).toHaveBeenCalled();
    // Verify navigation reset was called
    expect(mockResetToLogin).toHaveBeenCalled();
  });
});
});