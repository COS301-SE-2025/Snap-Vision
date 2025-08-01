//C:\Users\bahiy\snapvision\Snap-Vision\snap-vision\src\screens\AdminScreen.tsx
import React from 'react';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import AdminContent from '../components/organisms/AdminContent';
import type { AdminStackParamList } from '../navigation/AdminNavigator';

type AdminNavigationProp = NavigationProp<AdminStackParamList>;

const AdminScreen = () => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const navigation = useNavigation<AdminNavigationProp>();

  const handleLoadFloorplans = () => {
    navigation.navigate('AdminLoadFloorplans');
  };
  const handleEditFloorplans = () => {
    navigation.navigate('AdminEditFloorplans');
  };
  // const handleSettings = () => {
  //   navigation.navigate('AdminSettings');
  // };
  // const handleSettings = () => {
  //   navigation.navigate('AdminSettings');
  // };
  const handleManageUsers = () => {
    navigation.navigate('AdminManageUsers');
  };
  const handleIndoorPositioning = () => {
    // Navigate to building/floor selection for indoor positioning
    // For now, we'll use a default building/floor - you can add a picker later
    navigation.navigate('AdminIndoorPositioning', {
      buildingId: 'default',
      floorId: 'default',
    });
  };

  return (
    <AdminContent
      colors={colors}
      onLoadFloorplans={handleLoadFloorplans}
      onEditFloorplans={handleEditFloorplans}
      // onSettings={handleSettings}
      onManageUsers={handleManageUsers}
      onIndoorPositioning={handleIndoorPositioning}
    />
  );
};

export default AdminScreen;
