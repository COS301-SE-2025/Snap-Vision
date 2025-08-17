import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import QRCodeItem from '../molecules/QRCodeItem';
import { QRCodeMapping } from '../../services/qrService';

interface Room {
  id: string;
  name: string;
  floorId: string;
  buildingId: string;
  buildingName: string;
}

interface Building {
  id: string;
  name: string;
}

interface Floor {
  id: string;
  name: string;
}

interface QRCodeListProps {
  qrCodes: QRCodeMapping[];
  rooms: Room[];
  buildings: Building[];
  floors: Floor[];
  selectedBuildingId: string | null;
  selectedFloorId: string | null;
  onViewQR: (item: QRCodeMapping) => void;
  onDeleteQR: (item: QRCodeMapping) => void;
  onAddQR: () => void;
}

const QRCodeList: React.FC<QRCodeListProps> = ({
  qrCodes,
  rooms,
  buildings,
  floors,
  selectedBuildingId,
  selectedFloorId,
  onViewQR,
  onDeleteQR,
  onAddQR,
}) => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  // Filter QR codes for the selected floor
  const floorQRCodes = qrCodes.filter((c) => String(c.floorId) === String(selectedFloorId ?? ''));

  return (
    <View style={styles.container}>
      <Text style={{ color: colors.text, marginBottom: 12, fontWeight: '500' }}>
        QR Codes for Building{' '}
        {buildings.find((b) => b.id === selectedBuildingId)?.name || selectedBuildingId}, Floor{' '}
        {floors.find((f) => f.id === selectedFloorId)?.name || selectedFloorId}
      </Text>

      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={onAddQR}
        >
          <Icon name="qrcode-plus" size={20} color="#FFF" />
          <Text style={styles.addButtonText}>Add New</Text>
        </TouchableOpacity>
      </View>

      {floorQRCodes.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="qrcode-remove" size={48} color={colors.secondary} />
          <Text style={[styles.emptyText, { color: colors.text }]}>
            No QR codes found for this floor
          </Text>
        </View>
      ) : (
        <FlatList
          data={floorQRCodes}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <QRCodeItem item={item} rooms={rooms} onViewQR={onViewQR} onDelete={onDeleteQR} />
          )}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 12,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFF',
    marginLeft: 4,
    fontWeight: '500',
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
});

export default QRCodeList;
