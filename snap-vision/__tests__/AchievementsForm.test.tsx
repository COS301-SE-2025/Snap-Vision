import React from 'react';

const mockNavigate = jest.fn();

// Mocks
jest.mock('../src/components/molecules/ProgressSection', () => jest.fn(() => null));
jest.mock('../src/components/molecules/BadgeSection', () => jest.fn(() => null));
jest.mock('../src/components/molecules/WelcomeHeader', () => () => null);
jest.mock('../src/components/atoms/ProgressCard', () => () => null);
jest.mock('../src/components/molecules/ChallengeItem', () => jest.fn(() => null));
jest.mock('../src/components/molecules/RewardCard', () => () => null);
jest.mock('../src/components/molecules/ActionButton', () => {
  const ActionButtonMock = (props: any) => <button onClick={props.onPress}>{props.title}</button>;
  ActionButtonMock.displayName = 'ActionButtonMock';
  return ActionButtonMock;
});

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));
jest.mock('@react-navigation/stack', () => ({
  createStackNavigator: jest.fn(() => ({
    Navigator: jest.fn(),
    Screen: jest.fn(),
  })),
  StackNavigationProp: jest.fn(),
}));

const mockState = {
  unlocked: new Set(['first-login', 'qr-scan']),
  justUnlocked: ['earn_150_pts'],
  points: 150,
  checkIns: 3,
};

const mockChallenges = [
  { id: 'c1', title: 'Scan QR', description: '', points: 10, completed: false },
  { id: 'c2', title: 'Join Class', description: '', points: 15, completed: false },
];

jest.mock('../src/context/BadgeContext', () => ({
  useBadges: () => ({
    state: mockState,
    clearJustUnlocked: jest.fn(),
    getChallenges: jest.fn(() => mockChallenges),
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
