import React, { useState } from 'react';
import { View, Text } from 'react-native';
import DropDownPicker, { DropDownPickerProps } from 'react-native-dropdown-picker';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

interface Building {
  id: string;
  name: string;
}

interface Props {
  buildings: Building[];
  selectedBuildingId: string | null;
  onSelectBuilding: (id: string) => void;
}

export const BuildingSelector: React.FC<Props> = ({ buildings, selectedBuildingId, onSelectBuilding }) => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  const [open, setOpen] = useState(false);

  return (
    <View style={{ zIndex: 3000, marginBottom: 16 }}>
      <Text style={{ fontSize: 14, fontWeight: '500', marginBottom: 8, color: colors.primary }}>
        Select a Building
      </Text>
      <DropDownPicker<string>
        open={open}
        setOpen={setOpen}
        items={buildings.map((b) => ({ label: b.name, value: b.id }))}
        value={selectedBuildingId}
        setValue={(callback) => {
          const id = callback(selectedBuildingId);
          if (id) onSelectBuilding(id);
        }}
        multiple={false} // important for single select
        searchable
        searchPlaceholder="Search for a building..."
        placeholder="Select a building"
        style={{ backgroundColor: colors.card, borderColor: colors.primary }}
        dropDownContainerStyle={{ backgroundColor: colors.card, borderColor: colors.primary }}
        textStyle={{ color: colors.text }}
        searchTextInputStyle={{ color: colors.text }}
      />
    </View>
  );
};
