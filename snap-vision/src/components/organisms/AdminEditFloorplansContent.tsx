import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import DropDownPicker from 'react-native-dropdown-picker';
import { useNavigation, NavigationProp } from '@react-navigation/native';

import AppSecondaryButton from '../atoms/AppSecondaryButton';
import SettingsHeader from '../molecules/SettingsHeader';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

type RootStackParamList = {
  AdminEditFloorplansScreen: undefined;
  AdminLoadFloorplansScreen: undefined;
  AdminFloorplanEditor: {
    buildingId: string;
    floorLabel: string;
    imageUri?: string;
  };
};

interface FloorplanMeta {
  locationId: string;
  buildingId: string;
  buildingName: string;
  floorLabel: string;
  timestamp: string;
  downloadURL: string;
  id: string;
}

export default function AdminEditFloorplansContent() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  const [role, setRole] = useState<string | null>(null);
  const [adminLocations, setAdminLocations] = useState<string[]>([]);
  const [floorplans, setFloorplans] = useState<FloorplanMeta[]>([]);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [buildings, setBuildings] = useState<{ id: string; name: string }[]>([]);

  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [selectedFloorplan, setSelectedFloorplan] = useState<FloorplanMeta | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [buildingDropdownOpen, setBuildingDropdownOpen] = useState(false);
  const [buildingDropdownItems, setBuildingDropdownItems] = useState<
    { label: string; value: string }[]
  >([]);

  // Added state for floor dropdown open
  const [floorDropdownOpen, setFloorDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchUserInfo = async () => {
      const uid = auth().currentUser?.uid;
      if (!uid) return;
      const doc = await firestore().doc(`userInformation/${uid}`).get();
      const data = doc.data();
      setRole(data?.role || 'user');
      setAdminLocations(data?.adminLocations || []);
    };
    fetchUserInfo();
  }, []);

  useEffect(() => {
    const fetchLocationsAndBuildings = async () => {
      try {
        setIsLoading(true);
        const locSnap = await firestore().collection('locations').get();
        const allLocations = locSnap.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || doc.id,
        }));

        const filteredLocations =
          role === 'editor'
            ? allLocations.filter((loc) => adminLocations.includes(loc.id))
            : allLocations;

        setLocations(filteredLocations);
      } catch (err) {
        console.error(err);
        setError('Failed to load locations');
      } finally {
        setIsLoading(false);
      }
    };

    if (role) fetchLocationsAndBuildings();
  }, [role, adminLocations]);

  useEffect(() => {
    const fetchBuildings = async () => {
      if (!selectedLocation) return;
      setIsLoading(true);

      try {
        const buildingSnap = await firestore()
          .collection(`locations/${selectedLocation}/buildingPOIs`)
          .get();

        const buildingList = buildingSnap.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || doc.id,
        }));

        setBuildings(buildingList);
        setBuildingDropdownItems(buildingList.map((b) => ({ label: b.name, value: b.id })));
        setSelectedBuildingId(null);
        setSelectedFloorplan(null);
        setFloorplans([]);
      } catch (err) {
        console.error(err);
        setError('Failed to load buildings');
      } finally {
        setIsLoading(false);
      }
    };

    if (selectedLocation) fetchBuildings();
  }, [selectedLocation]);

  useEffect(() => {
    const fetchFloorplans = async () => {
      if (!selectedLocation || !selectedBuildingId) return;

      setIsLoading(true);
      try {
        const snap = await firestore()
          .collection(`locations/${selectedLocation}/buildingPOIs/${selectedBuildingId}/floorplans`)
          .get();

        const newFloorplans: FloorplanMeta[] = snap.docs.map((doc) => {
          const data = doc.data();
          return {
            locationId: selectedLocation,
            buildingId: selectedBuildingId,
            buildingName: buildings.find((b) => b.id === selectedBuildingId)?.name || selectedBuildingId,
            floorLabel: data.floorLabel || doc.id,
            downloadURL: data.downloadURL,
            timestamp: data.timestamp?.toDate()?.toISOString() || '',
            id: `${selectedBuildingId}_${data.floorLabel || doc.id}`,
          };
        });

        console.log('✅ Floorplans loaded:', newFloorplans);
        setFloorplans(newFloorplans);
        setSelectedFloorplan(null);
      } catch (err) {
        console.error(err);
        setError('Failed to load floorplans');
      } finally {
        setIsLoading(false);
      }
    };

    if (selectedBuildingId) fetchFloorplans();
  }, [selectedBuildingId]);

  const handleEditPOIs = () => {
    if (!selectedFloorplan) return;
    navigation.navigate('AdminFloorplanEditor', {
      buildingId: selectedFloorplan.buildingId,
      floorLabel: selectedFloorplan.floorLabel,
      imageUri: selectedFloorplan.downloadURL,
    });
  };

  const handleDeleteFloorplan = async () => {
    if (!selectedFloorplan) return;

    Alert.alert('Delete Floorplan', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setIsLoading(true);
            const { locationId, buildingId, floorLabel } = selectedFloorplan;

            await firestore()
              .doc(`locations/${locationId}/buildingPOIs/${buildingId}/floorplans/${floorLabel}`)
              .delete();

            const roomSnap = await firestore()
              .collection(`locations/${locationId}/roomPOIs`)
              .where('buildingId', '==', buildingId)
              .where('floorId', '==', floorLabel)
              .get();

            const pathSnap = await firestore()
              .collection(`locations/${locationId}/pathPOIs`)
              .where('buildingId', '==', buildingId)
              .where('floorId', '==', floorLabel)
              .get();

            const batch = firestore().batch();
            roomSnap.forEach((doc) => batch.delete(doc.ref));
            pathSnap.forEach((doc) => batch.delete(doc.ref));
            await batch.commit();

            setFloorplans((prev) => prev.filter((fp) => fp.id !== selectedFloorplan.id));
            setSelectedFloorplan(null);
            Alert.alert('Deleted', 'Floorplan and POIs removed.');
          } catch (err) {
            console.error(err);
            setError('Failed to delete floorplan');
          } finally {
            setIsLoading(false);
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title="Edit Floorplans" />

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.text, marginTop: 16 }}>Loading...</Text>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {error && (
          <View style={[styles.errorContainer, { backgroundColor: colors.danger }]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Step 1: Select Location */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Step 1: Select Location</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.buildingList}
          >
            {locations.map((loc) => (
              <TouchableOpacity
                key={loc.id}
                style={[
                  styles.buildingItem,
                  { backgroundColor: selectedLocation === loc.id ? colors.primary : colors.card },
                ]}
                onPress={() => {
                  setSelectedLocation(loc.id);
                  setSelectedBuildingId(null);
                  setSelectedFloorplan(null);
                }}
              >
                <Text style={{ color: selectedLocation === loc.id ? '#FFF' : colors.text }}>
                  {loc.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Step 2: Select Building */}
        {selectedLocation && (
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Step 2: Select Building</Text>
            <DropDownPicker
              open={buildingDropdownOpen}
              setOpen={setBuildingDropdownOpen}
              items={buildingDropdownItems}
              setItems={setBuildingDropdownItems}
              value={selectedBuildingId}
              setValue={(val) => {
                setSelectedBuildingId(val());
              }}
              searchable
              placeholder="Select a building"
              zIndex={3000}
              zIndexInverse={1000}
              style={{
                backgroundColor: colors.card,
                borderColor: colors.primary,
              }}
              dropDownContainerStyle={{
                backgroundColor: colors.card,
                borderColor: colors.primary,
              }}
              textStyle={{ color: colors.text }}
              searchTextInputStyle={{ color: colors.text }}
            />
          </View>
        )}

        {/* Step 3: Select Floor */}
        {selectedBuildingId && (
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Step 3: Select Floor</Text>
            <DropDownPicker
              open={floorDropdownOpen}
              setOpen={setFloorDropdownOpen}
              items={floorplans.map((fp) => ({
                label: `Floor ${fp.floorLabel}`,
                value: fp.id,
              }))}
              value={selectedFloorplan?.id || null}
              setValue={(val) => {
                const match = floorplans.find((f) => f.id === val());
                setSelectedFloorplan(match || null);
              }}
              searchable
              placeholder="Select a floor"
              style={{
                backgroundColor: colors.card,
                borderColor: colors.primary,
              }}
              dropDownContainerStyle={{
                backgroundColor: colors.card,
                borderColor: colors.primary,
              }}
              textStyle={{ color: colors.text }}
              searchTextInputStyle={{ color: colors.text }}
            />
          </View>
        )}

        {/* Step 4: Edit or Delete */}
        {selectedFloorplan && (
          <View style={styles.sectionContainer}>
            <Text style={{ color: colors.text }}>
              <Text style={{ fontWeight: 'bold' }}>Floor Label: </Text>
              {selectedFloorplan.floorLabel}
            </Text>
            <Text style={{ color: colors.text }}>
              <Text style={{ fontWeight: 'bold' }}>Last Modified: </Text>
              {new Date(selectedFloorplan.timestamp).toLocaleString()}
            </Text>
            <AppSecondaryButton
              title="Edit Room POIs"
              onPress={handleEditPOIs}
              style={{ marginTop: 16 }}
            />
            <AppSecondaryButton
              title="Delete Floorplan"
              onPress={handleDeleteFloorplan}
              style={{ marginTop: 12 }}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 16 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    marginVertical: 16,
  },
  errorText: {
    color: 'white',
    fontWeight: '500',
  },
  sectionContainer: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
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
