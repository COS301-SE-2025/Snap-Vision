import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

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
}

export default function FloorplanListItem({ item, onView, onEdit, onDelete }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{item.icon}</Text>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.title}>
          {item.buildingName} - {item.floorLabel}
        </Text>
        <Text style={styles.status}>{item.status}</Text>
      </View>
      
      <Text style={styles.date}>Uploaded on: {item.uploadDate}</Text>
      
      <View style={styles.actionButtons}>
        <TouchableOpacity onPress={onView} style={styles.actionButton}>
          <Icon name="eye-outline" size={16} color="black" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onEdit} style={styles.actionButton}>
          <Icon name="create-outline" size={16} color="black" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onDelete} style={styles.actionButton}>
          <Icon name="trash-outline" size={16} color="black" />
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
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
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
    color: 'black',
    marginBottom: 2,
  },
  status: {
    fontSize: 12,
    color: 'rgba(0, 0, 0, 0.50)',
  },
  date: {
    width: 90,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '500',
    color: 'black',
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