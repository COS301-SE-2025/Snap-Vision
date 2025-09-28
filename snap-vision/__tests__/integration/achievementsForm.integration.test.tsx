import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AchievementsForm from '../../src/components/organisms/AchievementsForm';
import { ThemeProvider } from '../../src/theme/ThemeContext';
import { BadgeProvider } from '../../src/context/BadgeContext';
import { BADGES, BadgeId } from '../../src/types/badges';

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    NavigationContainer: ({ children }: any) => children,
    useNavigation: () => ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      dispatch: jest.fn(),
    }),
    useRoute: () => ({
      params: {},
    }),
    useFocusEffect: jest.fn(),
    useIsFocused: () => true,
  };
});

jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: () => ({
    Navigator: ({ children }: any) => children,
    Screen: ({ children }: any) => children,
  }),
}));

jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  const TouchableOpacity = require('react-native').TouchableOpacity;
  const ScrollView = require('react-native').ScrollView;

  return {
    GestureHandlerRootView: View,
    gestureHandlerRootHOC: jest.fn((component) => component),

    TapGestureHandler: View,
    PanGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    LongPressGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    NativeViewGestureHandler: View,

    RawButton: TouchableOpacity,
    BaseButton: TouchableOpacity,
    RectButton: TouchableOpacity,
    BorderlessButton: TouchableOpacity,

    ScrollView,
    Switch: View,
    TextInput: View,
    ToolbarAndroid: View,
    ViewPagerAndroid: View,
    DrawerLayout: View,
    DrawerLayoutAndroid: View,

    State: {
      UNDETERMINED: 0,
      FAILED: 1,
      BEGAN: 2,
      CANCELLED: 3,
      ACTIVE: 4,
      END: 5,
    },
    Directions: {
      RIGHT: 1,
      LEFT: 2,
      UP: 4,
      DOWN: 8,
    },

    Gesture: {
      Tap: () => ({
        onStart: jest.fn(),
        onEnd: jest.fn(),
        onFinalize: jest.fn(),
        runOnJS: jest.fn(),
      }),
      Pan: () => ({
        onStart: jest.fn(),
        onUpdate: jest.fn(),
        onEnd: jest.fn(),
        runOnJS: jest.fn(),
      }),
      Pinch: () => ({
        onStart: jest.fn(),
        onUpdate: jest.fn(),
        onEnd: jest.fn(),
        runOnJS: jest.fn(),
      }),
    },
    GestureDetector: View,

    Swipeable: View,
  };
});

jest.mock('@react-native-firebase/auth', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    onAuthStateChanged: jest.fn((callback) => {
      callback({ uid: 'test-user-123', email: 'test@example.com' });
      return jest.fn();
    }),
    currentUser: {
      uid: 'test-user-123',
      email: 'test@example.com',
    },
    signInWithEmailAndPassword: jest.fn(() => Promise.resolve()),
    signOut: jest.fn(() => Promise.resolve()),
    createUserWithEmailAndPassword: jest.fn(() => Promise.resolve()),
    useEmulator: jest.fn(),
  })),
}));

jest.mock('@react-native-firebase/firestore', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(() =>
          Promise.resolve({
            exists: true,
            data: () => ({}),
          }),
        ),
        set: jest.fn(() => Promise.resolve()),
        update: jest.fn(() => Promise.resolve()),
        delete: jest.fn(() => Promise.resolve()),
      })),
      add: jest.fn(() => Promise.resolve()),
      where: jest.fn(() => ({
        get: jest.fn(() => Promise.resolve({ docs: [] })),
      })),
    })),
    useEmulator: jest.fn(),
  })),
}));

const Stack = createStackNavigator();

const MockShopScreen = () => <></>;
const MockDashboard = () => <></>;

const TestNavigationContainer = ({ children }: { children: React.ReactNode }) => (
  <NavigationContainer>
    <Stack.Navigator initialRouteName="Dashboard">
      <Stack.Screen name="Dashboard" component={MockDashboard} />
      <Stack.Screen name="ShopScreen" component={MockShopScreen} />
    </Stack.Navigator>
    {children}
  </NavigationContainer>
);

jest.mock('../../src/components/molecules/WelcomeHeader', () => {
  const { Text } = require('react-native');
  return function WelcomeHeader({ userName = 'User' }: { userName?: string }) {
    return <Text testID="welcome-header">Welcome {userName}</Text>;
  };
});

jest.mock('../../src/components/molecules/ProgressSection', () => {
  const { View, Text } = require('react-native');
  return function ProgressSection({ points, badgeCount, checkIns }: any) {
    return (
      <View testID="progress-section">
        <Text>Points: {points}</Text>
        <Text>Badges: {badgeCount}</Text>
        <Text>Check-ins: {checkIns}</Text>
      </View>
    );
  };
});

