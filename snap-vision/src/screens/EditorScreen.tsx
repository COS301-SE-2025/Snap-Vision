//C:\Users\bahiy\snapvision\Snap-Vision\snap-vision\src\screens\AdminScreen.tsx
import React from 'react';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import AdminContent from '../components/organisms/EditorContent';

type EditorStackParamList = {
  AdminLoadFloorplans: undefined;
  AdminEditFloorplans: undefined;
  AdminSettings: undefined;
  AdminFloorplanEditor: undefined;
};

type EditorNavigationProp = NavigationProp<EditorStackParamList>;

const EditorScreen = () => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const navigation = useNavigation<EditorNavigationProp>();

  const handleLoadFloorplans = () => {
    navigation.navigate('AdminLoadFloorplans');
  };
  const handleEditFloorplans = () => {
    navigation.navigate('AdminEditFloorplans');
  };
  const handleSettings = () => {
    navigation.navigate('AdminSettings');
  };


  return (
    <AdminContent
      colors={colors}
      onLoadFloorplans={handleLoadFloorplans}
      onEditFloorplans={handleEditFloorplans}
      onSettings={handleSettings}
    />
  );
};

export default EditorScreen;
