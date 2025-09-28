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
  const { theme, isDark } = useTheme();
  const colors = getThemeColors(theme);

  const dropdownItems = floors.map((f) => ({ label: `Floor ${f.name}`, value: f.id }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.primary }]}>{title}</Text>
      <DropDownPicker
        open={dropdownOpen}
        setOpen={setDropdownOpen}
        items={dropdownItems}
        value={selectedFloorId}
        setValue={(get) => setSelectedFloorId(get())}
        searchable
        listMode="MODAL"
        placeholder="Select a floor"
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
        modalProps={{
          animationType: 'fade',
        }}
        modalContentContainerStyle={{
          backgroundColor: colors.background,
        }}
        modalTitleStyle={{
          color: colors.text,
        }}
        textStyle={{
          color: colors.text,
          fontFamily: 'System',
          fontSize: 16,
        }}
        searchTextInputStyle={{
          color: colors.text,
          backgroundColor: colors.card,
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
        theme={isDark ? 'DARK' : 'LIGHT'}
        closeIconContainerStyle={{
          backgroundColor: 'transparent',
        }}
        arrowIconContainerStyle={{
          backgroundColor: 'transparent',
        }}
        listItemContainerStyle={{
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
        itemSeparator={true}
        itemSeparatorStyle={{
          backgroundColor: colors.border,
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    padding: 16,
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
});

export default FloorSelector;
