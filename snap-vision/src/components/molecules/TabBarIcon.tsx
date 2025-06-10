// src/components/molecules/TabBarIcon.tsx
import React from 'react';
import Icon from 'react-native-vector-icons/Ionicons';

interface Props {
  routeName: string;
  color: string;
  size: number;
}

export default function TabBarIcon({ routeName, color, size }: Props) {
  let iconName = 'ellipse-outline';

  if (routeName === 'Home') iconName = 'home-outline';
  else if (routeName === 'Map') iconName = 'map-outline';
  else if (routeName === 'Achievements') iconName = 'trophy-outline';
  else if (routeName === 'Settings') iconName = 'settings-outline';
  else if (routeName === 'Admin') iconName = 'shield-outline';

  return <Icon name={iconName} size={size} color={color} />;
}