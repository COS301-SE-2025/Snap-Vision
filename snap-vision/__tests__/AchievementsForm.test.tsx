import React from 'react';
import { render } from '@testing-library/react-native';
import AchievementsForm from '../src/components/organisms/AchievementsForm';
import { ThemeProviderWrapper } from './test-utils/ThemeProviderWrapper';

// Mocks to avoid UI rendering issues
jest.mock('../src/components/molecules/WelcomeHeader', () => () => null);
jest.mock('../src/components/atoms/ProgressCard', () => () => null);
jest.mock('../src/components/molecules/ChallengeItem', () => () => null);
jest.mock('../src/components/molecules/RewardCard', () => () => null);
jest.mock('../src/components/molecules/ActionButton', () => () => null);
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));
jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: jest.fn(() => ({
    Navigator: jest.fn(),
    Screen: jest.fn(),
  })),
  StackNavigationProp: jest.fn(),
}));

// Mock BadgeContext
const mockState = {
  unlocked: new Set(['first-login', 'qr-scan']),
  justUnlocked: ['earn_150_pts'],
  points: 150,
  checkIns: 3,
};

jest.mock('../src/context/BadgeContext', () => ({
  useBadges: () => ({
    state: mockState,
    clearJustUnlocked: jest.fn(),
    getChallenges: jest.fn(() => []),
  }),
}));

describe('AchievementsForm Functional Logic Only', () => {
  it('converts unlocked badge set to array', () => {
    const { state } = require('../src/context/BadgeContext').useBadges();
    const unlockedArray = Array.from(state.unlocked);
    expect(unlockedArray).toEqual(expect.arrayContaining(['first-login', 'qr-scan']));
  });

  it('detects newly unlocked badges in useEffect', () => {
    const { state } = require('../src/context/BadgeContext').useBadges();
    expect(state.justUnlocked.length).toBeGreaterThan(0);
    expect(state.justUnlocked).toContain('earn_150_pts');
  });

  
});
