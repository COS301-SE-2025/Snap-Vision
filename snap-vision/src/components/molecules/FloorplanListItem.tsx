import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { getThemeColors } from '../../theme';

interface FloorplanItem {
  id: string;
  buildingName: string;
  floorLabel: string;
  status: 'active' | 'draft';
  uploadDate: string;
  icon: string;
}

interface Props {
  item: FloorplanItem;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  colors: ReturnType<typeof getThemeColors>;
}

export default function FloorplanListItem({ item, onView, onEdit, onDelete, colors }: Props) {
  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      <View style={[styles.iconContainer, { backgroundColor: colors.secondary + '22' }]}>
        <Text style={[styles.icon, { color: colors.primary }]}>{item.icon}</Text>
      </View>
      
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          {item.buildingName} - {item.floorLabel}
        </Text>
        <Text style={[styles.status, { color: item.status === 'active' ? colors.primary : colors.secondary }]}>
          {item.status}
        </Text>
      </View>
      
      <Text style={[styles.date, { color: colors.text }]}>Uploaded on: {item.uploadDate}</Text>
      
      <View style={styles.actionButtons}>
        <TouchableOpacity onPress={onView} style={styles.actionButton}>
          <Icon name="eye-outline" size={16} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onEdit} style={styles.actionButton}>
          <Icon name="create-outline" size={16} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={styles.actionButton}>
          <Icon name="trash-outline" size={16} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    marginBottom: 2,
  },
  status: {
    fontSize: 12,
  },
  date: {
    width: 90,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});