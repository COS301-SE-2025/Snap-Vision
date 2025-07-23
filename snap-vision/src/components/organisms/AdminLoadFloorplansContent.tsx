import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AppInput from '../atoms/AppInput';
import AppButton from '../atoms/AppButton';
import AppSecondaryButton from '../atoms/AppSecondaryButton';
import SettingsHeader from '../molecules/SettingsHeader';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import RNFS from 'react-native-fs';
import * as ImagePicker from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import DropDownPicker from 'react-native-dropdown-picker';

// Interface for building data from UPcampusPOIs
interface Building {
  id: string;
  name: string;
  centroid?: {
    latitude: number;
    longitude: number;
  };
}

export default function AdminLoadFloorplansContent() {
  const navigation = useNavigation<any>();
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  // Form state
  const [buildingName, setBuildingName] = useState('');
  const [floorLabel, setFloorLabel] = useState('');
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');

  // Data state
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [userRole, setUserRole] = useState<'admin' | 'editor' | 'user'>();
  const [adminLocations, setAdminLocations] = useState<string[]>([]);

  const [buildingDropdownOpen, setBuildingDropdownOpen] = useState(false);
const [buildingDropdownItems, setBuildingDropdownItems] = useState<{ label: string; value: string }[]>([]);
const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);


  // Fetch all buildings from UPcampusPOIs collection
  useEffect(() => {
  if (!selectedLocation) return;

  const fetchBuildings = async () => {
    setIsLoading(true);
    const snapshot = await firestore()
      .collection(`locations/${selectedLocation}/buildingPOIs`)
      .get();

    const buildingsData = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || 'Unnamed Building',
        centroid: data.centroid,
        floors: data.floors || 1,
      };
    });

    setBuildings(buildingsData);
    setBuildingDropdownItems(
  buildingsData.map((b) => ({
    label: b.name,
    value: b.id,
  }))
);



    setIsLoading(false);
  };

  fetchBuildings();
}, [selectedLocation]);


  useEffect(() => {
  const fetchUserInfo = async () => {
    const userId = (await auth().currentUser)?.uid;
    if (!userId) return;

    const userSnap = await firestore().doc(`userInformation/${userId}`).get();
    const data = userSnap.data();
    setUserRole(data?.role);
    setAdminLocations(data?.adminLocations || []);
  };

  fetchUserInfo();
}, []);

