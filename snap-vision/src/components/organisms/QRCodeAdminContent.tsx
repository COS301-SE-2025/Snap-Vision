import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

import SettingsHeader from '../molecules/SettingsHeader';
import StandardPopup from '../atoms/StandardPopup';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import LoadingIndicator from '../atoms/LoadingIndicator';
import { LocationSelector } from '../molecules/LocationSelector';
import BuildingSelector from '../molecules/BuildingSelector';
import FloorSelector from '../molecules/FloorSelector';
import QRCodeList from './QRCodeList';
import QRCodeAddModal from './QRCodeAddModal';
import QRCodePreviewModal from './QRCodePreviewModal';
import { useQRCodeAdmin } from '../../hooks/useQRCodeAdmin';

export default function QRCodeAdminContent() {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  const {
    // Data state
    locations,
    buildings,
    floors,
    rooms,
    qrCodes,

    // Selection state
    selectedLocationId,
    selectedBuildingId,
    selectedFloorId,
    selectedRoom,

    // Input state
    qrDescription,
    qrValue,
    searchQuery,

    // UI state
    buildingDropdownOpen,
    floorDropdownOpen,
    isAddModalVisible,
    isGenerateModalVisible,

    // Loading and error state
    isLoading,
    error,

    // Popup states
    showSuccessPopup,
    successMessage,
    showErrorPopup,
    errorMessage,
    showConfirmPopup,
    confirmMessage,
    showInfoPopup,
    infoTitle,
    infoMessage,

    // Actions
    handleLocationSelect,
    setSelectedBuildingId,
    setSelectedFloorId,
    setSelectedRoom,
    setQrDescription,
    setQrValue,
    setSearchQuery,
    setBuildingDropdownOpen,
    setFloorDropdownOpen,
    setIsAddModalVisible,
    setIsGenerateModalVisible,
    setShowSuccessPopup,
    setShowErrorPopup,
    setShowConfirmPopup,
    setShowInfoPopup,

    // Business logic actions
    handleGenerateQRCode,
    handleAddQRCode,
    handleDeleteQRCode,
    handleViewQR,
    confirmAction,
    resetAddModal,
  } = useQRCodeAdmin();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title="QR Code Management" />

      {/* Error Popup */}
      <StandardPopup
        visible={showErrorPopup}
        title="Error"
        message={errorMessage}
        onConfirm={() => setShowErrorPopup(false)}
      />

      {/* Success Popup */}
      <StandardPopup
        visible={showSuccessPopup}
        title="Success"
        message={successMessage}
        onConfirm={() => setShowSuccessPopup(false)}
      />

      {/* Confirmation Popup */}
      <StandardPopup
        visible={showConfirmPopup}
        title="Confirm Delete"
        message={confirmMessage}
        onConfirm={confirmAction}
        onCancel={() => setShowConfirmPopup(false)}
        showCancel={true}
        confirmText="Delete"
      />

      {/* Info Popup */}
      <StandardPopup
        visible={showInfoPopup}
        title={infoTitle}
        message={infoMessage}
        onConfirm={() => setShowInfoPopup(false)}
      />

      {isLoading && <LoadingIndicator overlay={true} />}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {error && (
          <View style={[styles.errorContainer, { backgroundColor: colors.danger }]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Step 1: Select Location */}
        <LocationSelector
          locations={locations}
          selectedLocation={selectedLocationId || ''}
          onLocationSelect={handleLocationSelect}
        />

        {/* Step 2: Select Building */}
        {selectedLocationId && (
          <BuildingSelector
            buildings={buildings}
            selectedBuildingId={selectedBuildingId}
            setSelectedBuildingId={setSelectedBuildingId}
            dropdownOpen={buildingDropdownOpen}
            setDropdownOpen={setBuildingDropdownOpen}
            title="Step 2: Select Building"
          />
        )}

        {/* Step 3: Select Floor */}
        {selectedBuildingId && (
          <FloorSelector
            floors={floors}
            selectedFloorId={selectedFloorId}
            setSelectedFloorId={setSelectedFloorId}
            dropdownOpen={floorDropdownOpen}
            setDropdownOpen={setFloorDropdownOpen}
            title="Step 3: Select Floor"
          />
        )}

        {/* Step 4: Manage QR Codes */}
        {selectedFloorId && selectedBuildingId && selectedLocationId && (
          <QRCodeList
            qrCodes={qrCodes}
            rooms={rooms}
            buildings={buildings}
            floors={floors}
            selectedBuildingId={selectedBuildingId}
            selectedFloorId={selectedFloorId}
            onViewQR={handleViewQR}
            onDeleteQR={handleDeleteQRCode}
            onAddQR={() => setIsAddModalVisible(true)}
          />
        )}
      </ScrollView>

      {/* Add QR Code Modal */}
      <QRCodeAddModal
        visible={isAddModalVisible}
        rooms={rooms}
        selectedRoom={selectedRoom}
        onRoomSelect={setSelectedRoom}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        qrValue={qrValue}
        onQrValueChange={setQrValue}
        qrDescription={qrDescription}
        onQrDescriptionChange={setQrDescription}
        onGenerateQR={handleGenerateQRCode}
        onAdd={handleAddQRCode}
        onClose={resetAddModal}
      />

      {/* QR Code Preview Modal */}
      <QRCodePreviewModal
        visible={isGenerateModalVisible}
        qrValue={qrValue}
        onClose={() => setIsGenerateModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: 16 },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    marginVertical: 16,
  },
  errorText: { color: 'white', fontWeight: '500' },
});
