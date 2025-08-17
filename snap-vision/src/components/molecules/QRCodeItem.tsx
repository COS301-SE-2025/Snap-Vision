import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import { QRCodeMapping } from '../../services/qrService';

interface Room {
  id: string;
  name: string;
  floorId: string;
  buildingId: string;
  buildingName: string;
}

interface QRCodeItemProps {
  item: QRCodeMapping;
  rooms: Room[];
  onViewQR: (item: QRCodeMapping) => void;
  onDelete: (item: QRCodeMapping) => void;
}

const QRCodeItem: React.FC<QRCodeItemProps> = ({ item, rooms, onViewQR, onDelete }) => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  
  const roomObj = rooms.find((r) => r.id === item.roomId);

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={styles.details}>
        <Text style={[styles.roomName, { color: colors.text }]}>
          Room: {roomObj?.name || item.roomName || 'Unknown Room'}
        </Text>
        <Text style={[styles.qrValue, { color: colors.secondary }]}>
          {item.qrValue}
        </Text>
        {!!item.description && (
          <Text style={[styles.qrDesc, { color: colors.text }]}>
            {item.description}
          </Text>
        )}
        <Text style={[styles.qrFloor, { color: colors.secondary }]}>
          Floor: {item.floorId}
        </Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={() => onViewQR(item)}
        >
          <Icon name="qrcode" size={20} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: '#FF3B30' }]}
          onPress={() => onDelete(item)}
        >
          <Icon name="trash-can-outline" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  details: {
    flex: 1,
  },
  roomName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  qrValue: {
    fontSize: 14,
    marginBottom: 4,
  },
  qrDesc: {
    fontSize: 14,
    marginBottom: 4,
  },
  qrFloor: {
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default QRCodeItem;
