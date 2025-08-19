import { useState } from 'react';
import * as ImagePicker from 'react-native-image-picker';
import { uploadFloorplanImage } from '../services/firebase/uploadService';
import { saveFloorplanMetadata } from '../services/firebase/floorplanService';
import { UploadedData } from '../types/floorplan';

export const useFloorplanUpload = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileUri, setFileUri] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [uploadedData, setUploadedData] = useState<UploadedData | null>(null);

  const handlePickDocument = async () => {
    try {
      const result = await ImagePicker.launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
      });

      if (!result.didCancel && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.uri && asset.fileName) {
          setFileUri(asset.uri);
          setFileName(asset.fileName);
          return { success: true, uri: asset.uri, name: asset.fileName };
        } else if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          setError('Please select an image smaller than 5MB.');
          return { success: false, error: 'Please select an image smaller than 5MB.' };
        } else {
          setError('Invalid image selected. Please try again.');
          return { success: false, error: 'Invalid image selected. Please try again.' };
        }
      } else if (result.errorMessage) {
        setError(`Image Picker error: ${result.errorMessage}`);
        return { success: false, error: `Image Picker error: ${result.errorMessage}` };
      }
      return { success: false };
    } catch (err) {
      console.error('Error picking image:', err);
      setError('Failed to select image');
      return { success: false, error: 'Failed to select image' };
    }
  };

  const handleUpload = async (
    selectedBuilding: any,
    selectedLocation: string,
    floorLabel: string,
    userRole?: string,
    adminLocations?: string[],
  ) => {
    setError(null);

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
      setError('Please select a floorplan file');
      return { success: false, error: 'Please select a floorplan file' };
    }

    try {
      setIsLoading(true);

      const downloadURL = await uploadFloorplanImage(
        selectedLocation,
        selectedBuilding.id,
        floorLabel,
        fileUri,
      );

      await saveFloorplanMetadata(selectedLocation, selectedBuilding.id, floorLabel, downloadURL);

      const uploadData: UploadedData = {
        buildingId: selectedBuilding.id,
        floorLabel,
        imageUri: downloadURL,
        locationId: selectedLocation,
      };

      setUploadedData(uploadData);
      setIsLoading(false);

      return { success: true, data: uploadData };
    } catch (err) {
      console.error('Error uploading floorplan:', err);
      setError('Failed to upload floorplan');
      setIsLoading(false);
      return { success: false, error: 'Failed to upload floorplan' };
    }
  };

  const resetUpload = () => {
    setFileUri(null);
    setFileName('');
    setUploadedData(null);
    setError(null);
  };

  return {
    isLoading,
    error,
    fileUri,
    fileName,
    uploadedData,
    handlePickDocument,
    handleUpload,
    resetUpload,
    setError,
  };
};
