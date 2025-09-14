import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import Modal from 'react-native-modal';

interface RoomData {
  name: string;
  type: string;
  description: string;
  isEntrance: boolean;
  connectorGroupId: string;
}

interface RoomDetailsModalProps {
  isVisible: boolean;
  isEditing: boolean;
  roomData: RoomData;
  onRoomDataChange: (data: RoomData) => void;
  onCancel: () => void;
  onSave: () => void;
  onDelete: () => void;
  colors: {
    card: string;
    text: string;
    border: string;
    background: string;
    secondary: string;
    primary: string;
  };
}

const RoomDetailsModal: React.FC<RoomDetailsModalProps> = ({
  isVisible,
  isEditing,
  roomData,
  onRoomDataChange,
  onCancel,
  onSave,
  onDelete,
  colors,
}) => {
  const roomTypes = ['classroom', 'office', 'lab', 'restroom', 'stairs', 'elevator', 'entrance'];

  return (
    <Modal isVisible={isVisible} onBackdropPress={onCancel} avoidKeyboard>
      <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
        <Text style={[styles.modalTitle, { color: colors.text }]}>
          {isEditing ? 'Edit Room Details' : 'Add Room Details'}
        </Text>

        <TextInput
          placeholder="Room Name/Number"
          value={roomData.name}
          onChangeText={(text) => onRoomDataChange({ ...roomData, name: text })}
          style={[
            styles.input,
            {
              borderColor: colors.border,
              color: colors.text,
              backgroundColor: colors.background,
            },
          ]}
          placeholderTextColor={colors.secondary}
        />

        <View style={styles.typeSelector}>
          <Text style={{ color: colors.text, marginBottom: 8 }}>Room Type:</Text>
          <View style={styles.typeOptions}>
            {roomTypes.map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => onRoomDataChange({ ...roomData, type })}
                style={[
                  styles.typeOption,
                  {
                    backgroundColor: roomData.type === type ? colors.primary : colors.card,
                    borderColor: colors.border,
                    borderWidth: 1,
                  },
                ]}
              >
                <Text
                  style={{
                    color: roomData.type === type ? '#FFFFFF' : colors.text,
                    fontSize: 14,
                  }}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Entrance toggle (independent of type) */}
        <View style={styles.entranceToggle}>
          <Text style={{ color: colors.text, marginRight: 8 }}>Mark as entrance</Text>
          <TouchableOpacity
            onPress={() => onRoomDataChange({ ...roomData, isEntrance: !roomData.isEntrance })}
            style={[
              styles.toggleButton,
              {
                backgroundColor: roomData.isEntrance ? colors.primary : colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={{ color: roomData.isEntrance ? '#fff' : colors.text }}>
              {roomData.isEntrance ? 'Yes' : 'No'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Connector ID for stairs/elevator */}
        {(roomData.type === 'stairs' || roomData.type === 'elevator') && (
          <>
            <Text style={[styles.connectorLabel, { color: colors.text }]}>
              Connector Group ID (link stairs/elevators across floors)
            </Text>
            <TextInput
              placeholder="e.g., stairs-A"
              value={roomData.connectorGroupId}
              onChangeText={(text) => onRoomDataChange({ ...roomData, connectorGroupId: text })}
              style={[
                styles.input,
                {
                  borderColor: colors.border,
                  color: colors.text,
                  backgroundColor: colors.background,
                },
              ]}
              placeholderTextColor={colors.secondary}
            />
          </>
        )}

        <TextInput
          placeholder="Description (optional)"
          value={roomData.description}
          onChangeText={(text) => onRoomDataChange({ ...roomData, description: text })}
          style={[
            styles.input,
            styles.descriptionInput,
            {
              borderColor: colors.border,
              color: colors.text,
              backgroundColor: colors.background,
            },
          ]}
          placeholderTextColor={colors.secondary}
          multiline
        />

        <View style={styles.modalButtons}>
          {/* Show delete button when editing */}
          {isEditing && (
            <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
              <Text style={{ color: '#FFFFFF' }}>Delete</Text>
            </TouchableOpacity>
          )}

          {/* Cancel button */}
          <TouchableOpacity
            onPress={onCancel}
            style={[
              styles.cancelButton,
              {
                borderColor: colors.border,
                flex: isEditing ? 0.4 : 1,
              },
            ]}
          >
            <Text style={{ color: colors.text }}>Cancel</Text>
          </TouchableOpacity>

          {/* Save button */}
          <TouchableOpacity
            onPress={onSave}
            style={[
              styles.saveButton,
              {
                backgroundColor: colors.primary,
                flex: isEditing ? 0.4 : 1,
              },
            ]}
          >
            <Text style={{ color: '#FFFFFF' }}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContent: {
    padding: 20,
    borderRadius: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    padding: 10,
    borderWidth: 1,
    borderRadius: 4,
    marginBottom: 12,
  },
  typeSelector: {
    marginBottom: 12,
  },
  typeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  typeOption: {
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entranceToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  connectorLabel: {
    marginBottom: 6,
  },
  descriptionInput: {
    minHeight: 80,
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 16,
    justifyContent: 'space-between',
  },
  cancelButton: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderRadius: 4,
  },
  saveButton: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  deleteButton: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    backgroundColor: '#D32F2F',
    marginRight: 8,
    flex: 0.4,
  },
});

export default RoomDetailsModal;
