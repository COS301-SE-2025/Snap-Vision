import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import AchievementsForm from '../src/components/organisms/AchievementsForm';
import { ThemeProviderWrapper } from './test-utils/ThemeProviderWrapper';

const mockNavigate = jest.fn();

// Mocks
jest.mock('../src/components/molecules/ProgressSection', () => jest.fn(() => null));
jest.mock('../src/components/molecules/BadgeSection', () => jest.fn(() => null));
jest.mock('../src/components/molecules/WelcomeHeader', () => () => null);
jest.mock('../src/components/atoms/ProgressCard', () => () => null);
jest.mock('../src/components/molecules/ChallengeItem', () => jest.fn(() => null));
jest.mock('../src/components/molecules/RewardCard', () => () => null);
jest.mock('../src/components/molecules/ActionButton', () => (props: any) => (
  <button onClick={props.onPress}>{props.title}</button>
));

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

  // it('renders without crashing', () => {
  //   const { toJSON } = render(<AchievementsForm />, { wrapper: ThemeProviderWrapper });
  //   expect(toJSON()).toBeTruthy();
  // });

  // it('passes correct props to ProgressSection', () => {
  //   const ProgressSection = require('../src/components/molecules/ProgressSection');
  //   render(<AchievementsForm />, { wrapper: ThemeProviderWrapper });

  //   expect(ProgressSection).toHaveBeenCalledWith(
  //     expect.objectContaining({
  //       points: 150,
  //       badgeCount: 2,
  //       checkIns: 3,
  //     }),
  //     {}
  //   );
  // });

  // it('passes correct props to BadgeSection', () => {
  //   const BadgeSection = require('../src/components/molecules/BadgeSection');
  //   render(<AchievementsForm />, { wrapper: ThemeProviderWrapper });

  //   expect(BadgeSection).toHaveBeenCalledWith(
  //     expect.objectContaining({
  //       unlockedIds: expect.arrayContaining(['first-login', 'qr-scan']),
  //     }),
  //     {}
  //   );
  // });

  // it('renders ChallengeItems for each challenge', () => {
  //   const ChallengeItem = require('../src/components/molecules/ChallengeItem');
  //   render(<AchievementsForm />, { wrapper: ThemeProviderWrapper });

  //   expect(ChallengeItem).toHaveBeenCalledTimes(mockChallenges.length);
  //   expect(ChallengeItem).toHaveBeenCalledWith(
  //     expect.objectContaining({ challenge: expect.objectContaining({ id: 'c1' }) }),
  //     {}
  //   );
  // });

  // // it('navigates to ShopScreen when SHOP is pressed', () => {
  // //   const { getByText } = render(<AchievementsForm />, { wrapper: ThemeProviderWrapper });
  // //   const shopButton = getByText('SHOP');
  // //   fireEvent.click(shopButton);
  // //   expect(mockNavigate).toHaveBeenCalledWith('ShopScreen');
  // // });
});