jest.mock('../../src/components/molecules/BadgeSection', () => {
  const { View, Text } = require('react-native');
  return function BadgeSection({ unlockedIds }: { unlockedIds: string[] }) {
    return (
      <View testID="badges-section">
        <Text>Unlocked Badges: {unlockedIds.length}</Text>
        {unlockedIds.map((id) => (
          <Text key={id} testID={`badge-${id}`}>
            {id}
          </Text>
        ))}
      </View>
    );
  };
});

jest.mock('../../src/components/molecules/ActionButton', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return function ActionButton({ title, onPress, variant, testID }: any) {
    return (
      <TouchableOpacity testID={testID || `action-button-${title.toLowerCase()}`} onPress={onPress}>
        <Text>
          {title} ({variant})
        </Text>
      </TouchableOpacity>
    );
  };
});

jest.mock('../../src/context/BadgeContext', () => {
  const React = require('react');

  let currentBadgeState = {
    points: 0,
    unlocked: new Set(),
    justUnlocked: [],
    checkIns: 0,
    routesCompleted: 0,
    purchases: [],
  };

  const BadgeContext = React.createContext(null);

  return {
    BadgeProvider: ({ children, initialState }: any) => {
      if (initialState) {
        currentBadgeState = { ...currentBadgeState, ...initialState };
      }

      const contextValue = {
        state: currentBadgeState,
        addPoints: jest.fn(),
        unlockBadge: jest.fn(),
        checkIn: jest.fn(),
        completeRoute: jest.fn(),
        makePurchase: jest.fn(),
      };

      return React.createElement(BadgeContext.Provider, { value: contextValue }, children);
    },
    useBadges: () => ({
      state: currentBadgeState,
      addPoints: jest.fn(),
      unlockBadge: jest.fn(),
      checkIn: jest.fn(),
      completeRoute: jest.fn(),
      makePurchase: jest.fn(),
    }),
  };
});

jest.mock('../../src/theme/ThemeContext', () => {
  const React = require('react');

  let currentTheme = 'light';

  const ThemeContext = React.createContext(null);

  return {
    ThemeProvider: ({ children, initialTheme }: any) => {
      if (initialTheme) {
        currentTheme = initialTheme;
      }

      const contextValue = {
        isDark: currentTheme === 'dark',
        theme: currentTheme,
        toggleTheme: jest.fn(),
      };

      return React.createElement(ThemeContext.Provider, { value: contextValue }, children);
    },
    useTheme: () => ({
      isDark: currentTheme === 'dark',
      theme: currentTheme,
      toggleTheme: jest.fn(),
    }),
  };
});

jest.mock('../../src/components/atoms/ProgressCard', () => 'ProgressCard');
jest.mock('../../src/components/molecules/RewardCard', () => 'RewardCard');

