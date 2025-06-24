import React, { useState, useEffect } from 'react';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import AdminEditFloorplansContent from '../components/organisms/AdminEditFloorplansContent';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import RNFS from 'react-native-fs';
import { launchImageLibrary } from 'react-native-image-picker'; // Use image picker instead of document picker

// Interface for floorplan data
interface Floorplan {
  id: string;
  buildingId: string;
  buildingName: string;
  floorLabel: string;
  lastModified: string;
  localUri?: string;
}

type RootStackParamList = {
  AdminEditFloorplansScreen: undefined;
  AdminLoadFloorplansScreen: undefined;
  AdminFloorplanEditor: { buildingId: string; floorLabel: string; imageUri?: string };
};

export default function AdminEditFloorplansScreen() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  const [floorplans, setFloorplans] = useState<Floorplan[]>([]);
  const [selectedFloorplan, setSelectedFloorplan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch floorplans data from AsyncStorage and Firestore
  useEffect(() => {
    const fetchFloorplans = async () => {
      try {
        setIsLoading(true);
        // Get floorplan metadata from AsyncStorage
        const keys = await AsyncStorage.getAllKeys();
        const floorplanKeys = keys.filter(key => key.startsWith('floorplan_'));
        
        const floorplanData = await Promise.all(
          floorplanKeys.map(async (key) => {
            const data = await AsyncStorage.getItem(key);
            return data ? JSON.parse(data) : null;
          })
        );

        // Filter out null values and format data
        const validFloorplans = floorplanData
          .filter(Boolean)
          .map(fp => ({
            id: `${fp.buildingId}_${fp.floorLabel}`,
            buildingId: fp.buildingId,
            buildingName: fp.buildingName || fp.buildingId,
            floorLabel: fp.floorLabel,
            lastModified: fp.timestamp || new Date().toISOString(),
            localUri: fp.uri
          }));

        setFloorplans(validFloorplans);
      } catch (err) {
        console.error('Error fetching floorplans:', err);
        setError('Failed to load floorplans');
      } finally {
        setIsLoading(false);
      }
    };

    fetchFloorplans();
  }, []);

  const handleUploadUpdated = async () => {
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
      const floorplan = floorplans.find(fp => fp.id === selectedFloorplan);
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
      setFloorplans(prev => 
        prev.map(fp => 
          fp.id === selectedFloorplan 
            ? {...fp, localUri: `file://${destPath}`, lastModified: new Date().toISOString()} 
            : fp
        )
      );
      
      Alert.alert('Success', 'Floorplan updated successfully');
    } catch (err) {
      console.error('Error updating floorplan:', err);
      setError(`Failed to update floorplan: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
    
    const floorplan = floorplans.find(fp => fp.id === selectedFloorplan);
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
      buildingId: floorplan.buildingId,
      floorLabel: floorplan.floorLabel,
      imageUri: floorplan.localUri
    });
  };

  const handleDeleteFloorplan = async () => {
    if (!selectedFloorplan) return;
    
    Alert.alert(
      'Delete Floorplan',
      'Are you sure you want to delete this floorplan? This will also delete all associated room POIs.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              setIsLoading(true);
              const floorplan = floorplans.find(fp => fp.id === selectedFloorplan);
              if (!floorplan) return;
              
              // Delete from AsyncStorage
              await AsyncStorage.removeItem(`floorplan_${floorplan.buildingId}_${floorplan.floorLabel}`);
              
              // Delete associated room POIs from Firestore
              const snapshot = await firestore()
                .collection('RoomPOIs')
                .where('buildingId', '==', floorplan.buildingId)
                .where('floorId', '==', floorplan.floorLabel)
                .get();
                
              const batch = firestore().batch();
              snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
              });
              
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
              setFloorplans(prev => prev.filter(fp => fp.id !== selectedFloorplan));
              setSelectedFloorplan(null);
              setIsLoading(false);
              
              Alert.alert('Success', 'Floorplan and associated POIs deleted');
            } catch (err) {
              setIsLoading(false);
              console.error('Error deleting floorplan:', err);
              setError('Failed to delete floorplan');
            }
          }
        }
      ]
    );
  };

  return (
    <AdminEditFloorplansContent
      colors={colors}
      navigation={navigation}
      floorplans={floorplans}
      selectedFloorplan={selectedFloorplan}
      setSelectedFloorplan={setSelectedFloorplan}
      handleUploadUpdated={handleUploadUpdated}
      handleAddNew={handleAddNewFloorplan}
      handleEditRooms={handleEditRooms}
      handleDelete={handleDeleteFloorplan}
      isLoading={isLoading}
      error={error}
    />
  );
}