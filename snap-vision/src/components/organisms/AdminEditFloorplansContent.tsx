import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import DropDownPicker from 'react-native-dropdown-picker';
import { useNavigation, NavigationProp } from '@react-navigation/native';

import AppSecondaryButton from '../atoms/AppSecondaryButton';
import SettingsHeader from '../molecules/SettingsHeader';
import StandardPopup from '../atoms/StandardPopup';
import { useNavigation, NavigationProp } from '@react-navigation/native';
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

  // Popup states
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Popup states
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

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
            buildingName:
              buildings.find((b) => b.id === selectedBuildingId)?.name || selectedBuildingId,
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

    try {
      // Using launchImageLibrary instead of DocumentPicker
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 1,
      });

      // Check if user canceled or if there are no assets
      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return;
      }

      const selectedImage = result.assets[0];
      if (!selectedImage.uri) {
        throw new Error('Selected image has no URI');
      }

      // Get selected floorplan data
      const floorplan = floorplans.find((fp) => fp.id === selectedFloorplan);
      if (!floorplan) return;

      // Create directory if it doesn't exist
      const dirPath = `${RNFS.DocumentDirectoryPath}/floorplans`;
      await RNFS.mkdir(dirPath, { NSURLIsExcludedFromBackupKey: true });

      // Generate file name and path
      const fileExtension = selectedImage.type?.includes('png') ? '.png' : '.jpg';
      const fileName = `${floorplan.buildingId}_${floorplan.floorLabel.replace(/\s+/g, '_')}${fileExtension}`;
      const destPath = `${dirPath}/${fileName}`;

      // Copy file to app's documents directory
      await RNFS.copyFile(selectedImage.uri, destPath);

      // Update AsyncStorage with new URI
      const storageKey = `floorplan_${floorplan.buildingId}_${floorplan.floorLabel}`;
      const existingData = await AsyncStorage.getItem(storageKey);
      const updatedData = existingData ? JSON.parse(existingData) : {};
      updatedData.uri = `file://${destPath}`;
      updatedData.timestamp = new Date().toISOString();

      await AsyncStorage.setItem(storageKey, JSON.stringify(updatedData));

      // Update UI
      setFloorplans((prev) =>
        prev.map((fp) =>
          fp.id === selectedFloorplan
            ? { ...fp, localUri: `file://${destPath}`, lastModified: new Date().toISOString() }
            : fp,
        ),
      );

      setSuccessMessage('Floorplan updated successfully');
      setShowSuccessPopup(true);
    } catch (err) {
      console.error('Error updating floorplan:', err);
      setError(
        `Failed to update floorplan: ${err instanceof Error ? err.message : 'Unknown error'}`,
      );
    }
  };

  const handleAddNewFloorplan = () => {
    // Navigate to the floorplan creation screen
    navigation.navigate('AdminLoadFloorplansScreen');
  };

  const handleEditRooms = () => {
    if (!selectedFloorplan) {
      setError('Please select a floorplan first');
      return;
    }

    const floorplan = floorplans.find((fp) => fp.id === selectedFloorplan);
    if (!floorplan) {
      setError('Selected floorplan not found');
      return;
    }

    if (!floorplan.localUri) {
      setError('Floorplan image not found. Please update the floorplan first');
      return;
    }

    // Navigate to the floorplan editor
    navigation.navigate('AdminFloorplanEditor', {
      buildingId: selectedFloorplan.buildingId,
      floorLabel: selectedFloorplan.floorLabel,
      imageUri: selectedFloorplan.downloadURL,
    });
  };

  const handleDeleteFloorplan = () => {
    if (!selectedFloorplan) return;
    setShowDeleteConfirmation(true);
  };

  const confirmDeleteFloorplan = async () => {
    try {
      setIsLoading(true);
      const floorplan = floorplans.find((fp) => fp.id === selectedFloorplan);
      if (!floorplan) return;

      // Delete from AsyncStorage
      await AsyncStorage.removeItem(
        `floorplan_${floorplan.buildingId}_${floorplan.floorLabel}`,
      );

      // Delete associated room POIs from Firestore
      const snapshot = await firestore()
        .collection('RoomPOIs')
        .where('buildingId', '==', floorplan.buildingId)
        .where('floorId', '==', floorplan.floorLabel)
        .get();

            const batch = firestore().batch();
            roomSnap.forEach((doc) => batch.delete(doc.ref));
            pathSnap.forEach((doc) => batch.delete(doc.ref));
            await batch.commit();

      // Remove from local file system
      if (floorplan.localUri) {
        try {
          await RNFS.unlink(floorplan.localUri.replace('file://', ''));
        } catch (fileErr) {
          console.warn('Error deleting floorplan file:', fileErr);
          // Continue with deletion even if file removal fails
        }
      }

      // Update UI
      setFloorplans((prev) => prev.filter((fp) => fp.id !== selectedFloorplan));
      setSelectedFloorplan(null);
      setIsLoading(false);

      setSuccessMessage('Floorplan and associated POIs deleted successfully');
      setShowSuccessPopup(true);
    } catch (err) {
      setIsLoading(false);
      console.error('Error deleting floorplan:', err);
      setError('Failed to delete floorplan');
    }
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
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            Step 1: Select Location
          </Text>
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
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>
              Step 2: Select Building
            </Text>
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
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>
              Step 3: Select Floor
            </Text>
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

      {/* Delete Confirmation Popup */}
      <StandardPopup
        visible={showDeleteConfirmation}
        title="Delete Floorplan"
        message="Are you sure you want to delete this floorplan? This will also delete all associated room POIs."
        onConfirm={() => {
          setShowDeleteConfirmation(false);
          confirmDeleteFloorplan();
        }}
        onCancel={() => setShowDeleteConfirmation(false)}
        confirmText="Delete"
        cancelText="Cancel"
        showCancel={true}
      />

      {/* Success Popup */}
      <StandardPopup
        visible={showSuccessPopup}
        title="Success"
        message={successMessage}
        onConfirm={() => setShowSuccessPopup(false)}
        confirmText="OK"
        showCancel={false}
      />
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