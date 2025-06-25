import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import AdminLoadFloorplansContent from '../components/organisms/AdminLoadFloorplansContent';
import RNFS from 'react-native-fs';
import * as ImagePicker from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';

// Interface for building data from UPcampusPOIs
interface Building {
  id: string;
  name: string;
  centroid?: {
    latitude: number;
    longitude: number;
  };
}

export default function AdminLoadFloorplansScreen({ navigation }: any) {
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

  // Fetch all buildings from UPcampusPOIs collection
  useEffect(() => {
    const fetchBuildings = async () => {
      try {
        setIsLoading(true);
        const snapshot = await firestore()
          .collection('UPcampusPOIs')
          .where('type', '==', 'building')
          .get();

        const buildingsData = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || 'Unnamed Building',
            centroid: data.centroid,
          };
        });

        setBuildings(buildingsData);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching buildings:', err);
        setError('Failed to load buildings. Please try again.');
        setIsLoading(false);
      }
    };

    fetchBuildings();
  }, []);

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
    <AdminLoadFloorplansContent
      colors={colors}
      navigation={navigation}
      buildingName={buildingName}
      setBuildingName={setBuildingName}
      floorLabel={floorLabel}
      setFloorLabel={setFloorLabel}
      buildings={buildings}
      selectedBuilding={selectedBuilding}
      onBuildingSelect={handleBuildingSelect}
      fileUri={fileUri}
      fileName={fileName}
      onPickFile={handlePickDocument}
      handleUpload={handleUpload}
      isLoading={isLoading}
      error={error}
    />
  );
}
