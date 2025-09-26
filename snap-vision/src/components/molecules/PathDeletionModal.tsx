import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export interface PathItem {
  id: string;
  startRoomId: string;
  endRoomId: string;
  startRoomName?: string;
  endRoomName?: string;
  distance?: number;
}

interface PathDeletionModalProps {
  visible: boolean;
  paths: PathItem[];
  onClose: () => void;
  onDeletePath: (pathId: string) => void;
  colors: {
    background: string;
    text: string;
    border: string;
    primary: string;
    card: string;
  };
}

const PathDeletionModal: React.FC<PathDeletionModalProps> = ({
  visible,
  paths,
  onClose,
  onDeletePath,
  colors,
}) => {
  const handleDeletePath = (pathId: string) => {
    onDeletePath(pathId);
    onClose();
  };

  const renderPathItem = ({ item }: { item: PathItem }) => (
    <View style={[styles.pathItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.pathInfo}>
        <Text style={[styles.pathTitle, { color: colors.text }]}>
          {item.startRoomName || item.startRoomId} → {item.endRoomName || item.endRoomId}
        </Text>
        {item.distance && (
          <Text style={[styles.pathDistance, { color: colors.text }]}>
            Distance: {item.distance.toFixed(2)}m
          </Text>
        )}
      </View>
      <TouchableOpacity
        style={[styles.deleteButton, { backgroundColor: colors.primary }]}
        onPress={() => handleDeletePath(item.id)}
      >
        <Icon name="trash-outline" size={20} color="#FFFFFF" />
        <Text style={styles.deleteButtonText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Delete Path</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {paths.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.text }]}>
                No paths available to delete
              </Text>
            </View>
          ) : (
            <>
              <Text style={[styles.modalSubtitle, { color: colors.text }]}>
                Select a path to delete:
              </Text>
              <FlatList
                data={paths}
                renderItem={renderPathItem}
                keyExtractor={(item) => item.id}
                style={styles.pathList}
                showsVerticalScrollIndicator={false}
              />
            </>
          )}

          <TouchableOpacity
            style={[
              styles.cancelButton,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={onClose}
          >
            <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 12,
    padding: 0,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  modalSubtitle: {
    fontSize: 16,
    padding: 20,
    paddingBottom: 10,
  },
  pathList: {
    maxHeight: 300,
    paddingHorizontal: 20,
  },
  pathItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  pathInfo: {
    flex: 1,
    marginRight: 16,
  },
  pathTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  pathDistance: {
    fontSize: 14,
    marginBottom: 2,
  },
  pathId: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  cancelButton: {
    margin: 20,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PathDeletionModal;
