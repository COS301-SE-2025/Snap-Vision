import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface NavigationBarProps {
  floors: string[];
  selectedFloorId: string;
  onFloorChange: (floorId: string) => void;
  roomCount: number;
  onShowRoomsList: () => void;
  themeColors: any;
}

const NavigationBar: React.FC<NavigationBarProps> = ({
  floors,
  selectedFloorId,
  onFloorChange,
  roomCount,
  onShowRoomsList,
  themeColors,
}) => {
  return (
    <View style={styles.topBar}>
      <Picker
        selectedValue={selectedFloorId}
        onValueChange={(v) => onFloorChange(String(v))}
        style={{ width: 160, color: themeColors.text }}
        dropdownIconColor={themeColors.text}
        mode="dropdown"
      >
        {floors.map((f) => (
          <Picker.Item key={f} label={`Floor ${f}`} value={f} color={themeColors.text} />
        ))}
      </Picker>

      <TouchableOpacity
        style={[styles.roomsButton, { backgroundColor: themeColors.primary }]}
        onPress={onShowRoomsList}
      >
        <MaterialIcons name="list" size={16} color="white" />
        <Text style={styles.roomsButtonText}>Rooms ({roomCount})</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  roomsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  roomsButtonText: { color: 'white', fontSize: 12, fontWeight: '500', marginLeft: 4 },
});

export default NavigationBar;
