import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ToastAndroid, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import { useTimetable } from '../../hooks/useTimetable';
import TimetableEntryForm from '../molecules/TimetableEntryForm';
import AppButton from '../atoms/AppButton';
import SettingsHeader from '../molecules/SettingsHeader';
import StandardPopup from '../atoms/StandardPopup';
import { TimetableEntry, DAYS_OF_WEEK } from '../../types/timetable.types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TimetableBackgroundService from '../../services/TimetableBackgroundService';

export default function TimetableContent() {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  
  const {
    entries,
    isLoading,
    error,
    addEntry,
    updateEntry,
    deleteEntry,
  } = useTimetable();

  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<TimetableEntry | null>(null);

  const [autoNavigationEnabled, setAutoNavigationEnabled] = useState(true);

  // Load auto navigation preference
  useEffect(() => {
    const loadAutoNavigationPreference = async () => {
      try {
        const stored = await AsyncStorage.getItem('autoNavigationEnabled');
        if (stored !== null) {
          setAutoNavigationEnabled(JSON.parse(stored));
        }
      } catch (error) {
        console.error('Error loading auto navigation preference:', error);
      }
    };

    loadAutoNavigationPreference();
  }, []);

  const toggleAutoNavigation = async (enabled: boolean) => {
    try {
      setAutoNavigationEnabled(enabled);
      await AsyncStorage.setItem('autoNavigationEnabled', JSON.stringify(enabled));
      
      // Refresh notifications when auto-navigation setting changes
      try {
        await TimetableBackgroundService.getInstance().refreshNotifications();
        console.log('[TimetableContent] Refreshed notifications after toggling auto-navigation');
        
        if (Platform.OS === 'android') {
          ToastAndroid.show(
            enabled ? 'Auto-navigation enabled' : 'Auto-navigation disabled', 
            ToastAndroid.SHORT
          );
        }
      } catch (refreshError) {
        console.error('[TimetableContent] Failed to refresh notifications:', refreshError);
      }
    } catch (error) {
      console.error('Error saving auto navigation preference:', error);
    }
  };

  // Group entries by day
  const entriesByDay = DAYS_OF_WEEK.reduce((acc, day) => {
    acc[day] = entries
      .filter(entry => entry.day === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    return acc;
  }, {} as Record<string, TimetableEntry[]>);

  const handleAddEntry = () => {
    console.log('Add entry button pressed'); // Debug log
    setEditingEntry(null);
    setShowForm(true);
  };

  const handleEditEntry = (entry: TimetableEntry) => {
    console.log('Edit entry:', entry); // Debug log
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

      // Refresh notifications after deleting an entry
      try {
        await TimetableBackgroundService.getInstance().refreshNotifications();
        console.log('[TimetableContent] Refreshed notifications after entry deletion');
        
        // Show a toast notification
        if (Platform.OS === 'android') {
          ToastAndroid.show('Entry deleted and notifications refreshed', ToastAndroid.SHORT);
        }
      } catch (refreshError) {
        console.error('[TimetableContent] Failed to refresh notifications:', refreshError);
      }
    }
    setShowDeleteConfirm(false);
  };

  const handleSubmitEntry = async (entryData: Omit<TimetableEntry, 'id' | 'userId' | 'createdAt'>) => {
    try {
      if (editingEntry) {
        await updateEntry(editingEntry.id, entryData);
      } else {
        await addEntry(entryData);
      }

      // Refresh notifications after adding/editing an entry
      try {
        await TimetableBackgroundService.getInstance().refreshNotifications();
        console.log('[TimetableContent] Refreshed notifications after timetable update');
        
        // Show a toast notification
        if (Platform.OS === 'android') {
          ToastAndroid.show('Timetable updated and notifications refreshed', ToastAndroid.SHORT);
        }
      } catch (refreshError) {
        console.error('[TimetableContent] Failed to refresh notifications:', refreshError);
      }
      
      setShowForm(false);
      setEditingEntry(null);
    } catch (error) {
      console.error('Error submitting entry:', error);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingEntry(null);
  };

  const getSubjectColor = (course: string) => {
    const colorOptions = [
      '#E3F2FD', // Light Blue
      '#E8F5E8', // Light Green  
      '#FFF3E0', // Light Orange
      '#F3E5F5', // Light Purple
      '#FFEBEE', // Light Pink
      '#E0F2F1', // Light Teal
    ];
    
    let hash = 0;
    for (let i = 0; i < course.length; i++) {
      hash = course.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colorOptions[Math.abs(hash) % colorOptions.length];
  };

  const formatTime = (time: string) => {
    // Convert 24-hour format to 12-hour format
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SettingsHeader title="My Timetable" />
        <View style={styles.centerContent}>
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading timetable...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SettingsHeader title="My Timetable" />
        <View style={styles.centerContent}>
          <Text style={[styles.errorText, { color: colors.text }]}>Error: {error}</Text>
          <AppButton title="Retry" onPress={() => window.location.reload()} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title="My Timetable" />

      {/* Settings Section */}
      <View style={styles.settingsSection}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingTitle, { color: colors.text }]}>
              Auto Navigation
            </Text>
            <Text style={[styles.settingSubtitle, { color: colors.secondary }]}>
              Automatically generate routes 10 minutes before class
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.toggle,
              {
                backgroundColor: autoNavigationEnabled ? colors.primary : colors.border,
              }
            ]}
            onPress={() => toggleAutoNavigation(!autoNavigationEnabled)}
          >
            <View
              style={[
                styles.toggleCircle,
                {
                  backgroundColor: colors.background,
                  transform: [{ translateX: autoNavigationEnabled ? 20 : 2 }],
                }
              ]}
            />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Add Class Button - Fixed styling to match other buttons */}
      <View style={styles.headerActions}>
        <AppButton
          title="Add Class"
          onPress={handleAddEntry}
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          testID="add-class-button"
        />
      </View>

      {/* Timetable Content */}
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="calendar-blank" size={64} color={colors.secondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Classes Yet</Text>
            <Text style={[styles.emptySubtitle, { color: colors.secondary }]}>
              Add your first class to get started
            </Text>
          </View>
        ) : (
          <View style={styles.timetableGrid}>
            {DAYS_OF_WEEK.map(day => (
              <View key={day} style={styles.daySection}>
                <Text style={[styles.dayHeader, { color: colors.primary }]}>
                  {day.toUpperCase()}
                </Text>
                
                {entriesByDay[day].length === 0 ? (
                  <View style={[styles.emptyDay, { borderColor: colors.border }]}>
                    <Text style={[styles.emptyDayText, { color: colors.secondary }]}>
                      No classes
                    </Text>
                  </View>
                ) : (
                  <View style={styles.dayEntries}>
                    {entriesByDay[day].map(entry => (
                      <TouchableOpacity
                        key={entry.id}
                        style={[
                          styles.entryCard,
                          {
                            backgroundColor: getSubjectColor(entry.course),
                            borderColor: colors.primary,
                          }
                        ]}
                        onPress={() => handleEditEntry(entry)}
                      >
                        <View style={styles.entryHeader}>
                          <Text style={[styles.courseText, { color: colors.text }]} numberOfLines={1}>
                            {entry.course}
                          </Text>
                          <TouchableOpacity
                            onPress={(e) => {
                              e.stopPropagation(); // Prevent triggering edit
                              handleDeleteEntry(entry);
                            }}
                            style={styles.deleteButton}
                          >
                            <Icon name="close" size={16} color="#FF6B6B" />
                          </TouchableOpacity>
                        </View>
                        
                        <Text style={[styles.timeText, { color: colors.secondary }]}>
                          {formatTime(entry.startTime)} - {formatTime(entry.endTime)}
                        </Text>
                        
                        <View style={styles.venueRow}>
                          <Icon name="map-marker" size={14} color={colors.secondary} />
                          <Text style={[styles.venueText, { color: colors.secondary }]} numberOfLines={1}>
                            {entry.venue}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Entry Form Modal - Pass all required props */}
      <TimetableEntryForm
        visible={showForm}
        onClose={handleCloseForm}
        onSubmit={handleSubmitEntry}
        colors={colors}
        editingEntry={editingEntry}
      />

      {/* Delete Confirmation */}
      <StandardPopup
        visible={showDeleteConfirm}
        title="Delete Class"
        message={`Are you sure you want to delete ${entryToDelete?.course}?`}
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setEntryToDelete(null);
        }}
        confirmText="Delete"
        cancelText="Cancel"
        showCancel={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerActions: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  addButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  timetableGrid: {
    paddingBottom: 20,
  },
  daySection: {
    marginBottom: 24,
  },
  dayHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    paddingLeft: 4,
  },
  emptyDay: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
  },
  emptyDayText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  dayEntries: {
    gap: 12,
  },
  entryCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  courseText: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  deleteButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  venueText: {
    fontSize: 12,
    flex: 1,
  },
  settingsSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  settingSubtitle: {
    fontSize: 14,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    position: 'relative',
  },
  toggleCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    position: 'absolute',
  },
});