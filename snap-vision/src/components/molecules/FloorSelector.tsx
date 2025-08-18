import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

interface Floor {
  id: string;
  name: string;
}

interface FloorSelectorProps {
  floors: Floor[];
  selectedFloorId: string | null;
  setSelectedFloorId: (id: string | null) => void;
  dropdownOpen: boolean;
  setDropdownOpen: (open: boolean) => void;
  title?: string;
}

const FloorSelector: React.FC<FloorSelectorProps> = ({
  floors,
  selectedFloorId,
  setSelectedFloorId,
  dropdownOpen,
  setDropdownOpen,
  title = 'Select Floor',
}) => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  const dropdownItems = floors.map((f) => ({ label: `Floor ${f.name}`, value: f.id }));

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.primary }]}>{title}</Text>
      <DropDownPicker
        open={dropdownOpen}
        setOpen={setDropdownOpen}
        items={dropdownItems}
        value={selectedFloorId}
        setValue={(get) => setSelectedFloorId(get())}
        searchable
        listMode="SCROLLVIEW"
        placeholder="Select a floor"
        zIndex={2000}
        zIndexInverse={900}
        style={{ backgroundColor: colors.card, borderColor: colors.primary }}
        dropDownContainerStyle={{ backgroundColor: colors.card, borderColor: colors.primary }}
        textStyle={{ color: colors.text }}
        searchTextInputStyle={{ color: colors.text }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
});

export default FloorSelector;
