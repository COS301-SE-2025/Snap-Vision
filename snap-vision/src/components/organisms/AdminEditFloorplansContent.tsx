import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import SettingsHeader from '../molecules/SettingsHeader';
import StandardPopup from '../atoms/StandardPopup';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import { useUserRole } from '../../hooks/useUserRole';
import { useAdminFloorplans } from '../../hooks/useAdminFloorplans';
import { FloorplanSelectionFlow } from './FloorplanSelectionFlow';
import { FloorplanMeta } from '../../types/floorplan.types';

type RootStackParamList = {
  AdminEditFloorplansScreen: undefined;
  AdminLoadFloorplansScreen: undefined;
  AdminFloorplanEditor: {
    locationId: string;
    buildingId: string;
    floorLabel: string;
    imageUri?: string;
  };
};

export default function AdminEditFloorplansContent() {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  const { role, adminLocations, isLoading: isLoadingUser } = useUserRole();
  const {
    isLoading: isLoadingData,
    error,
    deleteFloorplan,
  } = useAdminFloorplans(role, adminLocations);

  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [floorplanToDelete, setFloorplanToDelete] = useState<FloorplanMeta | null>(null);

  const handleEditFloorplan = (floorplan: FloorplanMeta) => {
    navigation.navigate('AdminFloorplanEditor', {
      locationId: floorplan.locationId,
      buildingId: floorplan.buildingId,
      floorLabel: floorplan.floorLabel,
      imageUri: floorplan.downloadURL,
    });
  };

  const handleDeleteFloorplan = (floorplan: FloorplanMeta) => {
    setFloorplanToDelete(floorplan);
    setShowDeleteConfirmation(true);
  };

  const confirmDeleteFloorplan = async () => {
    if (!floorplanToDelete) return;

    const result = await deleteFloorplan(floorplanToDelete);

    if (result.success) {
      setSuccessMessage('Floorplan and POIs removed successfully.');
      setShowSuccessPopup(true);
    } else {
      // Error is already handled in the hook
    }
    setFloorplanToDelete(null);
  };

  const isLoading = isLoadingUser || isLoadingData;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title="Edit Floorplans" />

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      <FloorplanSelectionFlow
        role={role}
        adminLocations={adminLocations}
        onEditFloorplan={handleEditFloorplan}
        onDeleteFloorplan={handleDeleteFloorplan}
      />

      {/* Delete Confirmation Popup */}
      <StandardPopup
        visible={showDeleteConfirmation}
        title="Delete Floorplan"
        message="Are you sure you want to delete this floorplan? This action cannot be undone."
        onConfirm={() => {
          setShowDeleteConfirmation(false);
          confirmDeleteFloorplan();
        }}
        onCancel={() => {
          setShowDeleteConfirmation(false);
          setFloorplanToDelete(null);
        }}
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
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
});
