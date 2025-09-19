import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import TimetableEntryForm from '../molecules/TimetableEntryForm';
import TimetableGrid from '../molecules/TimetableGrid';
import StandardPopup from '../atoms/StandardPopup';
import { useTimetable } from '../../hooks/useTimetable';
import { TimetableEntry } from '../../types/timetable.types';

interface TimetableSectionProps {
  colors: any;
}

export default function TimetableSection({ colors }: TimetableSectionProps) {
  const { entries, isLoading, addEntry, updateEntry, deleteEntry } = useTimetable();
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<TimetableEntry | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleAddEntry = async (entryData: Omit<TimetableEntry, 'id' | 'userId' | 'createdAt'>) => {
    if (editingEntry) {
      await updateEntry(editingEntry.id, entryData);
      setEditingEntry(null);
    } else {
      await addEntry(entryData);
    }
    setShowForm(false);
  };

  const handleEditEntry = (entry: TimetableEntry) => {
    setEditingEntry(entry);
    setShowForm(true);
  };

  const handleDeleteEntry = (entry: TimetableEntry) => {
    setEntryToDelete(entry);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (entryToDelete) {
      await deleteEntry(entryToDelete.id);
      setEntryToDelete(null);
    }
    setShowDeleteConfirm(false);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingEntry(null);
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={[styles.loadingText, { color: colors.secondary }]}>Loading timetable...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.headerLeft}
          onPress={() => setIsExpanded(!isExpanded)}
        >
          <Icon name="calendar-clock" size={24} color={colors.primary} />
          <Text style={[styles.title, { color: colors.text }]}>My Timetable</Text>
          <Icon 
            name={isExpanded ? "chevron-up" : "chevron-down"} 
            size={20} 
            color={colors.secondary} 
          />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          onPress={() => setShowForm(true)}
        >
          <Icon name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {isExpanded && (
        <View style={styles.content}>
          {entries.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="calendar-blank" size={48} color={colors.secondary} />
              <Text style={[styles.emptyText, { color: colors.secondary }]}>
                No classes added yet
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.secondary }]}>
                Tap the + button to add your first class
              </Text>
            </View>
          ) : (
            <View style={[styles.timetableContainer, { backgroundColor: colors.card }]}>
              <TimetableGrid
                entries={entries}
                colors={colors}
                onEditEntry={handleEditEntry}
                onDeleteEntry={handleDeleteEntry}
              />
            </View>
          )}
        </View>
      )}

      {/* Summary when collapsed */}
      {!isExpanded && entries.length > 0 && (
        <View style={styles.summary}>
          <Text style={[styles.summaryText, { color: colors.secondary }]}>
            {entries.length} class{entries.length !== 1 ? 'es' : ''} scheduled
          </Text>
        </View>
      )}

      {/* Add/Edit Form Modal */}
      <TimetableEntryForm
        visible={showForm}
        onClose={handleFormClose}
        onSubmit={handleAddEntry}
        colors={colors}
        editingEntry={editingEntry}
      />

      {/* Delete Confirmation */}
      <StandardPopup
        visible={showDeleteConfirm}
        title="Delete Class"
        message={`Are you sure you want to delete "${entryToDelete?.course}"?`}
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        confirmText="Delete"
        cancelText="Cancel"
        showCancel
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 12,
    flex: 1,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  timetableContainer: {
    borderRadius: 12,
    padding: 16,
    maxHeight: 400,
  },
  summary: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  loadingText: {
    textAlign: 'center',
    padding: 20,
    fontSize: 16,
  },
});