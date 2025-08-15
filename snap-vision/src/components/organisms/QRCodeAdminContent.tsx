// src/components/organisms/QRCodeAdminContent.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import QRCode from 'react-native-qrcode-svg';
import RNFS from 'react-native-fs';

import SettingsHeader from '../molecules/SettingsHeader';
import StandardPopup from '../atoms/StandardPopup';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

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
interface Location { id: string; name: string }
interface Building { id: string; name: string }
interface Floor { id: string; name: string } // usually your floorLabel
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
  const buildingDropdownItems = useMemo(
    () => buildings.map((b) => ({ label: b.name, value: b.id })),
    [buildings]
  );
  const floorDropdownItems = useMemo(
    () => floors.map((f) => ({ label: `Floor ${f.name}`, value: f.id })),
    [floors]
  );

  // Popups / modals
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isGenerateModalVisible, setIsGenerateModalVisible] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

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
        const filtered = role === 'editor' ? all.filter((loc) => adminLocations.includes(loc.id)) : all;
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

  // Only show QR codes for the selected floor
  const floorQRCodes = useMemo(
    () =>
      qrCodes.filter(
        (c) => String(c.floorId) === String(selectedFloorId ?? '')
      ),
    [qrCodes, selectedFloorId]
  );

  // --- Filtering for room search in Add modal ---
  const filteredRooms = useMemo(
    () => rooms.filter((r) => r.name.toLowerCase().includes(searchQuery.trim().toLowerCase())),
    [rooms, searchQuery]
  );

  // --- Actions ---
  const generateQRValue = () => {
    const rand = Math.random().toString(36).slice(2, 10);
    return `qr:${selectedLocationId || ''}:${selectedBuildingId || ''}:${selectedFloorId || ''}:${selectedRoom?.id || ''}:${rand}`;
  };

  const handleGenerateQRCode = () => {
    const v = generateQRValue();
    setQrValue(v);
    setIsGenerateModalVisible(true);
  };

  const handleAddQRCode = async () => {
    if (!selectedLocationId || !selectedBuildingId || !selectedFloorId) {
      Alert.alert('Error', 'Please select a location, building and floor.');
      return;
    }
    if (!selectedRoom || !qrValue) {
      Alert.alert('Error', 'Please select a room and enter a QR code value.');
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
        qrDescription
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
      Alert.alert('Error', 'Failed to add QR code. Please try again.');
    }
  };

  const openEditModal = (qr: QRCodeMapping) => {
    setSelectedQrCode(qr);
    setQrDescription(qr.description || '');
    setIsEditModalVisible(true);
  };

  const handleEditQRCode = async () => {
    if (!selectedQrCode || !selectedLocationId) return;
    try {
      await firestore()
        .doc(`locations/${selectedLocationId}/qrCodes/${selectedQrCode.id}`)
        .update({ description: qrDescription });

      if (selectedBuildingId) {
        const codes = await getQRCodesForBuilding(selectedLocationId, selectedBuildingId);
        setQrCodes(codes);
      }

      setIsEditModalVisible(false);
      setSelectedQrCode(null);
      setQrDescription('');
      setSuccessMessage('QR code updated successfully.');
      setShowSuccessPopup(true);
    } catch (e) {
      console.error('Error updating QR code:', e);
      Alert.alert('Error', 'Failed to update QR code. Please try again.');
    }
  };

  const handleDeleteQRCode = (qr: QRCodeMapping) => {
    if (!selectedLocationId) {
      Alert.alert('Error', 'Location information missing.');
      return;
    }
    Alert.alert('Confirm Delete', 'Are you sure you want to delete this QR code mapping?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
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
            Alert.alert('Error', 'Failed to delete QR code. Please try again.');
          }
        },
      },
    ]);
  };

  // Export QR to PNG (saved in app cache directory)
  const handleSavePng = async () => {
    try {
      if (!qrRef.current) {
        Alert.alert('Error', 'QR component not ready.');
        return;
      }
      // toDataURL returns base64 PNG
      qrRef.current.toDataURL(async (data: string) => {
        try {
          const filePath = `${RNFS.CachesDirectoryPath}/qr-${Date.now()}.png`;
          await RNFS.writeFile(filePath, data, 'base64');
          Alert.alert('Saved', `QR PNG saved to:\n${filePath}`);
        } catch (err) {
          console.error('Save PNG error:', err);
          Alert.alert('Error', 'Failed to save PNG.');
        }
      });
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Could not export QR PNG.');
    }
  };

  // --- UI ---
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title="QR Code Management" />

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.text, marginTop: 16 }}>Loading...</Text>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {error && (
          <View style={[styles.errorContainer, { backgroundColor: colors.danger }]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Step 1: Select Location (chips) */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Step 1: Select Location</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {locations.map((loc) => (
              <TouchableOpacity
                key={loc.id}
                style={[
                  styles.chip,
                  { backgroundColor: selectedLocationId === loc.id ? colors.primary : colors.card },
                ]}
                onPress={() => {
                  setSelectedLocationId(loc.id);
                  setSelectedBuildingId(null);
                  setSelectedFloorId(null);
                }}
              >
                <Text style={{ color: selectedLocationId === loc.id ? '#FFF' : colors.text }}>
                  {loc.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Step 2: Select Building (searchable dropdown) */}
        {selectedLocationId && (
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Step 2: Select Building</Text>
            <DropDownPicker
              open={buildingDropdownOpen}
              setOpen={setBuildingDropdownOpen}
              items={buildingDropdownItems}
              value={selectedBuildingId}
              setValue={(get) => setSelectedBuildingId(get())}
              searchable
              listMode="SCROLLVIEW"
              placeholder="Select a building"
              zIndex={3000}
              zIndexInverse={1000}
              style={{ backgroundColor: colors.card, borderColor: colors.primary }}
              dropDownContainerStyle={{ backgroundColor: colors.card, borderColor: colors.primary }}
              textStyle={{ color: colors.text }}
              searchTextInputStyle={{ color: colors.text }}
            />
          </View>
        )}

        {/* Step 3: Select Floor (searchable dropdown) */}
        {selectedBuildingId && (
          <View style={styles.sectionContainer}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Step 3: Select Floor</Text>
            <DropDownPicker
              open={floorDropdownOpen}
              setOpen={setFloorDropdownOpen}
              items={floorDropdownItems}
              value={selectedFloorId}
              setValue={(get) => setSelectedFloorId(get())}
              searchable
              listMode="SCROLLVIEW"
              placeholder="Select a floor"
              zIndex={2000}
              zIndexInverse={900}
              style={{ backgroundColor: colors.card, borderColor: colors.primary }}
              dropDownContainerStyle={{ backgroundColor: colors.card, borderColor: colors.primary }}
              textStyle={{ color: colors.text }}
              searchTextInputStyle={{ color: colors.text }}
            />
          </View>
        )}

        {/* Step 4: Manage QR Codes (now filtered by floor) */}
        {selectedFloorId && selectedBuildingId && selectedLocationId && (
          <View style={styles.sectionContainer}>
            <Text style={{ color: colors.text, marginBottom: 12, fontWeight: '500' }}>
              QR Codes for Building{' '}
              {buildings.find((b) => b.id === selectedBuildingId)?.name || selectedBuildingId},{' '}
              Floor {floors.find((f) => f.id === selectedFloorId)?.name || selectedFloorId}
            </Text>

            <View style={styles.sectionHeader}>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: colors.primary }]}
                onPress={() => setIsAddModalVisible(true)}
              >
                <Icon name="qrcode-plus" size={20} color="#FFF" />
                <Text style={styles.addButtonText}>Add New</Text>
              </TouchableOpacity>
            </View>

            {floorQRCodes.length === 0 ? (
              <View style={styles.emptyState}>
                <Icon name="qrcode-remove" size={48} color={colors.secondary} />
                <Text style={[styles.emptyText, { color: colors.text }]}>
                  No QR codes found for this floor
                </Text>
              </View>
            ) : (
              <FlatList
                data={floorQRCodes}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const roomObj = rooms.find((r) => r.id === item.roomId);
                  return (
                    <View style={[styles.qrCodeItem, { backgroundColor: colors.card }]}>
                      <View style={styles.qrCodeDetails}>
                        <Text style={[styles.roomName, { color: colors.text }]}>
                          Room: {roomObj?.name || item.roomName || 'Unknown Room'}
                        </Text>
                        <Text style={[styles.qrCodeValue, { color: colors.secondary }]}>
                          {item.qrValue}
                        </Text>
                        {!!item.description && (
                          <Text style={[styles.qrCodeDesc, { color: colors.text }]}>{item.description}</Text>
                        )}
                        <Text style={[styles.qrCodeFloor, { color: colors.secondary }]}>
                          Floor: {item.floorId}
                        </Text>
                      </View>

                      <View style={styles.qrCodeActions}>
                        <TouchableOpacity
                          style={[styles.actionButton, { backgroundColor: colors.primary }]}
                          onPress={() => {
                            setSelectedQrCode(item);
                            setQrValue(item.qrValue);
                            setIsGenerateModalVisible(true);
                          }}
                        >
                          <Icon name="qrcode" size={20} color="#FFF" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionButton, { backgroundColor: colors.card }]}
                          onPress={() => openEditModal(item)}
                        >
                          <Icon name="pencil" size={20} color={colors.primary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionButton, { backgroundColor: '#FF3B30' }]}
                          onPress={() => handleDeleteQRCode(item)}
                        >
                          <Icon name="trash-can-outline" size={20} color="#FFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                }}
              />
            )}
          </View>
        )}
      </ScrollView>

      {/* Success Popup */}
      <StandardPopup
        visible={showSuccessPopup}
        title="Success"
        message={successMessage}
        onConfirm={() => setShowSuccessPopup(false)}
        confirmText="OK"
        showCancel={false}
      />

      {/* Add QR Code Modal */}
      <Modal
        visible={isAddModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add New QR Code</Text>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Select Room</Text>
            <TextInput
              style={[styles.searchInput, { backgroundColor: colors.card, color: colors.text }]}
              placeholder="Search rooms..."
              placeholderTextColor={colors.secondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            <ScrollView style={styles.roomList} nestedScrollEnabled>
              {selectedFloorId ? (
                filteredRooms.map((room) => (
                  <TouchableOpacity
                    key={room.id}
                    style={[
                      styles.roomItem,
                      { backgroundColor: selectedRoom?.id === room.id ? colors.primary : colors.card },
                    ]}
                    onPress={() => setSelectedRoom(room)}
                  >
                    <Text style={{ color: selectedRoom?.id === room.id ? '#FFF' : colors.text }}>
                      {room.name}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={{ padding: 10, color: colors.text }}>Please select a floor first</Text>
              )}
            </ScrollView>

            <Text style={[styles.inputLabel, { color: colors.text }]}>QR Code Value</Text>
            <View style={styles.qrValueContainer}>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.card, color: colors.text }]}
                value={qrValue}
                onChangeText={setQrValue}
                placeholder="Enter QR code value"
                placeholderTextColor={colors.secondary}
              />
              <TouchableOpacity
                style={[styles.generateButton, { backgroundColor: colors.primary }]}
                onPress={handleGenerateQRCode}
              >
                <Text style={styles.generateButtonText}>Generate</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Description (optional)</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.card, color: colors.text }]}
              value={qrDescription}
              onChangeText={setQrDescription}
              placeholder="Enter description"
              placeholderTextColor={colors.secondary}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => {
                  setIsAddModalVisible(false);
                  setSelectedRoom(null);
                  setQrValue('');
                  setQrDescription('');
                  setSearchQuery('');
                }}
              >
                <Text style={{ color: colors.text }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleAddQRCode}
              >
                <Text style={{ color: '#FFF' }}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Generate QR (Preview) Modal — real QR + Save PNG */}
      <Modal
        visible={isGenerateModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setIsGenerateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>QR Code</Text>

            <View style={styles.qrCodeContainer}>
              <QRCode
                value={qrValue || ' '}
                size={200}
                color={colors.text}
                backgroundColor={colors.background}
                getRef={(c) => (qrRef.current = c)}
              />
            </View>

            <Text style={[styles.qrValueText, { color: colors.text }]}>{qrValue}</Text>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <TouchableOpacity
                style={[styles.fullWidthButton, { backgroundColor: colors.primary, flex: 1 }]}
                onPress={handleSavePng}
              >
                <Text style={{ color: '#FFF' }}>Save PNG</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.fullWidthButton, { backgroundColor: colors.border, flex: 1 }]}
                onPress={() => setIsGenerateModalVisible(false)}
              >
                <Text style={{ color: colors.text }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Styles mirror AdminEditFloorplansContent for consistency
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

  errorContainer: {
    padding: 12,
    borderRadius: 8,
    marginVertical: 16,
  },
  errorText: { color: 'white', fontWeight: '500' },

  sectionContainer: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 8,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },

  chipRow: { paddingVertical: 8 },
  chip: {
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
    minWidth: 100,
    alignItems: 'center',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: { color: '#FFF', marginLeft: 4, fontWeight: '500' },

  emptyState: { justifyContent: 'center', alignItems: 'center', padding: 20 },
  emptyText: { fontSize: 16, textAlign: 'center', marginTop: 16 },

  // List item
  qrCodeItem: { flexDirection: 'row', padding: 16, borderRadius: 8, marginBottom: 12 },
  qrCodeDetails: { flex: 1 },
  roomName: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  qrCodeValue: { fontSize: 14, marginBottom: 4 },
  qrCodeDesc: { fontSize: 14, marginBottom: 4 },
  qrCodeFloor: { fontSize: 12 },
  qrCodeActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionButton: {
    width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center',
  },

  // Modals (shared)
  modalOverlay: {
    flex: 1, justifyContent: 'center', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)', padding: 20,
  },
  modalContent: {
    width: '100%', padding: 20, borderRadius: 12, maxHeight: '80%',
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },

  inputLabel: { fontSize: 16, marginBottom: 8 },
  textInput: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 16,
  },
  searchInput: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 8,
  },
  roomList: { maxHeight: 150, marginBottom: 16 },
  roomItem: { padding: 12, marginBottom: 4, borderRadius: 8 },

  qrValueContainer: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  generateButton: { paddingHorizontal: 12, justifyContent: 'center', borderRadius: 8 },
  generateButtonText: { color: '#FFF', fontWeight: '500' },

  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  modalButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },

  // QR
  qrCodeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    padding: 16,
    backgroundColor: '#FFF',
    borderRadius: 8,
  },
  qrValueText: { fontSize: 14, textAlign: 'center', marginBottom: 20 },
  fullWidthButton: { paddingVertical: 12, alignItems: 'center', borderRadius: 8 },

  valueDisplay: { padding: 12, marginBottom: 16, fontSize: 14 },
});
