import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import BeaconNavigationScreen from '../screens/BeaconNavigationScreen';
import BeaconRoomSelectionScreen from '../screens/BeaconRoomSelectionScreen';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';

const Stack = createNativeStackNavigator();

export default function BeaconNavigationStack() {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <Stack.Navigator
      initialRouteName="BeaconNavigation"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="BeaconNavigation" component={BeaconNavigationScreen} />
      <Stack.Screen name="BeaconRoomSelection" component={BeaconRoomSelectionScreen} />
    </Stack.Navigator>
  );
}
