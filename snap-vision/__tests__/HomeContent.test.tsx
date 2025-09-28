import React from 'react';
import {
  render,
  fireEvent,
  waitFor,
  waitForElementToBeRemoved,
} from '@testing-library/react-native';
import HomeContent from '../src/components/organisms/HomeContent';
import { ThemeProviderWrapper } from './test-utils/ThemeProviderWrapper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import { getRecentlyVPOIs } from '../src/services/firebase/recentlyVService';

jest.mock('@react-native-firebase/perf', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    newTrace: jest.fn(() => ({
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
    })),
  })),
}));

const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('was not wrapped in act') ||
        args[0].includes('Error fetching recently visited'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

const mockNavigate = jest.fn();
const mockNavigation = {
  navigate: mockNavigate,
  goBack: jest.fn(),
  dispatch: jest.fn(),
  setOptions: jest.fn(),
  isFocused: jest.fn(() => true),
  canGoBack: jest.fn(() => false),
  getId: jest.fn(),
  getParent: jest.fn(),
  getState: jest.fn(),
};

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(),
  useFocusEffect: jest.fn(),
}));

const mockAuth = {
  currentUser: {
    uid: 'test-user-123',
    email: 'test@example.com',
  },
  onAuthStateChanged: jest.fn((callback) => {
    callback(mockAuth.currentUser);
    return jest.fn(); // unsubscribe function
  }),
};

jest.mock('@react-native-firebase/auth', () => ({
  __esModule: true,
  default: jest.fn(() => mockAuth),
}));

jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  default: jest.fn(() => ({})),
}));

jest.mock('../src/services/firebase/recentlyVService', () => ({
  __esModule: true,
  getRecentlyVPOIs: jest.fn(),
}));

const mockGetRecentlyVPOIs = getRecentlyVPOIs as jest.MockedFunction<typeof getRecentlyVPOIs>;

jest.mock('../src/components/molecules/HeaderWithIcons', () => {
  const { View } = require('react-native');
  const MockComponent = () => <View testID="header-with-icons">HeaderWithIcons</View>;
  MockComponent.displayName = 'MockedHeaderWithIcons';
  return MockComponent;
});

jest.mock('../src/components/molecules/QrCard', () => {
  const { View } = require('react-native');
  const MockComponent = ({ backgroundColor, titleColor, subtitleColor }: any) => (
    <View testID="qr-card" style={{ backgroundColor }}>
      QrCard
    </View>
  );
  MockComponent.displayName = 'MockedQrCard';
  return MockComponent;
});

jest.mock('../src/components/atoms/AppButton', () => {
  const { Text, TouchableOpacity } = require('react-native');
  const MockComponent = ({ title, onPress }: { title: string; onPress: () => void }) => (
    <TouchableOpacity onPress={onPress} testID="app-button">
      <Text>{title}</Text>
    </TouchableOpacity>
  );
  MockComponent.displayName = 'MockedAppButton';
  return MockComponent;
});

jest.mock('../src/components/molecules/RecentlyVisitedCarousel', () => {
  const { Text, View } = require('react-native');
  const MockComponent = ({ visits }: { visits: any[] }) => (
    <View testID="recently-visited-carousel">
      <Text>Recently Visited Carousel</Text>
      <Text testID="visits-count">{visits.length} visits</Text>
    </View>
  );
  MockComponent.displayName = 'MockedRecentlyVisitedCarousel';
  return MockComponent;
});

