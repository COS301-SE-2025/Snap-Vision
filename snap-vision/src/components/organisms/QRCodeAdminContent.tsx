import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import RNFS from 'react-native-fs';
import QRCode from 'react-native-qrcode-svg';

import SettingsHeader from '../molecules/SettingsHeader';
import StandardPopup from '../atoms/StandardPopup';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import LoadingIndicator from '../atoms/LoadingIndicator';
import LocationSelector from '../molecules/LocationSelector';
import BuildingSelector from '../molecules/BuildingSelector';
import FloorSelector from '../molecules/FloorSelector';
import QRCodeList from './QRCodeList';
import QRCodeAddModal from './QRCodeAddModal';
import QRCodePreviewModal from './QRCodePreviewModal';

import {
  QRCodeMapping,
  createQRCodeMapping,
  deleteQRCodeMapping,
  getQRCodesForBuilding,
  getLocations,
  getBuildingsForLocation,
  getFloorsForBuilding,
  getRoomsForFloor,
} from '../../services/qrService';

// Types
interface Location {
  id: string;
  name: string;
}
interface Building {
  id: string;
  name: string;
}
interface Floor {
  id: string;
  name: string;
}
interface Room {
  id: string;
  name: string;
  floorId: string;
  buildingId: string;
  buildingName: string;
}

