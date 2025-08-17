import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
} from 'react-native';
import { AdminPOI } from '../../hooks/useMapAdmin';

interface AdminActionsModalProps {
  visible: boolean;
  adminActionPOI: AdminPOI | null;
  onEdit: (poi: AdminPOI) => void;
  onDelete: (poi: AdminPOI) => void;
  onClose: () => void;
}

export const AdminActionsModal: React.FC<AdminActionsModalProps> = ({
  visible,
  adminActionPOI,
  onEdit,
  onDelete,
  onClose,
}) => {
  if (!visible || !adminActionPOI) return null;

  return (
    <Modal
      transparent
      visible={true}
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 24,
          zIndex: 9999,
        }}
      >
        <View
          style={{
            backgroundColor: '#fff',
            borderRadius: 12,
            padding: 24,
            alignItems: 'center',
            minWidth: 250,
          }}
        >
          <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 16 }}>
            Building: {adminActionPOI.name}
          </Text>

          {/* Edit Building Button */}
          <TouchableOpacity
            style={{
              backgroundColor: '#FF9800',
              paddingVertical: 10,
              paddingHorizontal: 20,
              borderRadius: 8,
              marginBottom: 12,
              width: 200,
              alignItems: 'center',
            }}
            onPress={() => {
              onEdit(adminActionPOI);
              onClose();
            }}
          >
            <Text style={{ color: 'white', fontWeight: 'bold' }}>Edit</Text>
          </TouchableOpacity>

          {/* Delete Building Button */}
          <TouchableOpacity
            style={{
              backgroundColor: '#D32F2F',
              paddingVertical: 10,
              paddingHorizontal: 20,
              borderRadius: 8,
              marginBottom: 12,
              width: 200,
              alignItems: 'center',
            }}
            onPress={() => {
              onDelete(adminActionPOI);
            }}
          >
            <Text style={{ color: 'white', fontWeight: 'bold' }}>Delete</Text>
          </TouchableOpacity>

          {/* Cancel Button */}
          <TouchableOpacity
            style={{
              backgroundColor: '#B0B0B0',
              paddingVertical: 10,
              paddingHorizontal: 20,
              borderRadius: 8,
              width: 200,
              alignItems: 'center',
            }}
            onPress={onClose}
          >
            <Text style={{ color: 'white', fontWeight: 'bold' }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export default AdminActionsModal;
