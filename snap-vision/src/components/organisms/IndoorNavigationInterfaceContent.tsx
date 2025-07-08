// src/components/organisms/IndoorNavigationInterfaceContent.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import firestore from '@react-native-firebase/firestore';
import SettingsHeader from '../molecules/SettingsHeader';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

interface Room {
  id: string;
  name: string;
  type: string;
  description: string;
  floorId: string;
  buildingId: string;
}

interface Props {
  buildingId: string;
  buildingName: string;
  onNavigationStart: (startRoomId: string, endRoomId: string, floorId: string) => void;
}

export default function IndoorNavigationInterfaceContent({ 
  buildingId, 
  buildingName, 
  onNavigationStart 
}: Props) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  
  const [rooms, setRooms] = useState<Room[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStartRoom, setSelectedStartRoom] = useState<Room | null>(null);
  const [selectedEndRoom, setSelectedEndRoom] = useState<Room | null>(null);
  const [groupedRooms, setGroupedRooms] = useState<{ [key: string]: Room[] }>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRooms();
  }, [buildingId]);

  const loadRooms = async () => {
    try {
      setIsLoading(true);
      const snapshot = await firestore()
        .collection('RoomPOIs')
        .where('buildingId', '==', buildingId)
        .get();

      const roomsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Room[];

      setRooms(roomsData);
      
      // Group rooms by floor
      const grouped = roomsData.reduce((acc, room) => {
        if (!acc[room.floorId]) {
          acc[room.floorId] = [];
        }
        acc[room.floorId].push(room);
        return acc;
      }, {} as { [key: string]: Room[] });

      setGroupedRooms(grouped);
    } catch (error) {
      console.error('Error loading rooms:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRooms = rooms.filter(room =>
    room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRoomSelect = (room: Room, isStart: boolean) => {
    if (isStart) {
      setSelectedStartRoom(room);
      // Clear end room if it's on a different floor
      if (selectedEndRoom && selectedEndRoom.floorId !== room.floorId) {
        setSelectedEndRoom(null);
      }
    } else {
      // Only allow selection if on same floor as start room
      if (selectedStartRoom && selectedStartRoom.floorId !== room.floorId) {
        return; // Don't allow selection
      }
      setSelectedEndRoom(room);
    }
  };

  const startNavigation = () => {
    if (selectedStartRoom && selectedEndRoom) {
      onNavigationStart(selectedStartRoom.id, selectedEndRoom.id, selectedStartRoom.floorId);
    }
  };

  const renderRoomItem = ({ item, isStart }: { item: Room; isStart: boolean }) => {
    const isSelected = isStart ? 
      selectedStartRoom?.id === item.id : 
      selectedEndRoom?.id === item.id;
    
    // Check if room is selectable (same floor constraint for end room)
    const isSelectable = isStart || !selectedStartRoom || selectedStartRoom.floorId === item.floorId;

    return (
      <TouchableOpacity
        style={[
          styles.roomItem,
          { 
            backgroundColor: isSelected ? colors.primary : colors.card,
            borderColor: colors.border,
            opacity: isSelectable ? 1 : 0.5
          }
        ]}
        onPress={() => isSelectable && handleRoomSelect(item, isStart)}
        disabled={!isSelectable}
      >
        <View style={styles.roomHeader}>
          <Text style={[
            styles.roomName,
            { color: isSelected ? '#FFFFFF' : colors.text }
          ]}>
            {item.name}
          </Text>
          <Text style={[
            styles.roomFloor,
            { color: isSelected ? '#FFFFFF' : colors.secondary }
          ]}>
            {item.floorId}
          </Text>
        </View>
        <Text style={[
          styles.roomType,
          { color: isSelected ? '#FFFFFF' : colors.secondary }
        ]}>
          {item.type}
        </Text>
        {item.description && (
          <Text style={[
            styles.roomDescription,
            { color: isSelected ? '#FFFFFF' : colors.secondary }
          ]}>
            {item.description}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SettingsHeader title={`Indoor Navigation - ${buildingName}`} />
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading rooms...
          </Text>
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

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={[
            styles.searchInput,
            { 
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.text
            }
          ]}
          placeholder="Search rooms..."
          placeholderTextColor={colors.secondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
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

      {/* Room Selection */}
      <View style={styles.selectionContainer}>
        <View style={styles.selectionSection}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            From: {selectedStartRoom?.name || 'Select starting room'}
          </Text>
          <FlatList
            data={filteredRooms}
            renderItem={({ item }) => renderRoomItem({ item, isStart: true })}
            keyExtractor={(item) => `start-${item.id}`}
            style={styles.roomList}
            showsVerticalScrollIndicator={false}
          />
        </View>

        <View style={styles.selectionSection}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            To: {selectedEndRoom?.name || 'Select destination'}
          </Text>
          <FlatList
            data={filteredRooms}
            renderItem={({ item }) => renderRoomItem({ item, isStart: false })}
            keyExtractor={(item) => `end-${item.id}`}
            style={styles.roomList}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </View>

      {/* Navigation Button */}
      <TouchableOpacity
        style={[
          styles.navigationButton,
          { 
            backgroundColor: (selectedStartRoom && selectedEndRoom) ? colors.primary : colors.secondary,
            opacity: (selectedStartRoom && selectedEndRoom) ? 1 : 0.5
          }
        ]}
        onPress={startNavigation}
        disabled={!selectedStartRoom || !selectedEndRoom}
      >
        <Text style={styles.navigationButtonText}>
          Start Indoor Navigation
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchInput: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    fontSize: 16,
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
  noticeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectionContainer: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 16,
  },
  selectionSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  roomList: {
    flex: 1,
  },
  roomItem: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  roomName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  roomFloor: {
    fontSize: 12,
    fontWeight: '500',
  },
  roomType: {
    fontSize: 14,
    marginBottom: 2,
    textTransform: 'capitalize',
  },
  roomDescription: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  navigationButton: {
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  navigationButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
});