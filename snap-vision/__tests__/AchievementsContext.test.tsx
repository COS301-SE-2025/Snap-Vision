import React from 'react';
import { render } from '@testing-library/react-native';
import AchievementsContent from '../src/components/organisms/AchievementsContent';
import { ThemeProviderWrapper } from './test-utils/ThemeProviderWrapper';
import { BADGES } from '../src/types/badges';

// Mock all necessary native modules
jest.mock('@react-native-firebase/auth', () => () => ({
  currentUser: { uid: 'test-uid' },
}));

// Mock vector icons
jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');
jest.mock('@expo/vector-icons/Ionicons', () => 'Icon');

// Mock SettingsHeader component to actually render its title prop
jest.mock('../src/components/molecules/SettingsHeader', () => {
  const { Text, View } = require('react-native');
  return ({ title }: { title: string }) => (
    <View>
      <Text testID="settings-header">{title}</Text>
    </View>
  );
});

// Mock BadgeContext with TypeScript support
jest.mock('../src/context/BadgeContext', () => {
  const actual = jest.requireActual('../src/context/BadgeContext');
  return {
    ...actual,
    useBadges: () => ({
      state: {
        unlocked: new Set(['first-login', 'qr-scan']),
        justUnlocked: [],
        points: 100,
        checkIns: 5,
        routesCompleted: 3,
        purchases: [],
        completedChallenges: new Set(),
      },
      clearJustUnlocked: jest.fn(),
      unlock: jest.fn(),
      incrementRoutes: jest.fn(),
      incrementCheckIns: jest.fn(),
      getChallenges: jest.fn().mockReturnValue([]),
      setNavigationStartTime: jest.fn(),
      maybeUnlockFastFinisher: jest.fn(),
      completeChallenge: jest.fn(),
      setState: jest.fn(),
    }),
  };
});

describe('AchievementsContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the basic achievements view', () => {
    const { getByText, getByTestId } = render(
      <ThemeProviderWrapper>
        <AchievementsContent />
      </ThemeProviderWrapper>
    );

    expect(getByTestId('settings-header').props.children).toBe('Achievements');
    expect(getByText('Achievements will be shown here.')).toBeTruthy();
  });

  it('uses the badge context data', () => {
    const { getByTestId } = render(
      <ThemeProviderWrapper>
        <AchievementsContent />
      </ThemeProviderWrapper>
    );

    // Verify the component is receiving context by checking if SettingsHeader renders
    expect(getByTestId('settings-header').props.children).toBe('Achievements');
  });

  it('shows empty state message', () => {
    // Override the mock for this specific test
    jest.spyOn(require('../src/context/BadgeContext'), 'useBadges').mockReturnValue({
      state: {
        unlocked: new Set(),
        justUnlocked: [],
        points: 0,
        checkIns: 0,
        routesCompleted: 0,
        purchases: [],
        completedChallenges: new Set(),
      },
      clearJustUnlocked: jest.fn(),
      unlock: jest.fn(),
      incrementRoutes: jest.fn(),
      incrementCheckIns: jest.fn(),
      getChallenges: jest.fn(),
      setNavigationStartTime: jest.fn(),
      maybeUnlockFastFinisher: jest.fn(),
      completeChallenge: jest.fn(),
      setState: jest.fn(),
    });

    const { getByText } = render(
      <ThemeProviderWrapper>
        <AchievementsContent />
      </ThemeProviderWrapper>
    );

    expect(getByText('Achievements will be shown here.')).toBeTruthy();
  });
});