import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import AppInput from '../atoms/AppInput';
import AppButton from '../atoms/AppButton';
import AppSecondaryButton from '../atoms/AppSecondaryButton';
import SettingsHeader from '../molecules/SettingsHeader';
import StandardPopup from '../atoms/StandardPopup';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import { useFloorplanUpload } from '../../hooks/useFloorplanUpload';
import { useUserRole } from '../../hooks/useUserRole';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { AdminFloorplanUploadFlow } from './AdminFloorplanUploadFlow';
import { FloorplanMeta } from '../../types/floorplan.types';

type RootStackParamList = {
  AdminFloorplanEditor: any;
};

type AdminLoadFloorplansNavigationProp = StackNavigationProp<
  RootStackParamList,
  'AdminFloorplanEditor'
>;

export default function AdminLoadFloorplansContent() {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const navigation = useNavigation<AdminLoadFloorplansNavigationProp>();

  const { role, adminLocations, isLoading: isLoadingUser } = useUserRole();

  const {
    isLoading: isUploading,
    error,
    fileUri,
    fileName,
    handlePickDocument,
    handleUpload,
    uploadedData,
    setError,
  } = useFloorplanUpload();

  // Upload state
  const [floorLabel, setFloorLabel] = useState('');
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showNavigationConfirm, setShowNavigationConfirm] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [selectedBuildingName, setSelectedBuildingName] = useState<string | null>(null);

  const isLoading = isLoadingUser || isUploading;

  // Handle upload
  const onUpload = async () => {
    try {
      if (!selectedBuildingId || !selectedBuildingName || !selectedLocation || !floorLabel) {
        setError('Please complete all steps before uploading');
        setShowErrorPopup(true);
        return;
      }

      const result = await handleUpload(
        {
          id: selectedBuildingId,
          name: selectedBuildingName,
        },
        selectedLocation,
        floorLabel,
        role || undefined,
        adminLocations || [],
      );

      if (result.success) {
        setShowSuccessPopup(true);
      } else {
        setShowErrorPopup(true);
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err?.message || 'Unknown error occurred during upload');
      setShowErrorPopup(true);
    }
  };

  const handleSuccessConfirm = () => {
    setShowSuccessPopup(false);
    setShowNavigationConfirm(true);
  };

  const resetForm = () => {
    setSelectedLocation(null);
    setSelectedBuildingId(null);
    setSelectedBuildingName(null);
    setFloorLabel('');
    setShowNavigationConfirm(false);
  };

  const handleNavigateToPOIEditor = () => {
    if (uploadedData) {
      navigation.navigate('AdminFloorplanEditor', uploadedData);
    }
    resetForm();
  };

  const handleLater = () => resetForm();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title="Upload Floorplan" />

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} testID="ActivityIndicator" />
        </View>
      )}

      <AdminFloorplanUploadFlow
        role={role}
        adminLocations={adminLocations || []}
        onSelectionChange={(data) => {
          setSelectedLocation(data.locationId);
          setSelectedBuildingId(data.buildingId);
          setSelectedBuildingName(data.buildingName);
          setFloorLabel(data.floorNumber);
        }}
      />

      {selectedBuildingId && selectedBuildingName && floorLabel && (
        <View style={styles.uploadSection}>
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>
              Upload Floorplan for {selectedBuildingName} - Floor {floorLabel}
            </Text>

            <View style={styles.fileSection}>
              <AppSecondaryButton
                title={fileUri ? 'Change Image' : 'Select Floorplan Image'}
                onPress={handlePickDocument}
                testID={fileUri ? 'button-change-image' : 'button-select-image'}
              />
              {fileUri && (
                <View style={[styles.fileInfoContainer, { backgroundColor: colors.card }]}>
                  <Icon name="file-document" size={24} color={colors.primary} />
                  <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
                    {fileName}
                  </Text>
                </View>
              )}
            </View>

            <AppButton
              title="Upload Floorplan"
              onPress={onUpload}
              testID="button-upload-floorplan"
              disabled={!fileUri || !floorLabel}
            />
          </View>
        </View>
      )}

      {/* Error Popup */}
      <StandardPopup
        visible={showErrorPopup && !!error}
        title="Error"
        message={error || ''}
        onConfirm={() => {
          setShowErrorPopup(false);
          setError(null);
        }}
        showCancel={false}
      />

      {/* Success Popup */}
      <StandardPopup
        visible={showSuccessPopup}
        title="Upload Successful"
        message="Floorplan uploaded successfully!"
        onConfirm={handleSuccessConfirm}
        confirmText="Continue"
        showCancel={false}
      />

      {/* Navigation Confirmation Popup */}
      <StandardPopup
        visible={showNavigationConfirm}
        title="Add Room POIs"
        message="Would you like to add room POIs now?"
        onConfirm={handleNavigateToPOIEditor}
        onCancel={handleLater}
        confirmText="Add POIs"
        cancelText="Later"
        showCancel
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  uploadSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
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
  fileSection: {
    marginBottom: 24,
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
});
