import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import HomeContent from '../../src/components/organisms/HomeContent';
import { ThemeProviderWrapper } from '../test-utils/ThemeProviderWrapper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import auth from '@react-native-firebase/auth';
import { getRecentlyVPOIs } from '../../src/services/firebase/recentlyVService';



//mock navigation
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
};

jest.mock('@react-native-firebase/auth', () => ({
  __esModule: true,
  default: jest.fn(() => mockAuth),
}));

jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  default: jest.fn(() => ({})),
}));

jest.mock('@react-native-firebase/perf', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    newTrace: jest.fn(() => Promise.resolve({
      start: jest.fn(() => Promise.resolve()),
      stop: jest.fn(() => Promise.resolve()),
    })),
  })),
}));

jest.mock('../../src/services/firebase/recentlyVService', () => ({
  __esModule: true,
  getRecentlyVPOIs: jest.fn(),
}));

const mockGetRecentlyVPOIs = getRecentlyVPOIs as jest.MockedFunction<typeof getRecentlyVPOIs>;

// mock child components
jest.mock('../../src/components/molecules/HeaderWithIcons', () => {
  const { View } = require('react-native');
  const HeaderWithIconsComponent = () => <View testID="header-with-icons">HeaderWithIcons</View>;
  HeaderWithIconsComponent.displayName = 'MockedHeaderWithIcons';
  return HeaderWithIconsComponent;
});

jest.mock('../../src/components/molecules/QrCard', () => {
  const { View } = require('react-native');
  const QrCardComponent = ({ backgroundColor, titleColor, subtitleColor }: any) => (
    <View
      testID="qr-card"
      style={{ backgroundColor }}
      accessibilityLabel={`QR Card with background ${backgroundColor}`}
    >
      QrCard
    </View>
  );
  QrCardComponent.displayName = 'MockedQrCard';
  return QrCardComponent;
});

jest.mock('../../src/components/atoms/AppButton', () => {
  const { Text, TouchableOpacity } = require('react-native');
  const AppButtonComponent = ({ title, onPress }: { title: string; onPress: () => void }) => (
    <TouchableOpacity onPress={onPress} testID="app-button" accessibilityLabel={title}>
      <Text>{title}</Text>
    </TouchableOpacity>
  );
  AppButtonComponent.displayName = 'MockedAppButton';
  return AppButtonComponent;
});

jest.mock('../../src/components/molecules/RecentlyVisitedCarousel', () => {
  const { Text, View } = require('react-native');
  const RecentlyVisitedCarouselComponent = ({ visits }: { visits: any[] }) => (
    <View testID="recently-visited-carousel">
      <Text>Recently Visited Carousel</Text>
      <Text testID="visits-count">{visits.length} visits</Text>
    </View>
  );
  RecentlyVisitedCarouselComponent.displayName = 'MockedRecentlyVisitedCarousel';
  return RecentlyVisitedCarouselComponent;
});

