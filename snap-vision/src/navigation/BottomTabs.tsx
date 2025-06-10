import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import MapScreen from '../screens/MapScreen';
import AchievementsScreen from '../screens/AchievementsScreen';
import SettingsNavigator from './SettingsNavigator';
import AdminScreen from '../screens/AdminScreen';
import TabBarIcon from '../components/molecules/TabBarIcon';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';

const Tab = createBottomTabNavigator();

export default function BottomTabs() {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => (
          <TabBarIcon routeName={route.name} color={color} size={size} />
        ),
        tabBarActiveTintColor: colors.primary, // active tab icon + label
        tabBarInactiveTintColor: isDark ? '#888' : '#888',
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Achievements" component={AchievementsScreen} />
      <Tab.Screen name="Settings" component={SettingsNavigator} />
      <Tab.Screen name="Admin" component={AdminScreen} />
    </Tab.Navigator>
  );
}
