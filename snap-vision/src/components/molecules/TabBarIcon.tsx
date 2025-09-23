// src/components/molecules/TabBarIcon.tsx
import React from 'react';
import Icon from 'react-native-vector-icons/Ionicons';
import { useUserIcons } from '../../context/UserIconContext';

interface Props {
  routeName: string;
  color: string;
  size: number;
}

export default function TabBarIcon({ routeName, color, size }: Props) {
  // Use custom icon from context if available
  const { getIconForTab } = useUserIcons();

  // Get custom icon for this tab, or use default if none is set
  let iconName = getIconForTab(routeName) || 'ellipse-outline';

  // If no custom icon is set, use the default icons
  if (!iconName) {
    if (routeName === 'Home') iconName = 'home-outline';
    else if (routeName === 'Map') iconName = 'map-outline';
    else if (routeName === 'Indoor') iconName = 'business-outline';
    else if (routeName === 'Achievements') iconName = 'trophy-outline';
    else if (routeName === 'Settings') iconName = 'settings-outline';
    else if (routeName === 'Admin') iconName = 'shield-outline';
    else if (routeName === 'Editor') iconName = 'pencil-outline';
  }

  return <Icon name={iconName} size={size} color={color} />;
}
