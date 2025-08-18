import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import RoomSelector from '../molecules/RoomSelector';
import QRCodeGenerator from '../molecules/QRCodeGenerator';
import StyledTextInput from '../atoms/StyledTextInput';

interface Room {
  id: string;
  name: string;
  floorId: string;
  buildingId: string;
  buildingName: string;
}

interface QRCodeAddModalProps {
  visible: boolean;
  rooms: Room[];
  selectedRoom: Room | null;
  onRoomSelect: (room: Room) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  qrValue: string;
  onQrValueChange: (value: string) => void;
  qrDescription: string;
  onQrDescriptionChange: (description: string) => void;
  onGenerateQR: () => void;
  onAdd: () => void;
  onClose: () => void;
}

const QRCodeAddModal: React.FC<QRCodeAddModalProps> = ({
  visible,
  rooms,
  selectedRoom,
  onRoomSelect,
  searchQuery,
  onSearchQueryChange,
  qrValue,
  onQrValueChange,
  qrDescription,
  onQrDescriptionChange,
  onGenerateQR,
  onAdd,
  onClose,
}) => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Add New QR Code</Text>

          <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
            <RoomSelector
              rooms={rooms}
              selectedRoom={selectedRoom}
              searchQuery={searchQuery}
              onSearchQueryChange={onSearchQueryChange}
              onRoomSelect={onRoomSelect}
            />

            <QRCodeGenerator
              qrValue={qrValue}
              setQrValue={onQrValueChange}
              onGenerate={onGenerateQR}
            />

            <StyledTextInput
              label="Description (optional)"
              value={qrDescription}
              onChangeText={onQrDescriptionChange}
              placeholder="Enter description"
            />
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.border }]}
              onPress={onClose}
            >
              <Text style={{ color: colors.text }}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: colors.primary }]}
              onPress={onAdd}
            >
              <Text style={{ color: '#FFF' }}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    padding: 20,
    borderRadius: 12,
    maxHeight: '80%',
  },
  scrollContainer: {
    flexGrow: 0,
    width: '100%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
});

export default QRCodeAddModal;
