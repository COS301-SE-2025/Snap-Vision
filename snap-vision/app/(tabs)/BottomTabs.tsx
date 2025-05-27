import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import HomeScreen from './HomeScreen';
import MapScreen from './MapScreen';
import AchievementsScreen from './AchievementsScreen';
import SettingsScreen from './SettingsScreen';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from './ThemeContext';

const Tab = createBottomTabNavigator();

export default function BottomTabs() {
  const { isDark } = useTheme();

  const darkTabBar = {
    backgroundColor: '#132c41', // lighter dark blue
    borderTopColor: '#132c41',
  };

  const lightTabBar = {
    backgroundColor: '#fff',
    borderTopColor: '#ddd',
  };

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: string;

          if (route.name === 'Home') {
            iconName = 'home-outline';
          } else if (route.name === 'Map') {
            iconName = 'map-outline';
          } else if (route.name === 'Achievements') {
            iconName = 'trophy-outline';
          } else if (route.name === 'Settings') {
            iconName = 'settings-outline';
          } else {
            iconName = 'ellipse-outline';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: isDark ? '#ffffff' : '#2f6e83',
        tabBarInactiveTintColor: isDark ? '#999' : 'gray',
        tabBarStyle: isDark ? darkTabBar : lightTabBar,
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Achievements" component={AchievementsScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
