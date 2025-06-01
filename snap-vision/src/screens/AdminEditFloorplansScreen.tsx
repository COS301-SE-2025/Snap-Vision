import React, { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import AdminEditFloorplansContent from '../components/organisms/AdminEditFloorplansContent';

const mockFloorplans = [
  { id: '1', name: 'Science Hall - Floor 2' },
  { id: '2', name: 'Main Mall - Basement' },
];

export default function AdminEditFloorplansScreen() {
  const navigation = useNavigation();
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  const [selectedFloorplan, setSelectedFloorplan] = useState<string | null>(null);

  const handleUploadUpdated = () => {
    // logic to upload updated floorplan
  };

  const handleSave = () => {
    // logic to save changes
  };

  return (
    <AdminEditFloorplansContent
      colors={colors}
      navigation={navigation}
      mockFloorplans={mockFloorplans}
      selectedFloorplan={selectedFloorplan}
      setSelectedFloorplan={setSelectedFloorplan}
      handleUploadUpdated={handleUploadUpdated}
      handleSave={handleSave}
    />
  );
}