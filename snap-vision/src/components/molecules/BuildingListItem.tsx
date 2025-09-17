import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

interface Building {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  floors: number;
  hasNavigation?: boolean;
  source: string;
  location: string;
}

interface BuildingListItemProps {
  building: Building;
  onPress: (building: Building) => void;
}

export const BuildingListItem: React.FC<BuildingListItemProps> = ({ building, onPress }) => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <TouchableOpacity
      style={[
        styles.buildingItem,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
      onPress={() => onPress(building)}
    >
      <View style={styles.buildingHeader}>
        <Icon name="domain" size={24} color={colors.primary} />
        <View style={styles.buildingInfo}>
          <Text style={[styles.buildingName, { color: colors.text }]}>{building.name}</Text>
          <Text style={[styles.buildingDetails, { color: colors.secondary }]}>
            {building.floors} floor{building.floors !== 1 ? 's' : ''} • Indoor navigation available
          </Text>
        </View>
        <Icon name="chevron-right" size={24} color={colors.secondary} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  buildingItem: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  buildingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  buildingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  buildingName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  buildingDetails: { fontSize: 14 },
});
