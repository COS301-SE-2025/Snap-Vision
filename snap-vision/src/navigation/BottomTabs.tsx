// src/navigation/BottomTabs.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from '../screens/HomeScreen';
// import MapScreen from '../screens/MapScreen';
// import AchievementsScreen from '../screens/AchievementsScreen';
// import SettingsScreen from '../screens/SettingsScreen';
import TabBarIcon from '../components/molecules/TabBarIcon';
import { useTheme } from '../theme/ThemeContext';

const Tab = createBottomTabNavigator();

export default function BottomTabs() {
  const { isDark } = useTheme();

  const tabBarStyle = {
    backgroundColor: isDark ? '#132c41' : '#fff',
    borderTopColor: isDark ? '#132c41' : '#ddd',
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => (
          <TabBarIcon routeName={route.name} color={color} size={size} />
        ),
        tabBarActiveTintColor: isDark ? '#ffffff' : '#2f6e83',
        tabBarInactiveTintColor: isDark ? '#999' : 'gray',
        tabBarStyle,
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      {/* <Tab.Screen name="Map" component={MapScreen} /> */}
      {/* <Tab.Screen name="Achievements" component={AchievementsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} /> */} 
    </Tab.Navigator>
  );
}
