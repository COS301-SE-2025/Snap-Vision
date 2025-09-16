import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { firestore } from '../services/firebase';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import { StackNavigationProp } from '@react-navigation/stack';
import SettingsHeader from '../components/molecules/SettingsHeader';

interface Building {
  id: string;
  name: string;
  locationId: string;
  hasBluetoothBeacons: boolean;
  floors?: number;
  description?: string;
}

type RootStackParamList = {
  // ... other screens
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
    <TouchableOpacity
      style={[styles.buildingCard, { backgroundColor: colors.card }]}
      onPress={() => handleSelectBuilding(item)}
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

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <SettingsHeader title="Bluetooth Navigation" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.secondary }]}>
            Loading buildings...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <SettingsHeader title="Bluetooth Navigation" />
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={48} color={colors.secondary} />
          <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.replace('BluetoothBuildings')}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
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
        <View style={styles.emptyContainer}>
          <MaterialIcons name="bluetooth-disabled" size={48} color={colors.secondary} />
          <Text style={[styles.emptyText, { color: colors.secondary }]}>
            No buildings with Bluetooth beacons found
          </Text>
        </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 16,
  },
  retryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 4,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
});

export default BluetoothBuildingsScreen;
