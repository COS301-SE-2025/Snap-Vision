import { useState } from 'react';
import { Platform, Alert } from 'react-native';
import { launchImageLibrary, ImagePickerResponse, MediaType } from 'react-native-image-picker';
import storage from '@react-native-firebase/storage';
import { saveFloorplanMetadata } from '../services/firebase/floorplanService';
import CacheService from '../services/CacheService';

const cacheService = CacheService.getInstance();

export type UploadedData = {
  locationId: string;
  buildingId: string;
  floorLabel: string;
  imageUri: string;
};

export const useFloorplanUpload = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [fileUri, setFileUri] = useState('');
  const [fileName, setFileName] = useState('');
  const [uploadedData, setUploadedData] = useState<UploadedData | null>(null);

  const handlePickDocument = async () => {
    try {
      //console.log(' [UPLOAD] Starting image picker...');
      
      return new Promise<{ success: boolean; uri?: string; name?: string; error?: string }>((resolve) => {
        const options = {
          mediaType: 'photo' as MediaType,
          includeBase64: false,
          maxHeight: 2000,
          maxWidth: 2000,
          quality: 0.8,
          selectionLimit: 1,
        };

        launchImageLibrary(options, (response: ImagePickerResponse) => {
          if (response.didCancel) {
            //console.log(' [UPLOAD] User cancelled image picker');
            resolve({ success: false, error: 'Selection cancelled' });
            return;
          }

          if (response.errorMessage) {
            console.error(' [UPLOAD] ImagePicker error:', response.errorMessage);
            const errorMessage = 'Failed to select image';
            setError(errorMessage);
            resolve({ success: false, error: errorMessage });
            return;
          }

          if (response.assets && response.assets.length > 0) {
            const asset = response.assets[0];
            const uri = asset.uri;
            const name = asset.fileName || `floorplan_${Date.now()}.jpg`;

            if (!uri) {
              const errorMessage = 'No image URI received';
              setError(errorMessage);
              resolve({ success: false, error: errorMessage });
              return;
            }

            setFileUri(uri);
            setFileName(name);
            setError('');
            //console.log(` [UPLOAD] Selected image: ${name}`);
            
            resolve({ success: true, uri, name });
          } else {
            const errorMessage = 'No image selected';
            setError(errorMessage);
            resolve({ success: false, error: errorMessage });
          }
        });
      });
    } catch (err: any) {
      const errorMessage = 'Failed to open image picker';
      setError(errorMessage);
      console.error(' [UPLOAD] Image picker error:', err);
      return { success: false, error: errorMessage };
    }
  };

  const handleUpload = async (
    selectedBuilding: any,
    selectedLocation: string,
    floorLabel: string,
    userRole?: string,
    adminLocations?: string[],
  ) => {
    //console.log(` [UPLOAD] Starting upload for ${selectedBuilding?.name} - Floor ${floorLabel}`);
    setError('');

    // Validation checks
    if (!selectedBuilding || !selectedLocation) {
      setError('Please select a building and location');
      return { success: false, error: 'Please select a building and location' };
    }

    if (!userRole) {
      setError('User access not yet loaded. Please wait...');
      return { success: false, error: 'User access not yet loaded. Please wait...' };
    }

    if (userRole === 'editor' && !adminLocations?.includes(selectedLocation)) {
      setError("You're not allowed to upload to this location.");
      return { success: false, error: "You're not allowed to upload to this location." };
    }

    if (isNaN(Number(floorLabel)) || Number(floorLabel) < 1) {
      setError('Please enter a valid floor number (1 or higher)');
      return { success: false, error: 'Please enter a valid floor number (1 or higher)' };
    }

    if (!fileUri) {
      setError('Please select an image file');
      return { success: false, error: 'Please select an image file' };
    }

    try {
      setIsLoading(true);
      //console.log(' [UPLOAD] Uploading to Firebase Storage...');

      const buildingId = selectedBuilding.id;
      const fileName = `${buildingId}_floor_${floorLabel}_${Date.now()}.jpg`;
      const ref = storage().ref(`floorplans/${selectedLocation}/${buildingId}/${fileName}`);

      // Upload the file
      await ref.putFile(fileUri);
      const downloadURL = await ref.getDownloadURL();
      //console.log(' [UPLOAD] File uploaded to storage');

      // Save metadata to Firestore
      //console.log(' [UPLOAD] Saving metadata to Firestore...');
      await saveFloorplanMetadata(selectedLocation, buildingId, floorLabel, downloadURL);

      const uploadResult: UploadedData = {
        locationId: selectedLocation,
        buildingId,
        floorLabel,
        imageUri: downloadURL,
      };

      setUploadedData(uploadResult);
      //console.log(' [UPLOAD] Upload completed successfully');

      // Invalidate related caches after successful upload
      //console.log(' [UPLOAD] Invalidating related caches...');
      await cacheService.remove(`admin_floorplans:${selectedLocation}:${buildingId}`);
      await cacheService.remove(`admin_buildings:${selectedLocation}`);
      await cacheService.remove('admin_locations', true);
      
      // Also invalidate editor-specific caches
      await cacheService.remove(`floors:${selectedLocation}:${buildingId}`);
      await cacheService.remove(`rooms:${selectedLocation}:${buildingId}`);
      await cacheService.remove(`floorplan_url:${selectedLocation}:${buildingId}:${floorLabel}`);
      
      // Invalidate any building-specific caches
      await cacheService.remove(`buildings:${selectedLocation}`);

      return { success: true, data: uploadedData };
    } catch (err) {
      ////consoleerror('Error uploading floorplan:', err);
      setError('Failed to upload floorplan');
      setIsLoading(false);
    }
  };

  const resetState = () => {
    setFileUri('');
    setFileName('');
    setUploadedData(null);
    setError('');
  };

  return {
    isLoading,
    error,
    fileUri,
    fileName,
    handlePickDocument,
    handleUpload,
    uploadedData,
    setError,
    resetState,
  };
};