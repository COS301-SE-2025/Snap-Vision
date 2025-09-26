import React from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import { useBluetoothBuildings } from '../../hooks/useBluetoothBuildings';
import SettingsHeader from '../molecules/SettingsHeader';
import BuildingCard from '../molecules/BuildingCard';
import LoadingState from '../atoms/LoadingState';
import ErrorState from '../atoms/ErrorState';
import EmptyState from '../atoms/EmptyState';
import { Building } from '../../types/Building';

type RootStackParamList = {
  BluetoothBuildings: undefined;
  BluetoothIndoorNavigation: {
    buildingId: string;
    buildingName: string;
    locationId: string;
  };
};

type BluetoothBuildingsNavigationProp = StackNavigationProp<
  RootStackParamList,
  'BluetoothBuildings'
>;

const BluetoothBuildingsContent: React.FC = () => {
  const navigation = useNavigation<BluetoothBuildingsNavigationProp>();
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const { buildings, loading, error, refetch } = useBluetoothBuildings();

  // Building selection handler
  const handleSelectBuilding = (building: Building) => {
    navigation.navigate('BluetoothIndoorNavigation', {
      buildingId: building.id,
      buildingName: building.name,
      locationId: building.locationId,
    });
  };

  // Render building item
  const renderBuildingItem = ({ item }: { item: Building }) => (
    <BuildingCard item={item} colors={colors} onPress={handleSelectBuilding} />
  );

  // Handle retry
  const handleRetry = () => {
    refetch();
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <SettingsHeader title="Bluetooth Navigation" />
        <LoadingState colors={colors} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <SettingsHeader title="Bluetooth Navigation" />
        <ErrorState colors={colors} error={error} onRetry={handleRetry} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SettingsHeader title="Bluetooth Navigation" />

      {buildings.length > 0 ? (
        <FlatList
          data={buildings}
          keyExtractor={(item) => `${item.locationId}-${item.id}`}
          renderItem={renderBuildingItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <EmptyState colors={colors} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
  },
});

export default BluetoothBuildingsContent;