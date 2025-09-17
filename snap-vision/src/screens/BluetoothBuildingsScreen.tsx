import React, { useState, useEffect } from 'react';
import { View, FlatList, SafeAreaView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { firestore } from '../services/firebase';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import { StackNavigationProp } from '@react-navigation/stack';
import SettingsHeader from '../components/molecules/SettingsHeader';
import BuildingCard from '../components/molecules/BuildingCard';
import LoadingState from '../components/atoms/LoadingState';
import ErrorState from '../components/atoms/ErrorState';
import EmptyState from '../components/atoms/EmptyState';
import { Building } from '../types/Building';

type RootStackParamList = {
  BluetoothBuildings: undefined;
  BluetoothIndoorNavigation: {
    buildingId: string;
    buildingName: string;
    locationId: string;
  };
};

type BluetoothBuildingsScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'BluetoothBuildings'
>;

const BluetoothBuildingsScreen: React.FC = () => {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigation = useNavigation<BluetoothBuildingsScreenNavigationProp>();
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  useEffect(() => {
    const fetchBeaconBuildings = async () => {
      try {
        setLoading(true);
        // Get all locations
        const locationsSnapshot = await firestore().collection('locations').get();

        const beaconBuildings: Building[] = [];

        // For each location, get buildings with beacons
        for (const locationDoc of locationsSnapshot.docs) {
          const locationId = locationDoc.id;

          const buildingSnapshot = await firestore()
            .collection('locations')
            .doc(locationId)
            .collection('buildingPOIs')
            .where('hasBluetoothBeacons', '==', true)
            .get();

          buildingSnapshot.docs.forEach((doc) => {
            beaconBuildings.push({
              id: doc.id,
              name: doc.data().name || 'Unnamed Building',
              locationId: locationId,
              hasBluetoothBeacons: true,
              floors: doc.data().floors || 1,
              description: doc.data().description,
            });
          });
        }

        setBuildings(beaconBuildings);
      } catch (err) {
        console.error('Error fetching beacon buildings:', err);
        setError('Failed to load buildings with Bluetooth beacons');
      } finally {
        setLoading(false);
      }
    };

    fetchBeaconBuildings();
  }, []);

  // Navigate back handler
  const handleBack = () => {
    navigation.goBack();
  };

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


  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
        <SettingsHeader title="Bluetooth Navigation" />
        <LoadingState colors={colors} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
        <SettingsHeader title="Bluetooth Navigation" />
        <ErrorState colors={colors} error={error} onRetry={() => navigation.replace('BluetoothBuildings')} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
  },
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

export default BluetoothBuildingsScreen;
