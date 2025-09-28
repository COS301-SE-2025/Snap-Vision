import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Building } from '../../types/Building';

interface BuildingCardProps {
  item: Building;
  colors: any;
  onPress: (building: Building) => void;
}

const BuildingCard: React.FC<BuildingCardProps> = ({ item, colors, onPress }) => (
  <TouchableOpacity
    style={[styles.buildingCard, { backgroundColor: colors.card }]}
    onPress={() => onPress(item)}
  >
    <View style={styles.buildingIconContainer}>
      <MaterialIcons name="location-on" size={24} color={colors.primary} />
    </View>
    <View style={styles.buildingContent}>
      <Text style={[styles.buildingName, { color: colors.text }]}>{item.name}</Text>
      <Text style={[styles.buildingDetails, { color: colors.secondary }]}>
        {item.floors} {item.floors === 1 ? 'floor' : 'floors'}
      </Text>
      {item.description && (
        <Text style={[styles.buildingDescription, { color: colors.secondary }]} numberOfLines={2}>
          {item.description}
        </Text>
      )}
    </View>
    <View style={styles.bluetoothIndicator}>
      <MaterialIcons name="bluetooth" size={20} color={colors.primary} />
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  buildingCard: {
    flexDirection: 'row',
    borderRadius: 8,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  buildingIconContainer: {
    marginRight: 12,
    justifyContent: 'center',
  },
  buildingContent: {
    flex: 1,
  },
  buildingName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  buildingDetails: {
    fontSize: 14,
    marginBottom: 4,
  },
  buildingDescription: {
    fontSize: 12,
    opacity: 0.7,
  },
  bluetoothIndicator: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
});

export default BuildingCard;
