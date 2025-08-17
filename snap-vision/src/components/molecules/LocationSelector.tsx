import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import ChipButton from '../atoms/ChipButton';

interface Location {
  id: string;
  name: string;
}

interface LocationSelectorProps {
  locations: Location[];
  selectedLocationId: string | null;
  onLocationSelect: (locationId: string) => void;
  title?: string;
}

const LocationSelector: React.FC<LocationSelectorProps> = ({
  locations,
  selectedLocationId,
  onLocationSelect,
  title = "Select Location",
}) => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.primary }]}>
        {title}
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipContainer}
      >
        {locations.map((loc) => (
          <ChipButton
            key={loc.id}
            label={loc.name}
            selected={selectedLocationId === loc.id}
            onPress={() => onLocationSelect(loc.id)}
          />
        ))}
      </ScrollView>
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
  chipContainer: {
    paddingVertical: 8,
  },
});

export default LocationSelector;
