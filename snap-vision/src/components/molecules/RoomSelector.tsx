import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

interface Room {
  id: string;
  name: string;
  floorId: string;
  buildingId: string;
  buildingName: string;
}

interface RoomSelectorProps {
  rooms: Room[];
  selectedRoom: Room | null;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  onRoomSelect: (room: Room) => void;
  title?: string;
}

const RoomSelector: React.FC<RoomSelectorProps> = ({
  rooms,
  selectedRoom,
  searchQuery,
  onSearchQueryChange,
  onRoomSelect,
  title = "Select Room",
}) => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  const filteredRooms = rooms.filter(
    (r) => r.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      
      <TextInput
        style={[styles.searchInput, { backgroundColor: colors.card, color: colors.text }]}
        placeholder="Search rooms..."
        placeholderTextColor={colors.secondary}
        value={searchQuery}
        onChangeText={onSearchQueryChange}
      />

      <ScrollView style={styles.roomList} nestedScrollEnabled>
        {filteredRooms.length > 0 ? (
          filteredRooms.map((room) => (
            <TouchableOpacity
              key={room.id}
              style={[
                styles.roomItem,
                {
                  backgroundColor: selectedRoom?.id === room.id ? colors.primary : colors.card,
                },
              ]}
              onPress={() => onRoomSelect(room)}
            >
              <Text style={{ color: selectedRoom?.id === room.id ? '#FFF' : colors.text }}>
                {room.name}
              </Text>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={{ padding: 10, color: colors.text }}>
            {rooms.length === 0 ? "Please select a floor first" : "No rooms match your search"}
          </Text>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    marginBottom: 8,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  roomList: {
    maxHeight: 150,
    marginBottom: 16,
  },
  roomItem: {
    padding: 12,
    marginBottom: 4,
    borderRadius: 8,
  },
});

export default RoomSelector;
