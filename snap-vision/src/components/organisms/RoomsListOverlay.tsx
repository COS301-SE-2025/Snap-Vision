import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { RoomPOI } from '../../hooks/useRoomManager';

interface RoomsListOverlayProps {
  visible: boolean;
  rooms: RoomPOI[];
  onClose: () => void;
  onSelectRoom: (room: RoomPOI) => void;
  themeColors: any;
}

const RoomsListOverlay: React.FC<RoomsListOverlayProps> = ({
  visible,
  rooms,
  onClose,
  onSelectRoom,
  themeColors,
}) => {
  if (!visible) return null;

  const handleRoomPress = (room: RoomPOI) => {
    onSelectRoom(room);
    onClose();
  };

  return (
    <View style={[styles.roomsListOverlay, { backgroundColor: themeColors.background }]}>
      <View style={[styles.roomsListHeader, { borderBottomColor: themeColors.border }]}>
        <Text style={[styles.roomsListTitle, { color: themeColors.text }]}>Rooms & POIs</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeListButton}>
          <MaterialIcons name="close" size={24} color={themeColors.secondary} />
        </TouchableOpacity>
      </View>
      <FlatList
        data={rooms}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.roomItem,
              { backgroundColor: themeColors.card, borderColor: themeColors.border },
            ]}
            onPress={() => handleRoomPress(item)}
          >
            <View style={styles.roomContent}>
              <MaterialIcons
                name={item.type === 'office' ? 'meeting-room' : 'place'}
                size={20}
                color={themeColors.primary}
              />
              <View style={styles.roomDetails}>
                <Text style={[styles.roomName, { color: themeColors.text }]}>{item.name}</Text>
                <Text style={[styles.roomType, { color: themeColors.secondary }]}>
                  {item.type || 'POI'}
                </Text>
                {item.description && (
                  <Text
                    style={[styles.roomDescription, { color: themeColors.secondary }]}
                    numberOfLines={1}
                  >
                    {item.description}
                  </Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  roomsListOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 },
  roomsListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  roomsListTitle: { fontSize: 18, fontWeight: '600', flex: 1 },
  closeListButton: { padding: 4 },
  roomItem: { borderBottomWidth: 1, paddingHorizontal: 16, paddingVertical: 12 },
  roomContent: { flexDirection: 'row', alignItems: 'center' },
  roomDetails: { marginLeft: 12, flex: 1 },
  roomName: { fontSize: 16, fontWeight: '500', marginBottom: 2 },
  roomType: { fontSize: 14, marginBottom: 2 },
  roomDescription: { fontSize: 12 },
});

export default RoomsListOverlay;