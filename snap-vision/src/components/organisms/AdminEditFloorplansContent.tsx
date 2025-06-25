import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import AppButton from '../atoms/AppButton';
import AppSecondaryButton from '../atoms/AppSecondaryButton';
import SettingsHeader from '../molecules/SettingsHeader';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import { launchImageLibrary } from 'react-native-image-picker';

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

export default function AdminEditFloorplansContent() {
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
  
  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text, marginTop: 16 }}>Loading floorplans...</Text>
      </View>
    );
  }
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title="Edit Floorplans" />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        
        {/* Error Display */}
        {error && (
          <View style={[styles.errorContainer, { backgroundColor: colors.danger }]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        
        {/* Add New Floorplan Button */}
        <AppButton
          title="Add New Floorplan"
          onPress={handleAddNewFloorplan}
          style={{ marginBottom: 24 }}
        />
        
        {/* Step 1: Select Floorplan */}
        <Text style={[styles.label, { color: colors.primary }]}>Select Existing Floorplan</Text>
        {floorplans.length === 0 ? (
          <Text style={{ color: colors.text, fontStyle: 'italic', marginBottom: 16 }}>
            No floorplans available. Add a new floorplan to get started.
          </Text>
        ) : (
          <View style={styles.floorplanList}>
            {floorplans.map(fp => (
              <TouchableOpacity
                key={fp.id}
                style={[
                  styles.floorplanItem,
                  { backgroundColor: selectedFloorplan === fp.id ? colors.primary : colors.card }
                ]}
                onPress={() => setSelectedFloorplan(fp.id)}
              >
                <Text style={{ 
                  color: selectedFloorplan === fp.id ? colors.background : colors.text,
                  fontWeight: '500'
                }}>
                  {fp.buildingName}
                </Text>
                <Text style={{ 
                  color: selectedFloorplan === fp.id ? colors.background : colors.text,
                  fontSize: 12
                }}>
                  {fp.floorLabel}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        
        {/* Action Buttons for Selected Floorplan */}
        {selectedFloorplan && (
          <View style={styles.actionContainer}>
            <Text style={[styles.sectionHeader, { color: colors.primary }]}>
              Floorplan Actions
            </Text>
            
            <View style={[styles.selectedDetails, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }]}>
              {floorplans.find(fp => fp.id === selectedFloorplan) && (
                <>
                  <Text style={[styles.detailText, { color: colors.text }]}>
                    <Text style={{ fontWeight: 'bold' }}>Building: </Text>
                    {floorplans.find(fp => fp.id === selectedFloorplan)?.buildingName}
                  </Text>
                  <Text style={[styles.detailText, { color: colors.text }]}>
                    <Text style={{ fontWeight: 'bold' }}>Floor: </Text>
                    {floorplans.find(fp => fp.id === selectedFloorplan)?.floorLabel}
                  </Text>
                  <Text style={[styles.detailText, { color: colors.text }]}>
                    <Text style={{ fontWeight: 'bold' }}>Last Modified: </Text>
                    {new Date(floorplans.find(fp => fp.id === selectedFloorplan)?.lastModified || '').toLocaleString()}
                  </Text>
                </>
              )}
            </View>
            
            {/* Edit Room POIs button */}
            <AppSecondaryButton
              title="Edit Room POIs"
              onPress={handleEditRooms}
              style={{ 
                marginTop: 16,
              }}
            />
            
            {/* Delete Floorplan button */}
            <AppSecondaryButton
              title="Delete Floorplan"
              onPress={handleDeleteFloorplan}
              style={{ 
                marginTop: 16,
              }}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  label: { 
    fontSize: 16, 
    fontWeight: '500', 
    marginBottom: 8 
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16
  },
  floorplanList: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    marginBottom: 24 
  },
  floorplanItem: {
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 8,
    minWidth: 100,
  },
  actionContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#ddd'
  },
  selectedDetails: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
  },
  detailText: {
    marginBottom: 4,
    fontSize: 14
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16
  },
  errorText: {
    color: 'white',
    fontWeight: '500'
  }
});