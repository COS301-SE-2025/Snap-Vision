import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { RoomPOI } from '../../hooks/useRoomManager';

interface POIInfoModalProps {
  visible: boolean;
  poi: RoomPOI | null;
  onClose: () => void;
  themeColors: any;
}

const POIInfoModal: React.FC<POIInfoModalProps> = ({ visible, poi, onClose, themeColors }) => {
  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.modal,
            { backgroundColor: themeColors.card, borderColor: themeColors.border },
          ]}
        >
          <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
            <Text style={[styles.title, { color: themeColors.text }]}>
              {poi?.name || 'POI Information'}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialIcons name="close" size={24} color={themeColors.secondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.content}>
            <Text style={[styles.description, { color: themeColors.text }]}>
              {poi?.description || 'No description available'}
            </Text>
            {poi?.type && (
              <View style={styles.metaInfo}>
                <Text style={[styles.metaLabel, { color: themeColors.secondary }]}>Type:</Text>
                <Text style={[styles.metaValue, { color: themeColors.text }]}>{poi.type}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '85%',
    maxWidth: 400,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  metaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 8,
  },
  metaValue: {
    fontSize: 14,
  },
});

export default POIInfoModal;
