import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import AppInput from '../atoms/AppInput';
import AppButton from '../atoms/AppButton';
import AppSecondaryButton from '../atoms/AppSecondaryButton';
import SettingsHeader from '../molecules/SettingsHeader';
import StandardPopup from '../atoms/StandardPopup';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import { LocationSelector } from '../molecules/LocationSelector';
import { useBuildings } from '../../hooks/useBuildings';
import { useFloorplanUpload } from '../../hooks/useFloorplanUpload';
import { useUserRole } from '../../hooks/useUserRole';
import BuildingSelector from '../molecules/BuildingSelector';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';

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
  const { buildings, locations, isLoading: isLoadingBuildings } = useBuildings();

  const { role: userRole, adminLocations } = useUserRole();

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

  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [floorLabel, setFloorLabel] = useState('');
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showNavigationConfirm, setShowNavigationConfirm] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [buildingDropdownOpen, setBuildingDropdownOpen] = useState(false);

  // Filter buildings based on selected location
  const filteredBuildings = selectedLocation
    ? buildings.filter((building) => building.location === selectedLocation)
    : [];

  // Filter buildings when location changes
  useEffect(() => {
    if (selectedLocation) {
      setSelectedBuildingId(null);
      setCurrentStep(1);
    }
  }, [selectedLocation]);

  // Move to next step automatically
  useEffect(() => {
    if (floorLabel && currentStep < 3) setCurrentStep(3);
    if (fileUri && currentStep < 4) setCurrentStep(4);
  }, [floorLabel, fileUri]);

  // Handle upload
  const onUpload = async () => {
    const selectedBuilding = buildings.find((b) => b.id === selectedBuildingId) || null;
    const result = await handleUpload(
      selectedBuilding,
      selectedLocation || '',
      floorLabel,
      userRole,
      adminLocations || [],
    );
    if (result.success) setShowSuccessPopup(true);
    else setShowErrorPopup(true);
  };

  const handleSuccessConfirm = () => {
    setShowSuccessPopup(false);
    setShowNavigationConfirm(true);
  };

  const handleNavigateToPOIEditor = () => {
    if (uploadedData) {
      navigation.navigate('AdminFloorplanEditor', uploadedData);
    }
    resetForm();
  };

  const handleLater = () => resetForm();

  const resetForm = () => {
    setSelectedLocation('');
    setSelectedBuildingId(null);
    setFloorLabel('');
    setShowNavigationConfirm(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title="Upload Floorplan" />

      {(isLoadingBuildings || isUploading) && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.text, marginTop: 16 }}>Processing...</Text>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
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

        {/* Step 0: Select Location */}
        <LocationSelector
          locations={locations}
          selectedLocation={selectedLocation}
          onLocationSelect={setSelectedLocation}
        />

        {/* Step 1: Select Building */}
        {selectedLocation && currentStep >= 1 && (
          <>
            {buildings.length === 0 ? (
              <View style={styles.sectionContainer}>
                <Text style={[styles.infoText, { color: colors.secondary }]}>
                  No buildings available. Please check your connection.
                </Text>
              </View>
            ) : (
              <BuildingSelector
                buildings={filteredBuildings}
                selectedBuildingId={selectedBuildingId}
                setSelectedBuildingId={(id) => {
                  setSelectedBuildingId(id);
                  if (id) setCurrentStep(2);
                }}
                dropdownOpen={buildingDropdownOpen}
                setDropdownOpen={setBuildingDropdownOpen}
                title="Step 1: Select Building"
              />
            )}
          </>
        )}

        {/* Step 2: Floor Label */}
        {selectedBuildingId && currentStep >= 2 && (
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>
              Step 2: Floor Information
            </Text>
            <AppInput
              placeholder="Enter floor number (e.g., 1, 2, 3...)"
              value={floorLabel}
              onChangeText={(text) => setFloorLabel(text.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              testID="input-floor-label"
              style={[
                styles.textField,
                { borderColor: colors.primary, color: colors.text, backgroundColor: colors.card },
              ]}
            />
          </View>
        )}

        {/* Step 3: Upload Floorplan */}
        {floorLabel && currentStep >= 3 && (
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>
              Step 3: Select Floorplan File
            </Text>
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
        )}

        {/* Step 4: Upload Button */}
        {currentStep >= 4 && (
          <View style={styles.submitContainer}>
            <AppButton
              title="Upload Floorplan"
              onPress={onUpload}
              testID="button-upload-floorplan"
              disabled={!fileUri || !selectedBuildingId || !floorLabel}
            />
          </View>
        )}
      </ScrollView>

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
  content: { flex: 1, paddingHorizontal: 16 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  sectionContainer: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 8,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  textField: { marginBottom: 4 },
  infoText: { fontSize: 12 },
  fileInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  fileName: { marginLeft: 8, flex: 1 },
  submitContainer: { marginTop: 8, marginBottom: 32 },
});
