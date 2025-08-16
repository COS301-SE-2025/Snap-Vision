import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import firestore from '@react-native-firebase/firestore';
import SettingsHeader from '../molecules/SettingsHeader';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import QRScanner from '../molecules/QRScanner';
import { getQRCodeMappingByValue } from '../../services/qrService';

interface Room {
  id: string;
  name: string;
  type: string;
  description?: string;
  floorId: string;
  buildingId: string;
  coordinates?: { x: number; y: number };
}

interface Props {
  buildingId: string;
  buildingName: string;
  locationId: string;
  onNavigationStart: (startRoomId: string, endRoomId: string, floorId: string) => void;
}

export default function IndoorNavigationInterfaceContent({
  buildingId,
  buildingName,
  locationId,
  onNavigationStart,
}: Props) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStartRoom, setSelectedStartRoom] = useState<Room | null>(null);
  const [selectedEndRoom, setSelectedEndRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [qrScannerVisible, setQRScannerVisible] = useState(false);
  const [qrScanLoading, setQRScanLoading] = useState(false);

  useEffect(() => {
    loadRooms();
  }, [buildingId, buildingName, locationId]);

  const loadRooms = async () => {
    try {
      setIsLoading(true);
      console.log('[IndoorNav] loadRooms()', { locationId, buildingId, buildingName });

      const base = firestore().collection('locations').doc(locationId).collection('roomPOIs');

      let snap = await base.where('buildingId', '==', buildingId).get();
      let roomsData = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Room[];

      if (roomsData.length === 0) {
        console.log('[IndoorNav] No rooms by buildingId; trying buildingName ==', buildingName);
        try {
          const snapByName = await base.where('buildingName', '==', buildingName).get();
          roomsData = snapByName.docs.map((d) => ({ id: d.id, ...d.data() })) as Room[];
        } catch (e) {
          console.log(
            '[IndoorNav] buildingName query failed or no index, will fallback to client filter',
          );
        }
      }

      if (roomsData.length === 0) {
        console.log('[IndoorNav] Fallback: fetching all rooms and filtering locally');
        const allSnap = await base.get();
        const allRooms = allSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Room[];
        roomsData = allRooms.filter(
          (r: any) => r.buildingId === buildingId || r.buildingName === buildingName,
        );
      }

      console.log(`[IndoorNav] Rooms found: ${roomsData.length}`);
      setRooms(roomsData);
    } catch (e) {
      console.error('Error loading rooms:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRooms = rooms.filter(
    (room) =>
      (room.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (room.type || '').toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleRoomSelect = (room: Room, isStart: boolean) => {
    if (isStart) {
      setSelectedStartRoom(room);
      if (selectedEndRoom && selectedEndRoom.floorId !== room.floorId) {
        setSelectedEndRoom(null);
      }
    } else {
      if (selectedStartRoom && selectedStartRoom.floorId !== room.floorId) return;
      setSelectedEndRoom(room);
    }
  };

  const handleQRScan = async (qrValue: string) => {
    try {
      setQRScanLoading(true);
      const mapping = await getQRCodeMappingByValue(qrValue);

      if (mapping && mapping.roomId) {
        // Find the room that corresponds to the QR code
        const room = rooms.find((r) => r.id === mapping.roomId);
        if (room) {
          handleRoomSelect(room, true); // Set as starting room
        } else {
          console.error('Room not found for QR code mapping:', mapping.roomId);
        }
      } else {
        console.error('Invalid QR code or no mapping found');
      }
    } catch (error) {
      console.error('Error processing QR code:', error);
    } finally {
      setQRScanLoading(false);
      setQRScannerVisible(false);
    }
  };

  const startNavigation = () => {
    if (selectedStartRoom && selectedEndRoom) {
      onNavigationStart(selectedStartRoom.id, selectedEndRoom.id, selectedStartRoom.floorId);
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SettingsHeader title={`Indoor Navigation - ${buildingName}`} />
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading rooms...</Text>
        </View>
      </View>
    );
  }

  if (rooms.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SettingsHeader title={`Indoor Navigation - ${buildingName}`} />
        <View style={styles.emptyContainer}>
          <Icon name="map-marker-off" size={64} color={colors.secondary} />
          <Text style={[styles.emptyText, { color: colors.text }]}>
            No rooms available for indoor navigation in this building.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title={`Indoor Navigation - ${buildingName}`} />

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <TextInput
            style={[
              styles.searchInput,
              { backgroundColor: colors.card, borderColor: colors.border, color: colors.text },
            ]}
            placeholder="Search rooms..."
            placeholderTextColor={colors.secondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity
            style={[styles.qrButton, { backgroundColor: colors.primary }]}
            onPress={() => setQRScannerVisible(true)}
            disabled={qrScanLoading}
          >
            <Icon name="qrcode-scan" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Floor constraint notice */}
      {selectedStartRoom && (
        <View style={[styles.noticeContainer, { backgroundColor: colors.primary + '20' }]}>
          <Icon name="information" size={16} color={colors.primary} />
          <Text style={[styles.noticeText, { color: colors.primary }]}>
            Navigation is available within {selectedStartRoom.floorId} only
          </Text>
        </View>
      )}

      {/* Lists */}
      <View style={styles.selectionContainer}>
        <View style={styles.selectionSection}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            From: {selectedStartRoom?.name || 'Select starting room'}
          </Text>
          <FlatList
            data={filteredRooms}
            keyExtractor={(item) => `start-${item.id}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.roomItem,
                  {
                    backgroundColor:
                      selectedStartRoom?.id === item.id ? colors.primary : colors.card,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => handleRoomSelect(item, true)}
              >
                <View style={styles.roomHeader}>
                  <Text
                    style={[
                      styles.roomName,
                      { color: selectedStartRoom?.id === item.id ? '#FFF' : colors.text },
                    ]}
                  >
                    {item.name}
                  </Text>
                  <Text
                    style={[
                      styles.roomFloor,
                      { color: selectedStartRoom?.id === item.id ? '#FFF' : colors.secondary },
                    ]}
                  >
                    {item.floorId}
                  </Text>
                </View>
                {!!item.type && (
                  <Text
                    style={[
                      styles.roomType,
                      { color: selectedStartRoom?.id === item.id ? '#FFF' : colors.secondary },
                    ]}
                  >
                    {item.type}
                  </Text>
                )}
                {!!item.description && (
                  <Text
                    style={[
                      styles.roomDescription,
                      { color: selectedStartRoom?.id === item.id ? '#FFF' : colors.secondary },
                    ]}
                  >
                    {item.description}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          />
        </View>

        <View style={styles.selectionSection}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            To: {selectedEndRoom?.name || 'Select destination'}
          </Text>
          <FlatList
            data={filteredRooms}
            keyExtractor={(item) => `end-${item.id}`}
            renderItem={({ item }) => {
              const selectable = !selectedStartRoom || selectedStartRoom.floorId === item.floorId;
              const selected = selectedEndRoom?.id === item.id;
              return (
                <TouchableOpacity
                  disabled={!selectable}
                  style={[
                    styles.roomItem,
                    {
                      backgroundColor: selected ? colors.primary : colors.card,
                      borderColor: colors.border,
                      opacity: selectable ? 1 : 0.5,
                    },
                  ]}
                  onPress={() => selectable && handleRoomSelect(item, false)}
                >
                  <View style={styles.roomHeader}>
                    <Text style={[styles.roomName, { color: selected ? '#FFF' : colors.text }]}>
                      {item.name}
                    </Text>
                    <Text
                      style={[styles.roomFloor, { color: selected ? '#FFF' : colors.secondary }]}
                    >
                      {item.floorId}
                    </Text>
                  </View>
                  {!!item.type && (
                    <Text
                      style={[styles.roomType, { color: selected ? '#FFF' : colors.secondary }]}
                    >
                      {item.type}
                    </Text>
                  )}
                  {!!item.description && (
                    <Text
                      style={[
                        styles.roomDescription,
                        { color: selected ? '#FFF' : colors.secondary },
                      ]}
                    >
                      {item.description}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        </View>
      </View>

      {/* Start */}
      <TouchableOpacity
        style={[
          styles.navigationButton,
          {
            backgroundColor:
              selectedStartRoom && selectedEndRoom ? colors.primary : colors.secondary,
            opacity: selectedStartRoom && selectedEndRoom ? 1 : 0.5,
          },
        ]}
        disabled={!selectedStartRoom || !selectedEndRoom}
        onPress={startNavigation}
      >
        <Text style={styles.navigationButtonText}>Start Indoor Navigation</Text>
      </TouchableOpacity>

      {/* QR Scanner Modal */}
      <Modal
        visible={qrScannerVisible}
        onRequestClose={() => setQRScannerVisible(false)}
        animationType="slide"
        transparent={false}
      >
        <QRScanner onScan={handleQRScan} onClose={() => setQRScannerVisible(false)} />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchContainer: { paddingHorizontal: 16, paddingVertical: 8 },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: { padding: 12, borderWidth: 1, borderRadius: 8, fontSize: 16, flex: 1 },
  qrButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noticeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  noticeText: { fontSize: 14, fontWeight: '500' },
  selectionContainer: { flex: 1, flexDirection: 'row', paddingHorizontal: 16, gap: 16 },
  selectionSection: { flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  roomItem: { padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1 },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  roomName: { fontSize: 16, fontWeight: 'bold', flex: 1 },
  roomFloor: { fontSize: 12, fontWeight: '500' },
  roomType: { fontSize: 14, marginBottom: 2, textTransform: 'capitalize' },
  roomDescription: { fontSize: 12, fontStyle: 'italic' },
  navigationButton: { margin: 16, padding: 16, borderRadius: 8, alignItems: 'center' },
  navigationButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: { fontSize: 16, textAlign: 'center', marginTop: 16 },
});
