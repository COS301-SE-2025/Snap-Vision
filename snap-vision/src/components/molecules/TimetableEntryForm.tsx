import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AppInput from '../atoms/AppInput';
import AppButton from '../atoms/AppButton';
import AppSecondaryButton from '../atoms/AppSecondaryButton';
import { TimetableEntry, DAYS_OF_WEEK } from '../../types/timetable.types';
import DateTimePicker from '@react-native-community/datetimepicker';

interface TimetableEntryFormProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (entryData: Omit<TimetableEntry, 'id' | 'userId' | 'createdAt'>) => void;
  colors: any;
  editingEntry?: TimetableEntry | null;
}

export default function TimetableEntryForm({
  visible,
  onClose,
  onSubmit,
  colors,
  editingEntry = null,
}: TimetableEntryFormProps) {
  console.log('TimetableEntryForm rendering with visible:', visible); // Debug log

  const [course, setCourse] = useState('');
  const [day, setDay] = useState(DAYS_OF_WEEK[0]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [venue, setVenue] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Load data when editing
  useEffect(() => {
    console.log('TimetableEntryForm useEffect triggered, editingEntry:', editingEntry);
    if (editingEntry) {
      setCourse(editingEntry.course);
      setDay(editingEntry.day);
      setStartTime(editingEntry.startTime);
      setEndTime(editingEntry.endTime);
      setVenue(editingEntry.venue);
    } else {
      // Reset form for new entry
      setCourse('');
      setDay(DAYS_OF_WEEK[0]);
      setStartTime('');
      setEndTime('');
      setVenue('');
    }
  }, [editingEntry, visible]);

  // Helper to format time as HH:mm
  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  const handleSubmit = () => {
    console.log('Form submit attempted with:', { course, day, startTime, endTime, venue });
    
    if (!course.trim() || !startTime || !endTime || !venue.trim()) {
      console.log('Form validation failed');
      return; // Add validation popup if needed
    }

    const entryData = {
      course: course.trim(),
      day,
      startTime,
      endTime,
      venue: venue.trim(),
    };

    console.log('Submitting entry data:', entryData);
    onSubmit(entryData);
  };

  const handleClose = () => {
    console.log('Form close requested');
    // Reset form when closing
    setCourse('');
    setDay(DAYS_OF_WEEK[0]);
    setStartTime('');
    setEndTime('');
    setVenue('');
    onClose();
  };

  if (!visible) {
    console.log('TimetableEntryForm not visible, returning null');
    return null;
  }

  console.log('TimetableEntryForm rendering modal');

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingEntry ? 'Edit Class' : 'Add New Class'}
            </Text>

            {/* Course Input */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Course Code</Text>
              <AppInput
                placeholder="e.g., COS301"
                value={course}
                onChangeText={setCourse}
                style={[styles.input, { borderColor: colors.primary, color: colors.text }]}
              />
            </View>

            {/* Day Selector */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Day</Text>
              <View style={[styles.pickerContainer, { borderColor: colors.primary, backgroundColor: colors.card }]}>
                <Picker
                  selectedValue={day}
                  onValueChange={setDay}
                  style={[styles.picker, { color: colors.text }]}
                >
                  {DAYS_OF_WEEK.map((dayOption) => (
                    <Picker.Item key={dayOption} label={dayOption} value={dayOption} />
                  ))}
                </Picker>
              </View>
            </View>

            {/* Time Inputs */}
            <View style={styles.timeRow}>
              <View style={[styles.fieldContainer, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Start Time</Text>
                <TouchableOpacity
                  onPress={() => setShowStartPicker(true)}
                  style={[styles.timeButton, { backgroundColor: colors.card, borderColor: colors.primary }]}
                >
                  <Text style={{ color: colors.text }}>
                    {startTime ? startTime : 'Select time'}
                  </Text>
                </TouchableOpacity>
                {showStartPicker && (
                  <DateTimePicker
                    value={startTime ? new Date(`1970-01-01T${startTime}:00`) : new Date()}
                    mode="time"
                    is24Hour={true}
                    display="spinner"
                    onChange={(event, date) => {
                      setShowStartPicker(false);
                      if (date) setStartTime(formatTime(date));
                    }}
                  />
                )}
              </View>
              
              <View style={[styles.fieldContainer, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>End Time</Text>
                <TouchableOpacity
                  onPress={() => setShowEndPicker(true)}
                  style={[styles.timeButton, { backgroundColor: colors.card, borderColor: colors.primary }]}
                >
                  <Text style={{ color: colors.text }}>
                    {endTime ? endTime : 'Select time'}
                  </Text>
                </TouchableOpacity>
                {showEndPicker && (
                  <DateTimePicker
                    value={endTime ? new Date(`1970-01-01T${endTime}:00`) : new Date()}
                    mode="time"
                    is24Hour={true}
                    display="spinner"
                    onChange={(event, date) => {
                      setShowEndPicker(false);
                      if (date) setEndTime(formatTime(date));
                    }}
                  />
                )}
              </View>
            </View>

            {/* Venue Input */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Venue</Text>
              <AppInput
                placeholder="e.g., IT 2-26"
                value={venue}
                onChangeText={setVenue}
                style={[styles.input, { borderColor: colors.primary, color: colors.text }]}
              />
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <AppSecondaryButton 
                title="Cancel" 
                onPress={handleClose}
                style={[styles.actionButton, { backgroundColor: colors.background, borderColor: colors.primary }]}
              />
              <AppSecondaryButton
                title={editingEntry ? 'Update Class' : 'Add Class'}
                onPress={handleSubmit}
                style={[styles.actionButton]}
              />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 8,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  timeRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timeButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});