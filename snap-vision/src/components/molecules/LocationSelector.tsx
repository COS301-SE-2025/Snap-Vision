import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Location } from '../../types/floorplan';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

interface LocationSelectorProps {
  locations: Location[];
  selectedLocation: string;
  onLocationSelect: (locationId: string) => void;
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  locations = [],
  selectedLocation,
  onLocationSelect,
}) => {
  const { theme, isDark } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <View style={styles.inputSection}>
      <Text style={[styles.inputTitle, { color: colors.primary }]}>Step 1: Select Location</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.buildingList}
      >
        {locations?.map((loc) => (
          <TouchableOpacity
            key={loc.id}
            style={[
              styles.buildingItem,
              {
                backgroundColor: selectedLocation === loc.id ? colors.primary : colors.card,
              },
            ]}
            onPress={() => onLocationSelect(loc.id)}
            testID={`location-${loc.id}`}
          >
            <Text style={{ color: selectedLocation === loc.id ? '#FFF' : colors.text }}>
              {loc.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  inputSection: {
    marginBottom: 16,
  },
  inputTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 8,
  },
  buildingList: {
    paddingVertical: 8,
  },
  buildingItem: {
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
    minWidth: 100,
    alignItems: 'center',
  },
});
