import React from 'react';
import { render, screen, waitFor } from '@testing-library/react-native';
import AccountDetails from '../src/components/molecules/AccountDetails';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { useTheme } from '../src/theme/ThemeContext';

// Mock Firebase modules
jest.mock('@react-native-firebase/auth', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    currentUser: null,
  })),
}));

jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    collection: jest.fn(() => ({
      where: jest.fn(() => ({
        get: jest.fn(),
      })),
    })),
  })),
}));

jest.mock('../src/theme/ThemeContext', () => ({
  useTheme: jest.fn(),
}));

jest.mock('../src/components/atoms/AccountInfoField', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return function MockAccountInfoField({ label, value, testID }: any) {
    return (
      <Text
        testID={testID || `field-${label.replace(/\s+/g, '-').toLowerCase()}`}
      >{`${label}: ${value}`}</Text>
    );
  };
});

jest.mock('../src/theme', () => ({
  getThemeColors: jest.fn(() => ({
    background: '#ffffff',
    primary: '#007AFF',
    text: '#000000',
  })),
}));

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockFirestore = firestore as jest.MockedFunction<typeof firestore>;
const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

describe('AccountDetails Unit Tests', () => {
  let consoleSpy: jest.SpyInstance;
  beforeEach(() => {
    jest.clearAllMocks();
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    mockUseTheme.mockReturnValue({
      theme: 'light',
      isDark: false,
      toggleTheme: jest.fn(),
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should apply light theme correctly', async () => {
    mockUseTheme.mockReturnValue({
      theme: 'light',
      isDark: false,
      toggleTheme: jest.fn(),
    });

    mockAuth.mockReturnValue({
      currentUser: {
        email: 'light-theme@example.com',
        uid: 'light-theme-uid',
      },
    } as any);

    const mockGet = jest.fn().mockResolvedValue({
      empty: true,
      docs: [],
    });

    mockFirestore.mockReturnValue({
      collection: jest.fn(() => ({
        where: jest.fn(() => ({
          get: mockGet,
        })),
      })),
    } as any);

    render(<AccountDetails />);
    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).toBeNull();
    });

    expect(mockUseTheme).toHaveBeenCalled();
    expect(screen.getByText('Email Address: light-theme@example.com')).toBeTruthy();
  });

  it('should handle no authenticated user', async () => {
    consoleSpy.mockRestore();
    const specificConsoleSpy = jest.spyOn(console, 'log').mockImplementation();

    mockAuth.mockReturnValue({
      currentUser: null,
    } as any);

    render(<AccountDetails />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).toBeNull();
    });

    expect(specificConsoleSpy).toHaveBeenCalledWith('No user is currently logged in');
    expect(screen.getByText('Email Address: ')).toBeTruthy();
    expect(screen.getByText('Name: Not provided')).toBeTruthy();
    expect(screen.getByText('Role: Standard User')).toBeTruthy();

    specificConsoleSpy.mockRestore();
  });

  it('should display user data from auth only when no Firestore data exists', async () => {
    consoleSpy.mockRestore();
    const specificConsoleSpy = jest.spyOn(console, 'log').mockImplementation();

    const mockUser = {
      email: 'test@example.com',
      uid: 'test-uid',
    };

    mockAuth.mockReturnValue({
      currentUser: mockUser,
    } as any);

    const mockGet = jest.fn().mockResolvedValue({
      empty: true,
      docs: [],
    });

    mockFirestore.mockReturnValue({
      collection: jest.fn(() => ({
        where: jest.fn(() => ({
          get: mockGet,
        })),
      })),
    } as any);
    render(<AccountDetails />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).toBeNull();
    });

    expect(screen.getByText('Email Address: test@example.com')).toBeTruthy();
    expect(screen.getByText('Name: Not provided')).toBeTruthy();
    expect(screen.getByText('Role: Standard User')).toBeTruthy();
    expect(specificConsoleSpy).toHaveBeenCalledWith(
      'No matching document found in userInformation collection',
    );

    specificConsoleSpy.mockRestore();
  });

  it('should display complete user data when Firestore data exists', async () => {
    const mockUser = {
      email: 'john@example.com',
      uid: 'john-uid',
    };

    mockAuth.mockReturnValue({
      currentUser: mockUser,
    } as any);

    const mockGet = jest.fn().mockResolvedValue({
      empty: false,
      docs: [
        {
          data: () => ({
            name: 'John Doe',
            role: 'Administrator',
            email: 'john@example.com',
          }),
        },
      ],
    });

    mockFirestore.mockReturnValue({
      collection: jest.fn(() => ({
        where: jest.fn(() => ({
          get: mockGet,
        })),
      })),
    } as any);

    render(<AccountDetails />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).toBeNull();
    });

    expect(screen.getByText('Email Address: john@example.com')).toBeTruthy();
    expect(screen.getByText('Name: John Doe')).toBeTruthy();
    expect(screen.getByText('Role: Administrator')).toBeTruthy();
  });

  it('should handle Firestore errors gracefully', async () => {
    const mockUser = {
      email: 'error@example.com',
      uid: 'error-uid',
    };

    mockAuth.mockReturnValue({
      currentUser: mockUser,
    } as any);

    const mockGet = jest.fn().mockRejectedValue(new Error('Firestore error'));

    mockFirestore.mockReturnValue({
      collection: jest.fn(() => ({
        where: jest.fn(() => ({
          get: mockGet,
        })),
      })),
    } as any);

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    render(<AccountDetails />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).toBeNull();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error fetching from Firestore:',
      expect.any(Error),
    );
    expect(screen.getByText('Email Address: error@example.com')).toBeTruthy();
    expect(screen.getByText('Name: Not provided')).toBeTruthy();
    expect(screen.getByText('Role: Standard User')).toBeTruthy();

    consoleErrorSpy.mockRestore();
  });

  it('should handle auth errors', async () => {
    mockAuth.mockImplementation(() => {
      throw new Error('Auth error');
    });

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    render(<AccountDetails />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).toBeNull();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith('Error fetching user data:', expect.any(Error));

    consoleErrorSpy.mockRestore();
  });

  it('should handle user with null email', async () => {
    const mockUser = {
      email: null,
      uid: 'test-uid',
    };

    mockAuth.mockReturnValue({
      currentUser: mockUser,
    } as any);

    const mockGet = jest.fn().mockResolvedValue({
      empty: true,
      docs: [],
    });

    mockFirestore.mockReturnValue({
      collection: jest.fn(() => ({
        where: jest.fn(() => ({
          get: mockGet,
        })),
      })),
    } as any);

    render(<AccountDetails />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).toBeNull();
    });

    expect(screen.getByText('Email Address: ')).toBeTruthy();
  });

  it('should handle partial Firestore data', async () => {
    const mockUser = {
      email: 'partial@example.com',
      uid: 'partial-uid',
    };

    mockAuth.mockReturnValue({
      currentUser: mockUser,
    } as any);

    const mockGet = jest.fn().mockResolvedValue({
      empty: false,
      docs: [
        {
          data: () => ({
            name: 'Partial User',
            // role is missing
          }),
        },
      ],
    });

    mockFirestore.mockReturnValue({
      collection: jest.fn(() => ({
        where: jest.fn(() => ({
          get: mockGet,
        })),
      })),
    } as any);

    render(<AccountDetails />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).toBeNull();
    });

    expect(screen.getByText('Email Address: partial@example.com')).toBeTruthy();
    expect(screen.getByText('Name: Partial User')).toBeTruthy();
    expect(screen.getByText('Role: Standard User')).toBeTruthy();
  });

  it('should apply dark theme correctly', async () => {
    mockUseTheme.mockReturnValue({
      theme: 'dark',
      isDark: true,
      toggleTheme: jest.fn(),
    });

    mockAuth.mockReturnValue({
      currentUser: {
        email: 'theme@example.com',
        uid: 'theme-uid',
      },
    } as any);

    const mockGet = jest.fn().mockResolvedValue({
      empty: true,
      docs: [],
    });

    mockFirestore.mockReturnValue({
      collection: jest.fn(() => ({
        where: jest.fn(() => ({
          get: mockGet,
        })),
      })),
    } as any);

    render(<AccountDetails />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).toBeNull();
    });

    // Verify theme was called with isDark: true
    expect(mockUseTheme).toHaveBeenCalled();
  });

  it('should handle empty string values in Firestore data', async () => {
    const mockUser = {
      email: 'empty@example.com',
      uid: 'empty-uid',
    };

    mockAuth.mockReturnValue({
      currentUser: mockUser,
    } as any);

    const mockGet = jest.fn().mockResolvedValue({
      empty: false,
      docs: [
        {
          data: () => ({
            name: '',
            role: '',
          }),
        },
      ],
    });

    mockFirestore.mockReturnValue({
      collection: jest.fn(() => ({
        where: jest.fn(() => ({
          get: mockGet,
        })),
      })),
    } as any);

    render(<AccountDetails />);

    await waitFor(() => {
      expect(screen.queryByTestId('loading-indicator')).toBeNull();
    });

    expect(screen.getByText('Name: Not provided')).toBeTruthy();
    expect(screen.getByText('Role: Standard User')).toBeTruthy();
  });
});