useEffect(() => {
  const fetchLocations = async () => {
    const snapshot = await firestore().collection('locations').get();
    const allLocations = snapshot.docs.map((doc) => ({ id: doc.id, name: doc.data().name }));

    if (userRole === 'admin') {
      setLocations(allLocations);
    } else if (userRole === 'editor') {
      setLocations(allLocations.filter(loc => adminLocations.includes(loc.id)));
    }
  };

  if (userRole) fetchLocations();
}, [userRole, adminLocations]);



  // Handle file selection
  const handlePickDocument = async () => {
    try {
      const result = await ImagePicker.launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
      });

      if (result.assets && result.assets[0]) {
        setFileUri(result.assets[0].uri ?? null);
        setFileName(result.assets[0].fileName || 'floorplan.jpg');
      }
    } catch (err) {
      console.error('Error picking image:', err);
      setError('Failed to select image');
    }
  };

  // Handle floorplan upload
  const handleUpload = async () => {
    if (!selectedBuilding) {
      setError('Please select a building');
      return;
    }

    if (!floorLabel) {
      setError('Please enter a floor label');
      return;
    }

    if (!fileUri) {
      setError('Please select a floorplan file');
      return;
    }

    try {
      setIsLoading(true);

      // Create directory if it doesn't exist
      const dirPath = `${RNFS.DocumentDirectoryPath}/floorplans`;
      await RNFS.mkdir(dirPath, { NSURLIsExcludedFromBackupKey: true });

      // Generate safe filename
      const fileExt = fileName.substring(fileName.lastIndexOf('.'));
      const safeFileName = `${selectedBuilding.id}_${floorLabel.replace(/\s+/g, '_')}${fileExt}`;
      const destPath = `${dirPath}/${safeFileName}`;

      // Copy file to app documents directory
      await RNFS.copyFile(fileUri, destPath);

      // Create floorplan metadata
      const floorplanId = `${selectedBuilding.id}_${floorLabel.replace(/\s+/g, '_')}`;
      const floorplanData = {
        id: floorplanId,
        buildingId: selectedBuilding.id,
        buildingName: selectedBuilding.name,
        floorLabel: floorLabel,
        uri: `file://${destPath}`,
        timestamp: new Date().toISOString(),
        status: 'active',
      };

      // Save to AsyncStorage
      await AsyncStorage.setItem(`floorplan_${floorplanId}`, JSON.stringify(floorplanData));

      setIsLoading(false);
      Alert.alert(
        'Success',
        'Floorplan uploaded successfully. Would you like to add room POIs now?',
        [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Add POIs',
            onPress: () =>
              navigation.navigate('FloorplanEditor', {
                buildingId: selectedBuilding.id,
                floorLabel: floorLabel,
                imageUri: `file://${destPath}`,
              }),
          },
        ],
      );

      // Reset form
      setBuildingName('');
      setFloorLabel('');
      setSelectedBuilding(null);
      setFileUri(null);
      setFileName('');
    } catch (err) {
      console.error('Error uploading floorplan:', err);
      setError('Failed to upload floorplan');
      setIsLoading(false);
    }
  };

  // Handle building selection
  const handleBuildingSelect = (building: Building) => {
    setSelectedBuilding(building);
    setBuildingName(building.name);
  };
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title="Upload Floorplan" />

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.text, marginTop: 16 }}>Processing...</Text>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Error message */}
        {error && (
          <View style={[styles.errorContainer, { backgroundColor: colors.danger }]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.inputSection}>
  <Text style={[styles.inputTitle, { color: colors.primary }]}>Select a Location</Text>
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.buildingList}>
    {locations.map((loc) => (
      <TouchableOpacity
        key={loc.id}
        style={[
          styles.buildingItem,
          {
            backgroundColor: selectedLocation === loc.id ? colors.primary : colors.card,
          },
        ]}
        onPress={() => {
          setSelectedLocation(loc.id);
          setSelectedBuilding(null); // reset building
        }}
      >
        <Text style={{ color: selectedLocation === loc.id ? '#FFF' : colors.text }}>
          {loc.name}
        </Text>
      </TouchableOpacity>
    ))}
  </ScrollView>
</View>


        {/* Step 1: Select Building */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            Step 1: Select Building
          </Text>

          {/* Building Selection */}
          {buildings.length === 0 ? (
            <Text style={[styles.infoText, { color: colors.secondary }]}>
              No buildings available. Please check your connection.
            </Text>
          ) : (
            <View style={{ zIndex: 3000, marginBottom: 16 }}>
  <Text style={[styles.inputTitle, { color: colors.primary }]}>Select a Building</Text>
  <DropDownPicker
    open={buildingDropdownOpen}
    setOpen={setBuildingDropdownOpen}
    items={buildingDropdownItems}
    setItems={setBuildingDropdownItems}
    value={selectedBuildingId}
    setValue={(val) => {
      const buildingId = val();
      setSelectedBuildingId(buildingId);
      const selected = buildings.find((b) => b.id === buildingId);
      if (selected) {
        setSelectedBuilding(selected);
        setBuildingName(selected.name);
      }
    }}
    searchable={true}
    searchPlaceholder="Search for a building..."
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
    textStyle={{
      color: colors.text,
    }}
    searchTextInputStyle={{
      color: colors.text,
    }}
  />
</View>

          )}

        </View>

        {/* Step 2: Floor Label */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            Step 2: Floor Information
          </Text>

          <View style={styles.inputSection}>
            <Text style={[styles.inputTitle, { color: colors.primary }]}>Floor Number / Label</Text>
            <AppInput
              placeholder="e.g., Floor 2, Basement"
              value={floorLabel}
              onChangeText={setFloorLabel}
              style={[
                styles.textField,
                { borderColor: colors.primary, color: colors.text, backgroundColor: colors.card },
              ]}
              placeholderTextColor={colors.secondary}
            />
            <Text style={[styles.infoText, { color: colors.secondary }]}>
              Specify the floor designation
            </Text>
          </View>
        </View>

        {/* Step 3: Upload Floorplan */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            Step 3: Select Floorplan File
          </Text>

          {/* File Upload Button */}
          <View style={styles.fileUploadContainer}>
            <AppSecondaryButton
              title={fileUri ? 'Change Image' : 'Select Floorplan Image'}
              onPress={handlePickDocument}
            />
            <Text style={[styles.infoText, { color: colors.secondary }]}>
              Select a PNG or JPG floorplan image
            </Text>

            {fileUri && (
              <View style={[styles.fileInfoContainer, { backgroundColor: colors.card }]}>
                <Icon name="file-document" size={24} color={colors.primary} />
                <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
                  {fileName}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Submit Button */}
        <View style={styles.submitContainer}>
          <AppButton
            title="Upload Floorplan"
            onPress={handleUpload}
            disabled={!fileUri || (!selectedBuilding && !buildingName) || !floorLabel}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
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
  buildingSelector: {
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
  orText: {
    textAlign: 'center',
    fontWeight: 'bold',
    marginVertical: 8,
  },
  inputSection: {
    marginBottom: 16,
  },
  inputTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  textField: {
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
  },
  fileUploadContainer: {
    marginTop: 8,
  },
  fileInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  fileName: {
    marginLeft: 8,
    flex: 1,
  },
  submitContainer: {
    marginTop: 8,
    marginBottom: 32,
  },
});