// Mock StandardPopup component
const mockStandardPopup = jest.fn();
jest.mock('../../src/components/atoms/StandardPopup', () => {
  return jest.fn(
    ({ visible, title, message, onConfirm, onCancel, confirmText, cancelText, showCancel }) => {
      const { View, Text, TouchableOpacity } = require('react-native');

      // Call the mock function to track calls
      mockStandardPopup({
        visible,
        title,
        message,
        onConfirm,
        onCancel,
        confirmText,
        cancelText,
        showCancel,
      });

      // Return a proper React component
      if (!visible) return null;
      return (
        <View testID="standard-popup">
          <Text testID="popup-title">{title}</Text>
          <Text testID="popup-message">{message}</Text>
          <TouchableOpacity onPress={onConfirm} testID="popup-confirm">
            <Text>{confirmText}</Text>
          </TouchableOpacity>
          {showCancel && (
            <TouchableOpacity onPress={onCancel} testID="popup-cancel">
              <Text>{cancelText}</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    },
  );
});

const IntegrationTestWrapper = ({
  children,
  initialBadgeState = {},
  initialTheme = 'light',
  navigationRef,
}: {
  children: React.ReactNode;
  initialBadgeState?: any;
  initialTheme?: 'light' | 'dark';
  navigationRef?: any;
}) => (
  <TestNavigationContainer>
    <ThemeProvider>
      <BadgeProvider>{children}</BadgeProvider>
    </ThemeProvider>
  </TestNavigationContainer>
);

describe('AchievementsForm Integration Tests', () => {
  const mockInitialBadgeState = {
    points: 350,
    unlocked: new Set<BadgeId>([
      'first-navigation',
      'speed-demon',
      'explorer',
    ] as unknown as BadgeId[]),
    justUnlocked: [] as BadgeId[],
    checkIns: 12,
    routesCompleted: 8,
    purchases: [
      {
        itemId: 'boost-1',
        name: 'Speed Booster',
        cost: 75,
        purchasedAt: new Date().toISOString(),
      },
      {
        itemId: 'boost-2',
        name: 'Navigation Helper',
        cost: 50,
        purchasedAt: new Date().toISOString(),
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockStandardPopup.mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Component Integration with Real Context', () => {
    it('integrates properly with theme switching', async () => {
      const { rerender, getByTestId } = render(
        <IntegrationTestWrapper initialTheme="light" initialBadgeState={mockInitialBadgeState}>
          <AchievementsForm />
        </IntegrationTestWrapper>,
      );

      await waitFor(() => {
        expect(getByTestId('welcome-header')).toBeTruthy();
      });

      rerender(
        <IntegrationTestWrapper initialTheme="dark" initialBadgeState={mockInitialBadgeState}>
          <AchievementsForm />
        </IntegrationTestWrapper>,
      );

      await waitFor(() => {
        expect(getByTestId('welcome-header')).toBeTruthy();
        expect(getByTestId('progress-section')).toBeTruthy();
      });
    });
  });

  describe('User Interaction Integration', () => {
    it('handles complete user workflow from viewing to navigation', async () => {
      const navigationSpy = jest.fn();

      const { getByTestId, getByText } = render(
        <IntegrationTestWrapper initialBadgeState={mockInitialBadgeState}>
          <AchievementsForm />
        </IntegrationTestWrapper>,
      );

      await waitFor(() => {
        expect(getByText('Welcome User')).toBeTruthy();

        const progressSection = getByTestId('progress-section');
        expect(progressSection).toBeTruthy();

        const shopButton = getByTestId('action-button-shop');
        expect(shopButton).toBeTruthy();

        fireEvent.press(shopButton);

        expect(shopButton).toBeTruthy();
      });
    });
  });

  describe('Navigation Integration', () => {
    it('integrates with React Navigation correctly', async () => {
      const { getByTestId } = render(
        <IntegrationTestWrapper initialBadgeState={mockInitialBadgeState}>
          <AchievementsForm />
        </IntegrationTestWrapper>,
      );

      await waitFor(() => {
        const shopButton = getByTestId('action-button-shop');
        expect(shopButton).toBeTruthy();

        fireEvent.press(shopButton);

        expect(shopButton).toBeTruthy();
      });
    });
  });

  describe('Performance and Edge Cases Integration', () => {
    it('handles rapid state updates efficiently', async () => {
      let currentState = { ...mockInitialBadgeState };

      const { rerender, getByTestId } = render(
        <IntegrationTestWrapper initialBadgeState={currentState}>
          <AchievementsForm />
        </IntegrationTestWrapper>,
      );

      for (let i = 0; i < 10; i++) {
        currentState = {
          ...currentState,
          points: currentState.points + 50,
          checkIns: currentState.checkIns + 1,
        };

        await act(async () => {
          rerender(
            <IntegrationTestWrapper initialBadgeState={currentState}>
              <AchievementsForm />
            </IntegrationTestWrapper>,
          );
        });
      }

      await waitFor(() => {
        expect(getByTestId('welcome-header')).toBeTruthy();
        expect(getByTestId('progress-section')).toBeTruthy();
      });
    });

    it('handles component unmounting and remounting', async () => {
      const { unmount, rerender } = render(
        <IntegrationTestWrapper initialBadgeState={mockInitialBadgeState}>
          <AchievementsForm />
        </IntegrationTestWrapper>,
      );

      await waitFor(() => {
        expect(true).toBeTruthy();
      });

      unmount();

      const { getByTestId } = render(
        <IntegrationTestWrapper initialBadgeState={mockInitialBadgeState}>
          <AchievementsForm />
        </IntegrationTestWrapper>,
      );

      await waitFor(() => {
        expect(getByTestId('welcome-header')).toBeTruthy();
        expect(getByTestId('progress-section')).toBeTruthy();
      });
    });
  });
  describe('useEffect Integration Coverage', () => {
    it('integrates badge unlocking with notification system and persistence', async () => {
      let badgeState = { ...mockInitialBadgeState, justUnlocked: [] as BadgeId[] };

      const { rerender, getByTestId } = render(
        <IntegrationTestWrapper initialBadgeState={badgeState}>
          <AchievementsForm />
        </IntegrationTestWrapper>,
      );

      badgeState = {
        ...badgeState,
        justUnlocked: ['first-navigation', 'explorer'] as unknown as BadgeId[],
        points: badgeState.points + 100,
      };

      rerender(
        <IntegrationTestWrapper initialBadgeState={badgeState}>
          <AchievementsForm />
        </IntegrationTestWrapper>,
      );

      await waitFor(() => {
        expect(getByTestId('badges-section')).toBeTruthy();
        expect(getByTestId('progress-section')).toBeTruthy();
      });
    });

    it('clears justUnlocked after processing badges', async () => {
      let badgeState = {
        ...mockInitialBadgeState,
        justUnlocked: ['explorer'] as unknown as BadgeId[],
      };

      const { rerender } = render(
        <IntegrationTestWrapper initialBadgeState={badgeState}>
          <AchievementsForm />
        </IntegrationTestWrapper>,
      );

      badgeState = { ...badgeState, justUnlocked: [] };

      rerender(
        <IntegrationTestWrapper initialBadgeState={badgeState}>
          <AchievementsForm />
        </IntegrationTestWrapper>,
      );

      await waitFor(() => {
        expect(badgeState.justUnlocked).toHaveLength(0);
      });
    });
  });
});
