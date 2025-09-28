import React from 'react';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import AdminContent from '../components/organisms/EditorContent';

type EditorStackParamList = {
  AdminLoadFloorplans: undefined;
  AdminEditFloorplans: undefined;
  //AdminSettings: undefined;
  AdminFloorplanEditor: undefined;
  AdminQRCodes: undefined;
};

type EditorNavigationProp = NavigationProp<EditorStackParamList>;

const EditorScreen = () => {
  const { theme, isDark } = useTheme();
  const colors = getThemeColors(theme);
  const navigation = useNavigation<EditorNavigationProp>();

  const handleLoadFloorplans = () => {
    navigation.navigate('AdminLoadFloorplans');
  };
  const handleEditFloorplans = () => {
    navigation.navigate('AdminEditFloorplans');
  };

  const handleManageQRCodes = () => {
    navigation.navigate('AdminQRCodes');
  };

  return (
    <AdminContent
      colors={colors}
      onLoadFloorplans={handleLoadFloorplans}
      onEditFloorplans={handleEditFloorplans}
      onFloorplanEditor={handleManageQRCodes}
      onManageQRCodes={handleManageQRCodes}
      //onSettings={handleSettings}
    />
  );
};

export default EditorScreen;
