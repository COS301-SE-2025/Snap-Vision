// src/screens/BuildingSelectionScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import firestore from '@react-native-firebase/firestore';
import SettingsHeader from '../components/molecules/SettingsHeader';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

type RootStackParamList = {
  BuildingSelection: undefined;
  IndoorNavigationInterface: {
    buildingId: string;
    buildingName: string;
  };
};

type BuildingSelectionScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'BuildingSelection'
>;

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

export default function BuildingSelectionScreen() {
  const navigation = useNavigation<BuildingSelectionScreenNavigationProp>();
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadBuildingsWithNavigation();
  }, []);

  const loadBuildingsWithNavigation = async () => {
    try {
      setIsLoading(true);

      const locationSnapshot = await firestore().collection('locations').get();
      const locationIds = locationSnapshot.docs.map((doc) => doc.id);

      const allBuildings: Building[] = [];
      const buildingsFromRooms = new Map<string, Building>();

      for (const locationId of locationIds) {
        const buildingPOIsSnap = await firestore()
          .collection('locations')
          .doc(locationId)
          .collection('buildingPOIs')
          .get();

        buildingPOIsSnap.forEach((doc) => {
          const data = doc.data();
          allBuildings.push({
            id: doc.id,
            name: data.name || doc.id,
            latitude: data.centroid?.latitude ?? 0,
            longitude: data.centroid?.longitude ?? 0,
            floors: data.floors || 1,
            source: 'buildingPOIs',
            location: locationId,
          });
        });

        const roomPOIsSnap = await firestore()
          .collection('locations')
          .doc(locationId)
          .collection('roomPOIs')
          .get();

        roomPOIsSnap.forEach((doc) => {
          const data = doc.data();
          const buildingId = data.buildingId;
          if (buildingId && !buildingsFromRooms.has(buildingId)) {
            buildingsFromRooms.set(buildingId, {
              id: buildingId,
              name: buildingId,
              latitude: 0,
              longitude: 0,
              floors: 1,
              hasNavigation: true,
              source: 'roomPOIs',
              location: locationId,
            });
          }
        });
      }

      // Add room-only buildings if they don’t exist in buildingPOIs
      buildingsFromRooms.forEach((roomBuilding, buildingId) => {
        const exists = allBuildings.some((b) => b.id === buildingId || b.name === buildingId);
        if (!exists) {
          allBuildings.push(roomBuilding);
        }
      });

      const buildingsWithNavigation = await Promise.all(
        allBuildings.map(async (building) => {
          if (building.source === 'roomPOIs') {
            return building;
          }

          const roomSnapById = await firestore()
            .collection('locations')
            .doc(building.location)
            .collection('roomPOIs')
            .where('buildingId', '==', building.id)
            .limit(1)
            .get();

          const roomSnapByName = await firestore()
            .collection('locations')
            .doc(building.location)
            .collection('roomPOIs')
            .where('buildingId', '==', building.name)
            .limit(1)
            .get();

          return {
            ...building,
            hasNavigation: !roomSnapById.empty || !roomSnapByName.empty,
          };
        }),
      );

      const navigableBuildings = buildingsWithNavigation.filter((b) => b.hasNavigation);
      setBuildings(navigableBuildings);
    } catch (error) {
      console.error('Error loading buildings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuildingSelect = (building: Building) => {
    const actualBuildingId = building.name || building.id;
    navigation.navigate('IndoorNavigationInterface', {
      buildingId: actualBuildingId,
      buildingName: building.name,
    });
  };

  const renderBuildingItem = ({ item }: { item: Building }) => (
    <TouchableOpacity
      style={[
        styles.buildingItem,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
      onPress={() => handleBuildingSelect(item)}
    >
      <View style={styles.buildingHeader}>
        <Icon name="domain" size={24} color={colors.primary} />
        <View style={styles.buildingInfo}>
          <Text style={[styles.buildingName, { color: colors.text }]}>{item.name}</Text>
          <Text style={[styles.buildingDetails, { color: colors.secondary }]}>
            {item.floors} floor{item.floors !== 1 ? 's' : ''} • Indoor navigation available
          </Text>
        </View>
        <Icon name="chevron-right" size={24} color={colors.secondary} />
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <SettingsHeader title="Indoor Navigation" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading buildings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (buildings.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <SettingsHeader title="Indoor Navigation" />
        <View style={styles.emptyContainer}>
          <Icon name="domain-off" size={64} color={colors.secondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Buildings Available</Text>
          <Text style={[styles.emptyText, { color: colors.secondary }]}>
            No buildings with indoor navigation are currently available. Buildings need room POIs to
            enable navigation.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title="Indoor Navigation" />
      <View style={styles.header}>
        <Text style={[styles.subtitle, { color: colors.secondary }]}>
          Select a building to start indoor navigation
        </Text>
      </View>
      <FlatList
        data={buildings}
        renderItem={renderBuildingItem}
        keyExtractor={(item) => item.id}
        style={styles.buildingsList}
        contentContainerStyle={styles.buildingsListContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingVertical: 8 },
  subtitle: { fontSize: 16, textAlign: 'center' },
  buildingsList: { flex: 1 },
  buildingsListContent: { padding: 16 },
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, marginTop: 16 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
});
