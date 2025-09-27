import React from 'react';
import { render } from '@testing-library/react-native';
import BadgeUnlockNotifier from '../src/components/organisms/BadgeUnlockNotifier';
import { ThemeProviderWrapper } from './test-utils/ThemeProviderWrapper';

// Mock all necessary modules
jest.mock('@react-native-firebase/auth', () => () => ({
  currentUser: { uid: 'test-uid' },
  onAuthStateChanged: jest.fn((callback) => {
    callback({ uid: 'test-uid' });
    return jest.fn();
  }),
}));

jest.mock('react-native-vector-icons/Ionicons', () => 'Icon');

jest.mock('../src/context/BadgeContext', () => ({
  ...jest.requireActual('../src/context/BadgeContext'),
  useBadges: jest.fn(),
}));

// Proper mock for BadgePopup that follows Jest's rules
jest.mock('../src/components/molecules/BadgePopup', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  return function MockBadgePopup({ badgeId, onClose }: { badgeId: string; onClose: () => void }) {
    return (
      <View testID="badge-popup">
        <Text onPress={onClose}>Mocked Badge Popup: {badgeId}</Text>
      </View>
    );
  };
});

describe('BadgeUnlockNotifier', () => {
  const mockUseBadges = jest.spyOn(require('../src/context/BadgeContext'), 'useBadges');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not render when no badges are unlocked', () => {
    mockUseBadges.mockReturnValue({
      state: {
        justUnlocked: [],
        unlocked: new Set(),
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

    const { queryByTestId } = render(
      <ThemeProviderWrapper>
        <BadgeUnlockNotifier />
      </ThemeProviderWrapper>,
    );

    expect(queryByTestId('badge-popup')).toBeNull();
  });

  it('renders popup when badges are unlocked', () => {
    mockUseBadges.mockReturnValue({
      state: {
        justUnlocked: ['first-login'],
        unlocked: new Set(['first-login']),
        points: 50,
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

    const { getByTestId } = render(
      <ThemeProviderWrapper>
        <BadgeUnlockNotifier />
      </ThemeProviderWrapper>,
    );

    expect(getByTestId('badge-popup')).toBeTruthy();
  });

  it('clears justUnlocked after showing popup', () => {
    const mockClearJustUnlocked = jest.fn();

    mockUseBadges.mockReturnValue({
      state: {
        justUnlocked: ['first-login'],
        unlocked: new Set(['first-login']),
        points: 50,
        checkIns: 0,
        routesCompleted: 0,
        purchases: [],
        completedChallenges: new Set(),
      },
      clearJustUnlocked: mockClearJustUnlocked,
      unlock: jest.fn(),
      incrementRoutes: jest.fn(),
      incrementCheckIns: jest.fn(),
      getChallenges: jest.fn(),
      setNavigationStartTime: jest.fn(),
      maybeUnlockFastFinisher: jest.fn(),
      completeChallenge: jest.fn(),
      setState: jest.fn(),
    });

    render(
      <ThemeProviderWrapper>
        <BadgeUnlockNotifier />
      </ThemeProviderWrapper>,
    );

    expect(mockClearJustUnlocked).toHaveBeenCalled();
  });
});