export default function QRCodeAdminContent() {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  // RBAC
  const [role, setRole] = useState<string | null>(null);
  const [adminLocations, setAdminLocations] = useState<string[]>([]);

  // Loading / error
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Hierarchy data
  const [locations, setLocations] = useState<Location[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [qrCodes, setQrCodes] = useState<QRCodeMapping[]>([]);

  // Selections
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [selectedFloorId, setSelectedFloorId] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedQrCode, setSelectedQrCode] = useState<QRCodeMapping | null>(null);

  // Inputs
  const [qrDescription, setQrDescription] = useState('');
  const [qrValue, setQrValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Dropdown UI
  const [buildingDropdownOpen, setBuildingDropdownOpen] = useState(false);
  const [floorDropdownOpen, setFloorDropdownOpen] = useState(false);

  // Popups / modals
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isGenerateModalVisible, setIsGenerateModalVisible] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Error popup states
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorTitle, setErrorTitle] = useState('Error');
  const [errorMessage, setErrorMessage] = useState('');

  // Confirmation popup state
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState<() => void>(() => {});

  // Info popup state
  const [showInfoPopup, setShowInfoPopup] = useState(false);
  const [infoTitle, setInfoTitle] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  // Ref to export QR
  const qrRef = useRef<QRCode | null>(null);

  // --- RBAC: fetch user role + permitted locations (editors) ---
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const uid = auth().currentUser?.uid;
        if (!uid) return;
        const doc = await firestore().doc(`userInformation/${uid}`).get();
        const data = doc.data();
        setRole(data?.role || 'user');
        setAdminLocations(data?.adminLocations || []);
      } catch (e) {
        console.error(e);
        setRole('user');
        setAdminLocations([]);
      }
    };
    fetchUserInfo();
  }, []);

  // --- Load locations (filtered for editor) ---
  useEffect(() => {
    const loadLocations = async () => {
      if (!role) return; // wait for RBAC
      try {
        setIsLoading(true);
        const all = await getLocations();
        const filtered =
          role === 'editor' ? all.filter((loc) => adminLocations.includes(loc.id)) : all;
        setLocations(filtered);
        // Clear downstream selections
        setSelectedLocationId(null);
        setSelectedBuildingId(null);
        setSelectedFloorId(null);
        setBuildings([]);
        setFloors([]);
        setRooms([]);
        setQrCodes([]);
        setError(null);
      } catch (e) {
        console.error('Error loading locations:', e);
        setError('Failed to load locations');
      } finally {
        setIsLoading(false);
      }
    };
    loadLocations();
  }, [role, adminLocations]);

  // --- When location selected: load buildings ---
  useEffect(() => {
    const loadBuildingsForLocation = async () => {
      if (!selectedLocationId) return;
      try {
        setIsLoading(true);
        const list = await getBuildingsForLocation(selectedLocationId);
        setBuildings(list);
        // reset deeper levels
        setSelectedBuildingId(null);
        setSelectedFloorId(null);
        setFloors([]);
        setRooms([]);
        setQrCodes([]);
        setError(null);
      } catch (e) {
        console.error('Error loading buildings:', e);
        setError('Failed to load buildings');
      } finally {
        setIsLoading(false);
      }
    };
    loadBuildingsForLocation();
  }, [selectedLocationId]);

  // --- When building selected: load floors + QR codes for building ---
  useEffect(() => {
    const loadFloorsAndQRCodes = async () => {
      if (!selectedLocationId || !selectedBuildingId) return;
      try {
        setIsLoading(true);
        const floorsData = await getFloorsForBuilding(selectedLocationId, selectedBuildingId);
        console.log('[QRCodeAdmin] floors count:', floorsData.length, floorsData);
        setFloors(floorsData);
        setSelectedFloorId(null);
        setRooms([]);
        const codes = await getQRCodesForBuilding(selectedLocationId, selectedBuildingId);
        setQrCodes(codes);
        setError(null);
      } catch (e) {
        console.error('Error loading floors/QR codes:', e);
        setError('Failed to load floors / QR codes');
      } finally {
        setIsLoading(false);
      }
    };
    loadFloorsAndQRCodes();
  }, [selectedBuildingId, selectedLocationId]);

  // --- When floor selected: load rooms (used in Add modal) ---
  useEffect(() => {
    const loadRoomsForFloor = async () => {
      if (!selectedLocationId || !selectedBuildingId || !selectedFloorId) return;
      try {
        const rs = await getRoomsForFloor(selectedLocationId, selectedBuildingId, selectedFloorId);
        setRooms(rs as any);
        setSelectedRoom(null);
        setError(null);
      } catch (e) {
        console.error('Error loading rooms:', e);
        setError('Failed to load rooms');
      }
    };
    loadRoomsForFloor();
  }, [selectedFloorId, selectedBuildingId, selectedLocationId]);

  // --- Actions ---
  const generateQRValue = () => {
    const rand = Math.random().toString(36).slice(2, 10);
    return `qr:${selectedLocationId || ''}:${selectedBuildingId || ''}:${selectedFloorId || ''}:${selectedRoom?.id || ''}:${rand}`;
  };

  const handleGenerateQRCode = () => {
    const v = generateQRValue();
    setQrValue(v);
  };

  const handleAddQRCode = async () => {
    if (!selectedLocationId || !selectedBuildingId || !selectedFloorId) {
      setErrorMessage('Please select a location, building and floor.');
      setShowErrorPopup(true);
      return;
    }
    if (!selectedRoom || !qrValue) {
      setErrorMessage('Please select a room and enter a QR code value.');
      setShowErrorPopup(true);
      return;
    }
    try {
      await createQRCodeMapping(
        selectedLocationId,
        locations.find((l) => l.id === selectedLocationId)?.name || selectedLocationId,
        selectedBuildingId,
        buildings.find((b) => b.id === selectedBuildingId)?.name || selectedBuildingId,
        selectedFloorId,
        selectedRoom.id,
        selectedRoom.name,
        qrValue,
        qrDescription,
      );
      // Refresh list
      const codes = await getQRCodesForBuilding(selectedLocationId, selectedBuildingId);
      setQrCodes(codes);

      setIsAddModalVisible(false);
      setSearchQuery('');
      setSelectedRoom(null);
      setQrValue('');
      setQrDescription('');
      setSuccessMessage('QR code added successfully.');
      setShowSuccessPopup(true);
    } catch (e) {
      console.error('Error adding QR code:', e);
      setErrorMessage('Failed to add QR code. Please try again.');
      setShowErrorPopup(true);
    }
  };

  const handleDeleteQRCode = (qr: QRCodeMapping) => {
    if (!selectedLocationId) {
      setErrorMessage('Location information missing.');
      setShowErrorPopup(true);
      return;
    }
    setConfirmMessage('Are you sure you want to delete this QR code mapping?');
    setConfirmAction(() => async () => {
      try {
        await deleteQRCodeMapping(selectedLocationId, qr.id);
        if (selectedBuildingId) {
          const codes = await getQRCodesForBuilding(selectedLocationId, selectedBuildingId);
          setQrCodes(codes);
        }
        setSuccessMessage('QR code removed successfully.');
        setShowSuccessPopup(true);
      } catch (e) {
        console.error('Error deleting QR code:', e);
        setErrorMessage('Failed to delete QR code. Please try again.');
        setShowErrorPopup(true);
      }
    });
    setShowConfirmPopup(true);
  };

  const handleQRRef = (ref: QRCode | null) => {
    qrRef.current = ref;
  };

  const handleViewQR = (qr: QRCodeMapping) => {
    setSelectedQrCode(qr);
    setQrValue(qr.qrValue);
    setIsGenerateModalVisible(true);
  };

  const handleLocationSelect = (locationId: string) => {
    setSelectedLocationId(locationId);
    setSelectedBuildingId(null);
    setSelectedFloorId(null);
  };

  // --- UI ---
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
        onConfirm={() => {
          setShowConfirmPopup(false);
          confirmAction();
        }}
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
          selectedLocationId={selectedLocationId}
          onLocationSelect={handleLocationSelect}
          title="Step 1: Select Location"
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
        onClose={() => {
          setIsAddModalVisible(false);
          setSelectedRoom(null);
          setQrValue('');
          setQrDescription('');
          setSearchQuery('');
        }}
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

// Simplified styles
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
