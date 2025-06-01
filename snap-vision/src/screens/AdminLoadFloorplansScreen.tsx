import React, { useState } from 'react';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import AdminLoadFloorplansContent from '../components/organisms/AdminLoadFloorplansContent';

const mockFloorplans: {
  id: string;
  buildingName: string;
  floorLabel: string;
  status: "active" | "draft";
  uploadDate: string;
  icon: string;
}[] = [
  {
    id: '1',
    buildingName: 'Science Hall',
    floorLabel: 'Floor 2',
    status: 'active',
    uploadDate: '2023-10-01',
    icon: '🏢',
  },
  {
    id: '2',
    buildingName: 'Main Mall',
    floorLabel: 'Basement',
    status: 'draft',
    uploadDate: '2023-10-05',
    icon: '🏬',
  },
];

export default function AdminLoadFloorplansScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const [buildingName, setBuildingName] = useState('');
  const [floorLabel, setFloorLabel] = useState('');

  const handleUpload = () => {
    console.log('Upload floorplan');
  };

  const handleSaveChanges = () => {
    console.log('Save changes');
  };

  const handleView = (id: string) => {
    console.log('View floorplan:', id);
  };

  const handleEdit = (id: string) => {
    console.log('Edit floorplan:', id);
  };

  const handleDelete = (id: string) => {
    console.log('Delete floorplan:', id);
  };

  return (
    <AdminLoadFloorplansContent
      colors={colors}
      navigation={navigation}
      buildingName={buildingName}
      setBuildingName={setBuildingName}
      floorLabel={floorLabel}
      setFloorLabel={setFloorLabel}
      mockFloorplans={mockFloorplans}
      handleUpload={handleUpload}
      handleSaveChanges={handleSaveChanges}
      handleView={handleView}
      handleEdit={handleEdit}
      handleDelete={handleDelete}
    />
  );
}