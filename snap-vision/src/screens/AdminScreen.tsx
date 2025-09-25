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
    navigation.navigate('AdminIndoorPositioning', {
      buildingId: 'default',
      floorId: 'default',
    });
  };

  const handleManageQRCodes = () => {
    navigation.navigate('AdminQRCodes');
  };

  return (
    <AdminContent
      colors={colors}
      onLoadFloorplans={handleLoadFloorplans}
      onEditFloorplans={handleEditFloorplans}
      // onSettings={handleSettings}
      onManageUsers={handleManageUsers}
      onIndoorPositioning={handleIndoorPositioning}
      onManageQRCodes={handleManageQRCodes}
    />
  );
};

export default AdminScreen;
