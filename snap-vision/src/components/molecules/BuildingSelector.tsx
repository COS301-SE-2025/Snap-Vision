import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

interface Building {
  id: string;
  name: string;
}

interface BuildingSelectorProps {
  buildings: Building[];
  selectedBuildingId: string | null;
  setSelectedBuildingId: (id: string | null) => void;
  dropdownOpen: boolean;
  setDropdownOpen: (open: boolean) => void;
  title?: string;
}

const BuildingSelector: React.FC<BuildingSelectorProps> = ({
  buildings,
  selectedBuildingId,
  setSelectedBuildingId,
  dropdownOpen,
  setDropdownOpen,
  title = 'Select Building',
}) => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  const dropdownItems = buildings.map((b) => ({ label: b.name, value: b.id }));

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.primary }]}>{title}</Text>
      <DropDownPicker
        open={dropdownOpen}
        setOpen={setDropdownOpen}
        items={dropdownItems}
        value={selectedBuildingId}
        setValue={(get) => setSelectedBuildingId(get())}
        searchable
        listMode="MODAL"
        placeholder="Select a building"
        zIndex={3000}
        zIndexInverse={1000}
        style={{
          backgroundColor: colors.card,
          borderColor: colors.primary,
          borderWidth: 2,
          borderRadius: 8,
          fontFamily: 'System',
          fontSize: 16,
        }}
        dropDownContainerStyle={{
          backgroundColor: colors.card,
          borderColor: colors.primary,
          maxHeight: 250,
          borderRadius: 8,
        }}
        textStyle={{
          color: colors.text,
          fontFamily: 'System',
          fontSize: 16,
        }}
        searchTextInputStyle={{
          color: colors.text,
          backgroundColor: colors.background,
          borderColor: colors.primary,
          borderWidth: 1,
          borderRadius: 8,
          fontFamily: 'System',
          fontSize: 16,
        }}
        selectedItemLabelStyle={{
          color: colors.primary,
          fontWeight: 'bold',
        }}
        placeholderStyle={{
          color: colors.subtleText,
          fontFamily: 'System',
          fontSize: 16,
        }}
        listItemLabelStyle={{
          color: colors.text,
          fontFamily: 'System',
          fontSize: 16,
        }}
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

export default BuildingSelector;
