import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, Pressable } from 'react-native';
import { Room } from '../../hooks/useMapIndoor';

interface IndoorPickerModalProps {
  visible: boolean;
  indoorRooms: Room[];
  selectedStartRoom: Room | null;
  selectedIndoorRoom: Room | null;
  colors: any;
  onSelectStartRoom: (room: Room) => void;
  onSelectIndoorRoom: (room: Room) => void;
  onCancel: () => void;
  onStart: () => void;
}

const IndoorPickerModal: React.FC<IndoorPickerModalProps> = ({
  visible,
  indoorRooms,
  selectedStartRoom,
  selectedIndoorRoom,
  colors,
  onSelectStartRoom,
  onSelectIndoorRoom,
  onCancel,
  onStart,
}) => {
  if (!visible) return null;

  return (
    <Modal transparent visible animationType="slide">
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)',
          padding: 20,
        }}
      >
        <View style={{ backgroundColor: colors.card, borderRadius: 10, padding: 16 }}>
          <Text style={{ fontWeight: 'bold', color: colors.text, marginBottom: 8 }}>Start</Text>
          <View style={{ maxHeight: 140 }}>
            <ScrollView>
              {indoorRooms.map((r) => (
                <TouchableOpacity
                  key={`start-${r.id}`}
                  onPress={() => onSelectStartRoom(r)}
                  style={{
                    padding: 10,
                    borderRadius: 6,
                    backgroundColor:
                      selectedStartRoom?.id === r.id ? colors.primary : 'transparent',
                    marginBottom: 6,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text
                    style={{ color: selectedStartRoom?.id === r.id ? '#fff' : colors.text }}
                  >
                    {r.name}
                    {r.isEntrance ? ' · Entrance' : ''}
                    {r.type ? ` · ${r.type}` : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <Text style={{ fontWeight: 'bold', color: colors.text, marginVertical: 8 }}>
            Destination
          </Text>
          <View style={{ maxHeight: 180 }}>
            <ScrollView>
              {indoorRooms.map((r) => (
                <TouchableOpacity
                  key={`dest-${r.id}`}
                  onPress={() => onSelectIndoorRoom(r)}
                  style={{
                    padding: 10,
                    borderRadius: 6,
                    backgroundColor:
                      selectedIndoorRoom?.id === r.id ? colors.primary : 'transparent',
                    marginBottom: 6,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text
                    style={{ color: selectedIndoorRoom?.id === r.id ? '#fff' : colors.text }}
                  >
                    {r.name}
                    {r.type ? ` · ${r.type}` : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}
          >
            <Pressable onPress={onCancel}>
              <Text style={{ color: colors.text }}>Cancel</Text>
            </Pressable>
            <Pressable onPress={onStart}>
              <Text style={{ fontWeight: 'bold', color: colors.primary }}>Start</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default IndoorPickerModal;
