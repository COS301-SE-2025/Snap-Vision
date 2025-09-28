import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
import AchievementsScreen from '../screens/AchievementsScreen';
import SettingsNavigator from './SettingsNavigator';
import AdminNavigator from './AdminNavigator';
import MapNavigator from './MapNavigator';
import TabBarIcon from '../components/molecules/TabBarIcon';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import { useUser } from '../context/UserContext';
import EditorScreen from '../screens/EditorScreen';

const Tab = createBottomTabNavigator();

export default function BottomTabs() {
  const { theme, isDark } = useTheme();
  const colors = getThemeColors(theme);
  const { role, loading } = useUser();

  if (loading) return null;

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => (
          <TabBarIcon routeName={route.name} color={color} size={size} />
        ),
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: isDark ? '#888' : '#888',
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Map" component={MapNavigator} />
      {/* <Tab.Screen
        name="Indoor"
        component={BuildingSelectionScreen}
        options={{ title: 'Indoor Nav' }}
      /> */}
      <Tab.Screen name="Achievements" component={AchievementsScreen} />
      <Tab.Screen name="Settings" component={SettingsNavigator} />
      {role === 'admin' && <Tab.Screen name="Admin" component={AdminNavigator} />}
      {role === 'editor' && <Tab.Screen name="Editor" component={EditorScreen} />}
    </Tab.Navigator>
  );
}