const createMockVisit = (overrides: any = {}) => {
  const timestamp = {
    seconds: Math.floor(Date.now() / 1000),
    nanoseconds: 0,
    toDate: () => new Date(),
    isEqual: (other: any) => false,
    toMillis: () => Date.now(),
  };

  return {
    id: 'default-visit-id',
    userId: 'test-user-123',
    poiId: 'default-poi-id',
    name: 'Default Location',
    timestamp,
    ...overrides,
  };
};
describe('HomeContent Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
    (auth as jest.MockedFunction<typeof auth>).mockReturnValue(mockAuth as any);
    mockGetRecentlyVPOIs.mockResolvedValue([]);
  });

  describe('Component Integration & Rendering', () => {
    it('renders all components and integrates properly', async () => {
      (useFocusEffect as jest.Mock).mockImplementation((callback) => {
        setTimeout(() => callback(), 0);
      });

      const { getByText, getByTestId } = render(
        <ThemeProviderWrapper>
          <HomeContent />
        </ThemeProviderWrapper>,
      );

      expect(getByTestId('header-with-icons')).toBeTruthy();
      expect(getByText('GO TO MAPS')).toBeTruthy();
      expect(getByTestId('qr-card')).toBeTruthy();
      expect(getByText('Recently Visited')).toBeTruthy();

      expect(getByText('Loading...')).toBeTruthy();

      await waitFor(
        () => {
          expect(getByTestId('recently-visited-carousel')).toBeTruthy();
        },
        { timeout: 3000 },
      );
    });

    it('applies theme integration across all components', () => {
      (useFocusEffect as jest.Mock).mockImplementation(() => {});

      const { getByTestId } = render(
        <ThemeProviderWrapper>
          <HomeContent />
        </ThemeProviderWrapper>,
      );

      const qrCard = getByTestId('qr-card');
      const backgroundColor = qrCard.props.style.backgroundColor;
      expect(['#f9f9f9', '#1e1e1e']).toContain(backgroundColor);
    });
  });

  describe('Data Loading Integration', () => {
    it('integrates with Firebase auth and loads user data successfully', async () => {
      const mockVisits = [
        createMockVisit({
          id: 'visit1',
          poiId: 'poi1',
          name: 'Test Library',
          imageUrl: 'http://example.com/image1.jpg',
          centroid: {
            latitude: 0,
            longitude: 0,
          },
        }),
        createMockVisit({
          id: 'visit2',
          poiId: 'poi2',
          name: 'Test Cafeteria',
          imageUrl: 'http://example.com/image2.jpg',
          centroid: {
            latitude: 0,
            longitude: 0,
          },
        }),
      ];

      mockGetRecentlyVPOIs.mockResolvedValue(mockVisits);

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
          expect(mockGetRecentlyVPOIs).toHaveBeenCalledWith('test-user-123');
          expect(getByTestId('recently-visited-carousel')).toBeTruthy();
          expect(getByText('2 visits')).toBeTruthy();
        },
        { timeout: 3000 },
      );
    });

    it('handles empty data gracefully', async () => {
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

    it('handles network errors gracefully', async () => {
      mockGetRecentlyVPOIs.mockRejectedValue(new Error('Network error'));

      (useFocusEffect as jest.Mock).mockImplementation((callback) => {
        setTimeout(() => callback(), 0);
      });

      const { getByTestId, queryByText } = render(
        <ThemeProviderWrapper>
          <HomeContent />
        </ThemeProviderWrapper>,
      );

      await waitFor(
        () => {
          expect(queryByText('Loading...')).toBeNull();
          expect(getByTestId('recently-visited-carousel')).toBeTruthy();
        },
        { timeout: 3000 },
      );
    });
  });

  describe('Authentication Integration - Line 36 Coverage', () => {
    it('handles null currentUser and executes early return (Line 36)', async () => {
      (auth as jest.MockedFunction<typeof auth>).mockReturnValue({
        currentUser: null,
      } as any);

      let focusCallback: () => void;
      (useFocusEffect as jest.Mock).mockImplementation((callback) => {
        focusCallback = callback;
      });

      const { queryByText, getByTestId } = render(
        <ThemeProviderWrapper>
          <HomeContent />
        </ThemeProviderWrapper>,
      );

      await act(async () => {
        focusCallback();
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      await waitFor(() => {
        expect(mockGetRecentlyVPOIs).not.toHaveBeenCalled();
        expect(queryByText('Loading...')).toBeNull();
        expect(getByTestId('recently-visited-carousel')).toBeTruthy();
      });
    });

    it('handles undefined uid and executes early return', async () => {
      (auth as jest.MockedFunction<typeof auth>).mockReturnValue({
        currentUser: { uid: undefined },
      } as any);

      let focusCallback: () => void;
      (useFocusEffect as jest.Mock).mockImplementation((callback) => {
        focusCallback = callback;
      });

      const { queryByText } = render(
        <ThemeProviderWrapper>
          <HomeContent />
        </ThemeProviderWrapper>,
      );

      await act(async () => {
        focusCallback();
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      await waitFor(() => {
        expect(mockGetRecentlyVPOIs).not.toHaveBeenCalled();
        expect(queryByText('Loading...')).toBeNull();
      });
    });

    it('handles empty string uid and executes early return', async () => {
      (auth as jest.MockedFunction<typeof auth>).mockReturnValue({
        currentUser: { uid: '' },
      } as any);

      let focusCallback: () => void;
      (useFocusEffect as jest.Mock).mockImplementation((callback) => {
        focusCallback = callback;
      });

      const { queryByText } = render(
        <ThemeProviderWrapper>
          <HomeContent />
        </ThemeProviderWrapper>,
      );

      await act(async () => {
        focusCallback();
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      await waitFor(() => {
        expect(mockGetRecentlyVPOIs).not.toHaveBeenCalled();
        expect(queryByText('Loading...')).toBeNull();
      });
    });
  });

  describe('Navigation Integration', () => {
    it('integrates with navigation system correctly', async () => {
      (useFocusEffect as jest.Mock).mockImplementation(() => {});

      const { getByTestId } = render(
        <ThemeProviderWrapper>
          <HomeContent />
        </ThemeProviderWrapper>,
      );

      const mapButton = getByTestId('app-button');
      fireEvent.press(mapButton);

      expect(mockNavigate).toHaveBeenCalledWith('Map');
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });

    it('calls navigation with correct stack parameters', async () => {
      (useFocusEffect as jest.Mock).mockImplementation(() => {});

      const { getByText } = render(
        <ThemeProviderWrapper>
          <HomeContent />
        </ThemeProviderWrapper>,
      );

      fireEvent.press(getByText('GO TO MAPS'));

      expect(mockNavigate).toHaveBeenCalledWith('Map');
    });
  });

  describe('Focus Effect Integration', () => {
    it('integrates useFocusEffect for data refetching', async () => {
      let focusCallback: () => void;
      (useFocusEffect as jest.Mock).mockImplementation((callback) => {
        focusCallback = callback;
        setTimeout(() => callback(), 0);
      });

      mockGetRecentlyVPOIs.mockResolvedValue([
        createMockVisit({
          id: 'visit1',
          poiId: 'poi1',
          name: 'Library',
        }),
      ]);

      render(
        <ThemeProviderWrapper>
          <HomeContent />
        </ThemeProviderWrapper>,
      );

      await waitFor(() => {
        expect(mockGetRecentlyVPOIs).toHaveBeenCalledWith('test-user-123');
      });

      mockGetRecentlyVPOIs.mockClear();
      await act(async () => {
        focusCallback();
      });

      await waitFor(() => {
        expect(mockGetRecentlyVPOIs).toHaveBeenCalledWith('test-user-123');
      });
    });

    it('properly integrates focus effect callback', () => {
      render(
        <ThemeProviderWrapper>
          <HomeContent />
        </ThemeProviderWrapper>,
      );

      expect(useFocusEffect).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('Loading State Integration', () => {
    it('integrates loading states with data fetching', async () => {
      mockGetRecentlyVPOIs.mockResolvedValue([]);

      (useFocusEffect as jest.Mock).mockImplementation((callback) => {
        setTimeout(() => callback(), 0);
      });

      const { getByText, queryByText } = render(
        <ThemeProviderWrapper>
          <HomeContent />
        </ThemeProviderWrapper>,
      );

      // Wait for loading to appear first
      await waitFor(() => {
        expect(getByText('Loading...')).toBeTruthy();
      });

      // Then wait for it to disappear
      await waitFor(
        () => {
          expect(queryByText('Loading...')).toBeNull();
        },
        { timeout: 3000 },
      );
    });

    it('hides loading state even when errors occur', async () => {
      mockGetRecentlyVPOIs.mockRejectedValue(new Error('Network error'));

      (useFocusEffect as jest.Mock).mockImplementation((callback) => {
        setTimeout(() => callback(), 0);
      });

      const { queryByText } = render(
        <ThemeProviderWrapper>
          <HomeContent />
        </ThemeProviderWrapper>,
      );

      await waitFor(() => {
        expect(queryByText('Loading...')).toBeNull();
      });
    });
  });

  describe('Component Layout Integration', () => {
    it('renders action row with button and QR components', () => {
      (useFocusEffect as jest.Mock).mockImplementation(() => {});

      const { getByTestId } = render(
        <ThemeProviderWrapper>
          <HomeContent />
        </ThemeProviderWrapper>,
      );

      const button = getByTestId('app-button');
      const qrCard = getByTestId('qr-card');

      expect(button).toBeTruthy();
      expect(qrCard).toBeTruthy();
    });
  });
  describe('Complete Workflow Integration', () => {
    it('executes complete user workflow from load to navigation', async () => {
      const mockVisits = [
        createMockVisit({
          id: 'visit1',
          poiId: 'poi1',
          name: 'Test Location',
        }),
      ];

      mockGetRecentlyVPOIs.mockResolvedValue(mockVisits);

      (useFocusEffect as jest.Mock).mockImplementation((callback) => {
        setTimeout(() => callback(), 0);
      });

      const { getByTestId, getByText, queryByText } = render(
        <ThemeProviderWrapper>
          <HomeContent />
        </ThemeProviderWrapper>,
      );

      expect(getByText('Loading...')).toBeTruthy();
      await waitFor(() => {
        expect(mockGetRecentlyVPOIs).toHaveBeenCalledWith('test-user-123');
        expect(queryByText('Loading...')).toBeNull();
        expect(getByText('1 visits')).toBeTruthy();
      });

      const mapButton = getByTestId('app-button');
      fireEvent.press(mapButton);
      expect(mockNavigate).toHaveBeenCalledWith('Map');

      expect(getByTestId('header-with-icons')).toBeTruthy();
      expect(getByTestId('qr-card')).toBeTruthy();
      expect(getByTestId('recently-visited-carousel')).toBeTruthy();
    });
  });

  describe('Error Recovery Integration', () => {
    it('integrates error handling with state management', async () => {
      mockGetRecentlyVPOIs.mockRejectedValueOnce(new Error('First call failed'));
      mockGetRecentlyVPOIs.mockResolvedValue([
        createMockVisit({
          id: 'visit1',
          poiId: 'poi1',
          name: 'Library',
        }),
      ]);

      let focusCallback: () => void;
      (useFocusEffect as jest.Mock).mockImplementation((callback) => {
        focusCallback = callback;
        setTimeout(() => callback(), 0);
      });

      const { getByText, queryByText } = render(
        <ThemeProviderWrapper>
          <HomeContent />
        </ThemeProviderWrapper>,
      );

      await waitFor(() => {
        expect(queryByText('Loading...')).toBeNull();
      });

      await act(async () => {
        focusCallback();
      });

      await waitFor(() => {
        expect(getByText('1 visits')).toBeTruthy();
      });
    });
  });
});
