import React from 'react';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import AdminContent from '../components/organisms/AdminContent';

type AdminStackParamList = {
  AdminLoadFloorplans: undefined;
  AdminEditFloorplans: undefined;
  AdminSettings: undefined;
  AdminManageUsers: undefined;
};

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
  const handleSettings = () => {
    navigation.navigate('AdminSettings');
  };
  const handleManageUsers = () => {
    navigation.navigate('AdminManageUsers');
  };

  return (
    <AdminContent
      colors={colors}
      onLoadFloorplans={handleLoadFloorplans}
      onEditFloorplans={handleEditFloorplans}
      onSettings={handleSettings}
      onManageUsers={handleManageUsers}
    />
  );
};

export default AdminScreen;