export const useNavigation = () => ({
  navigate: jest.fn(),
  replace: jest.fn(),
  reset: jest.fn(),
});

export { NavigationContainer } from '@react-navigation/native';
export { useFocusEffect } from '@react-navigation/native';