describe('HomeContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);

    (useFocusEffect as jest.Mock).mockImplementation((callback) => {
      setTimeout(() => callback(), 0);
    });

    (auth as jest.MockedFunction<typeof auth>).mockReturnValue(mockAuth as any);
    mockGetRecentlyVPOIs.mockResolvedValue([]);
  });

  describe('Basic Rendering', () => {
    it('renders all main components correctly', async () => {
      const { getByText, getByTestId } = render(
        <ThemeProviderWrapper>
          <HomeContent />
        </ThemeProviderWrapper>,
      );

      expect(getByText('GO TO MAPS')).toBeTruthy();
      expect(getByText('Recently Visited')).toBeTruthy();
      expect(getByTestId('app-button')).toBeTruthy();

      await waitFor(
        () => {
          expect(getByTestId('recently-visited-carousel')).toBeTruthy();
        },
        { timeout: 3000 },
      );
    });

    it('renders with default theme correctly', async () => {
      const { getByText } = render(
        <ThemeProviderWrapper>
          <HomeContent />
        </ThemeProviderWrapper>,
      );

      await waitFor(() => {
        expect(getByText('Recently Visited')).toBeTruthy();
      });
    });

    it('displays loading state initially', () => {
      (useFocusEffect as jest.Mock).mockImplementation(() => {});

      const { getByText } = render(
        <ThemeProviderWrapper>
          <HomeContent />
        </ThemeProviderWrapper>,
      );

      expect(getByText('Loading...')).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('navigates to Map when GO TO MAPS button is pressed', async () => {
      const { getByTestId } = render(
        <ThemeProviderWrapper>
          <HomeContent />
        </ThemeProviderWrapper>,
      );

      const goToMapsButton = getByTestId('app-button');
      fireEvent.press(goToMapsButton);

      expect(mockNavigate).toHaveBeenCalledWith('Map');
    });

    it('calls navigation navigate with correct parameter', async () => {
      const { getByText } = render(
        <ThemeProviderWrapper>
          <HomeContent />
        </ThemeProviderWrapper>,
      );

      fireEvent.press(getByText('GO TO MAPS'));

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith('Map');
    });
  });

  describe('Recently Visited Data Loading', () => {
    it('handles error when loading recently visited data', async () => {
      mockGetRecentlyVPOIs.mockRejectedValue(new Error('Network error'));
      (useFocusEffect as jest.Mock).mockImplementation((callback) => {
        setTimeout(() => callback(), 0);
      });
      const { getByTestId } = render(
        <ThemeProviderWrapper>
          <HomeContent />
        </ThemeProviderWrapper>,
      );
      await waitFor(
        () => {
          expect(getByTestId('recently-visited-carousel')).toBeTruthy();
        },
        { timeout: 3000 },
      );
    });

    it('does not load data when user is not authenticated', async () => {
      (auth as jest.MockedFunction<typeof auth>).mockReturnValue({
        currentUser: null,
        onAuthStateChanged: jest.fn((callback) => {
          callback(null);
          return jest.fn();
        }),
      } as any);

      (useFocusEffect as jest.Mock).mockImplementation((callback) => {
        setTimeout(() => callback(), 0);
      });

      const { getByTestId } = render(
        <ThemeProviderWrapper>
          <HomeContent />
        </ThemeProviderWrapper>,
      );

      await waitFor(
        () => {
          expect(mockGetRecentlyVPOIs).not.toHaveBeenCalled();
          // Should still render carousel with empty data
          expect(getByTestId('recently-visited-carousel')).toBeTruthy();
        },
        { timeout: 3000 },
      );
    });

    it('handles undefined user ID', async () => {
      (auth as jest.MockedFunction<typeof auth>).mockReturnValue({
        currentUser: { uid: undefined },
        onAuthStateChanged: jest.fn((callback) => {
          callback({ uid: undefined });
          return jest.fn();
        }),
      } as any);

      render(
        <ThemeProviderWrapper>
          <HomeContent />
        </ThemeProviderWrapper>,
      );

      await waitFor(() => {
        expect(mockGetRecentlyVPOIs).not.toHaveBeenCalled();
      });
    });

    it('handles empty recently visited data', async () => {
      mockGetRecentlyVPOIs.mockResolvedValue([]);

      (useFocusEffect as jest.Mock).mockImplementation((callback) => {
        setTimeout(() => callback(), 0);
      });

      const { getByTestId, getByText } = render(
        <ThemeProviderWrapper>
          <HomeContent />
        </ThemeProviderWrapper>,
      );

      await waitFor(
        () => {
          expect(getByTestId('recently-visited-carousel')).toBeTruthy();

          expect(getByText('0 visits')).toBeTruthy();
        },
        { timeout: 3000 },
      );
    });

    it('does not fetch recently visited if userId is missing and still renders carousel', async () => {
      // Simulate no user logged in
      (auth as jest.MockedFunction<typeof auth>).mockReturnValue({
        currentUser: null,
        onAuthStateChanged: jest.fn((callback) => {
          callback(null);
          return jest.fn();
        }),
      } as any);

      (useFocusEffect as jest.Mock).mockImplementation((callback) => {
        setTimeout(() => callback(), 0);
      });

      const { getByTestId, getByText } = render(
        <ThemeProviderWrapper>
          <HomeContent />
        </ThemeProviderWrapper>,
      );

      await waitFor(
        () => {
          // Should NOT call the service
          expect(mockGetRecentlyVPOIs).not.toHaveBeenCalled();
          // Should still render the carousel with 0 visits
          expect(getByTestId('recently-visited-carousel')).toBeTruthy();
          expect(getByText('0 visits')).toBeTruthy();
        },
        { timeout: 3000 },
      );
    });
  });

  describe('Focus Effect Behavior', () => {
    it('calls useFocusEffect with correct callback', () => {
      render(
        <ThemeProviderWrapper>
          <HomeContent />
        </ThemeProviderWrapper>,
      );

      expect(useFocusEffect).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('Loading States', () => {
    it('shows loading state while fetching data', () => {
      mockGetRecentlyVPOIs.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 1000)),
      );

      const { getByText } = render(
        <ThemeProviderWrapper>
          <HomeContent />
        </ThemeProviderWrapper>,
      );

      expect(getByText('Loading...')).toBeTruthy();
    });

    it('hides loading state after data is loaded', async () => {
      mockGetRecentlyVPOIs.mockResolvedValue([]);

      const { queryByText, getByTestId, getByText } = render(
        <ThemeProviderWrapper>
          <HomeContent />
        </ThemeProviderWrapper>,
      );

      // Wait for "Loading..." to be removed
      await waitForElementToBeRemoved(() => queryByText('Loading...'), { timeout: 5000 });
      expect(getByTestId('recently-visited-carousel')).toBeTruthy();
    });

    it('hides loading state even when error occurs', async () => {
      mockGetRecentlyVPOIs.mockRejectedValue(new Error('Network error'));
      (useFocusEffect as jest.Mock).mockImplementation((callback) => callback());

      const { queryByText } = render(
        <ThemeProviderWrapper>
          <HomeContent />
        </ThemeProviderWrapper>,
      );

      // Wait for "Loading..." to be removed, allow more time for error state
      await waitForElementToBeRemoved(() => queryByText('Loading...'), { timeout: 10000 });
    });
  });

  describe('Component Structure', () => {
    it('renders HeaderWithIcons component', () => {
      const { getByTestId } = render(
        <ThemeProviderWrapper>
          <HomeContent />
        </ThemeProviderWrapper>,
      );

      expect(getByTestId('header-with-icons')).toBeTruthy();
    });

    it('renders QrCard component', () => {
      const { getByTestId } = render(
        <ThemeProviderWrapper>
          <HomeContent />
        </ThemeProviderWrapper>,
      );

      expect(getByTestId('qr-card')).toBeTruthy();
    });

    it('renders action block with correct layout', () => {
      const { getByText } = render(
        <ThemeProviderWrapper>
          <HomeContent />
        </ThemeProviderWrapper>,
      );

      const goToMapsButton = getByText('GO TO MAPS');
      expect(goToMapsButton).toBeTruthy();
    });
  });

  describe('Theme Integration', () => {
    it('applies theme colors correctly', () => {
      (useFocusEffect as jest.Mock).mockImplementation(() => {});

      const { getByTestId } = render(
        <ThemeProviderWrapper>
          <HomeContent />
        </ThemeProviderWrapper>,
      );

      const qrCard = getByTestId('qr-card');
      const backgroundColor = qrCard.props.style.backgroundColor;

      expect(backgroundColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(['#f9f9f9', '#1e1e1e']).toContain(backgroundColor);
    });

    it('passes backgroundColor prop to QrCard', async () => {
      const { getByTestId } = render(
        <ThemeProviderWrapper>
          <HomeContent />
        </ThemeProviderWrapper>,
      );

      const qrCard = getByTestId('qr-card');
      expect(qrCard.props.style.backgroundColor).toBeDefined();
      expect(typeof qrCard.props.style.backgroundColor).toBe('string');
    });
  });

  describe('Accessibility', () => {
    it('provides accessible text for screen readers', () => {
      const { getByText } = render(
        <ThemeProviderWrapper>
          <HomeContent />
        </ThemeProviderWrapper>,
      );

      expect(getByText('GO TO MAPS')).toBeTruthy();
      expect(getByText('Recently Visited')).toBeTruthy();
    });

    it('provides testID for important interactive elements', () => {
      const { getByTestId } = render(
        <ThemeProviderWrapper>
          <HomeContent />
        </ThemeProviderWrapper>,
      );

      expect(getByTestId('app-button')).toBeTruthy();
    });
  });
});
