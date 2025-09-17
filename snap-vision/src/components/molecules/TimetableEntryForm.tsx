import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AppInput from '../atoms/AppInput';
import AppButton from '../atoms/AppButton';
import AppSecondaryButton from '../atoms/AppSecondaryButton';
import StandardPopup from '../atoms/StandardPopup';
import { TimetableEntry, DAYS_OF_WEEK } from '../../types/timetable.types';
import DateTimePicker from '@react-native-community/datetimepicker';
import { usePOIs } from '../../hooks/usePOIs'; 

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
  const [course, setCourse] = useState('');
  const [day, setDay] = useState(DAYS_OF_WEEK[0]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [venue, setVenue] = useState('');
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [selectedBuildingName, setSelectedBuildingName] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('up-campus'); // Default campus
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  
  // Validation states
  const [showValidationPopup, setShowValidationPopup] = useState(false);
  const [validationMessage, setValidationMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{[key: string]: boolean}>({});

  // Get available buildings from POIs
  const { pois, isLoading: poisLoading } = usePOIs();
  
  // Filter buildings from POIs
  const buildings = pois.filter(poi => 
    poi.tags?.building === 'yes' || 
    poi.type === 'building' ||
    poi.name?.toLowerCase().includes('building')
  ).sort((a, b) => a.name.localeCompare(b.name));

  // Load data when editing
  useEffect(() => {
    if (editingEntry) {
      setCourse(editingEntry.course);
      setDay(editingEntry.day);
      setStartTime(editingEntry.startTime);
      setEndTime(editingEntry.endTime);
      setVenue(editingEntry.venue);
      setSelectedBuildingId(editingEntry.buildingId || '');
      setSelectedBuildingName(editingEntry.buildingName || '');
      setSelectedLocationId(editingEntry.locationId || 'up-campus');
    } else {
      // Reset form for new entry
      setCourse('');
      setDay(DAYS_OF_WEEK[0]);
      setStartTime('');
      setEndTime('');
      setVenue('');
      setSelectedBuildingId('');
      setSelectedBuildingName('');
      setSelectedLocationId('up-campus');
    }
    // Clear any previous field errors when form opens/changes
    setFieldErrors({});
  }, [editingEntry, visible]);

  // Helper to format time as HH:mm
  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

  const handleBuildingSelect = (buildingId: string) => {
    const building = buildings.find(b => b.id === buildingId);
    if (building) {
      setSelectedBuildingId(buildingId);
      setSelectedBuildingName(building.name);
      setSelectedLocationId(building.location || 'up-campus');
    } else {
      setSelectedBuildingId('');
      setSelectedBuildingName('');
    }
    // Clear building error when user selects a building
    if (buildingId) {
      setFieldErrors(prev => ({ ...prev, building: false }));
    }
  };

  // Clear field errors when user inputs data
  const handleInputChange = (field: string, value: string, setter: (value: string) => void) => {
    setter(value);
    if (value.trim()) {
      setFieldErrors(prev => ({ ...prev, [field]: false }));
    }
  };

  const validateForm = () => {
    const errors: {[key: string]: boolean} = {};
    let errorMessage = '';

    // Check course
    if (!course.trim()) {
      errors.course = true;
      errorMessage = 'Please enter a course code';
    }
    // Check building
    else if (!selectedBuildingId) {
      errors.building = true;
      errorMessage = 'Please select a building';
    }
    // Check venue
    else if (!venue.trim()) {
      errors.venue = true;
      errorMessage = 'Please enter a venue';
    }
    // Check start time
    else if (!startTime) {
      errors.startTime = true;
      errorMessage = 'Please select a start time';
    }
    // Check end time
    else if (!endTime) {
      errors.endTime = true;
      errorMessage = 'Please select an end time';
    }
    // Check if end time is after start time
    else if (startTime && endTime && startTime >= endTime) {
      errors.endTime = true;
      errorMessage = 'End time must be after start time';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setValidationMessage(errorMessage);
      setShowValidationPopup(true);
      return false;
    }

    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    const entryData = {
      course: course.trim(),
      day,
      startTime,
      endTime,
      venue: venue.trim(),
      buildingId: selectedBuildingId,
      buildingName: selectedBuildingName,
      locationId: selectedLocationId,
    };

    onSubmit(entryData);
  };

  const handleClose = () => {
    // Reset form when closing
    setCourse('');
    setDay(DAYS_OF_WEEK[0]);
    setStartTime('');
    setEndTime('');
    setVenue('');
    setSelectedBuildingId('');
    setSelectedBuildingName('');
    setSelectedLocationId('up-campus');
    setFieldErrors({});
    onClose();
  };

  const getFieldStyle = (fieldName: string) => {
    return fieldErrors[fieldName] 
      ? { borderColor: '#FF6B6B', borderWidth: 2 }
      : { borderColor: colors.primary };
  };

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
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Course Code <Text style={styles.required}>*</Text>
              </Text>
              <AppInput
                placeholder="e.g., COS301"
                value={course}
                onChangeText={(text) => handleInputChange('course', text, setCourse)}
                style={[styles.input, { color: colors.text }, getFieldStyle('course')]}
              />
            </View>

            {/* Day Selector */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Day <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.pickerContainer, { backgroundColor: colors.card }, getFieldStyle('day')]}>
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

            {/* Building Selector */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Building <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.pickerContainer, { backgroundColor: colors.card }, getFieldStyle('building')]}>
                <Picker
                  selectedValue={selectedBuildingId}
                  onValueChange={handleBuildingSelect}
                  style={[styles.picker, { color: colors.text }]}
                  enabled={!poisLoading}
                >
                  <Picker.Item label="Select Building" value="" />
                  {buildings.map((building) => (
                    <Picker.Item 
                      key={building.id} 
                      label={building.name} 
                      value={building.id} 
                    />
                  ))}
                </Picker>
              </View>
              {poisLoading && (
                <Text style={[styles.loadingText, { color: colors.secondary }]}>
                  Loading buildings...
                </Text>
              )}
            </View>

            {/* Venue Input */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Venue <Text style={styles.required}>*</Text>
              </Text>
              <AppInput
                placeholder="e.g., IT 2-26"
                value={venue}
                onChangeText={(text) => handleInputChange('venue', text, setVenue)}
                style={[styles.input, { color: colors.text }, getFieldStyle('venue')]}
              />
            </View>

            {/* Time Inputs */}
            <View style={styles.timeRow}>
              <View style={[styles.fieldContainer, { flex: 1, marginRight: 8 }]}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>
                  Start Time <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  onPress={() => setShowStartPicker(true)}
                  style={[
                    styles.timeButton, 
                    { backgroundColor: colors.card }, 
                    getFieldStyle('startTime')
                  ]}
                >
                  <Text style={{ color: startTime ? colors.text : colors.secondary }}>
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
                      if (date) {
                        const time = formatTime(date);
                        setStartTime(time);
                        setFieldErrors(prev => ({ ...prev, startTime: false }));
                      }
                    }}
                  />
                )}
              </View>
              
              <View style={[styles.fieldContainer, { flex: 1, marginLeft: 8 }]}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>
                  End Time <Text style={styles.required}>*</Text>
                </Text>
                <TouchableOpacity
                  onPress={() => setShowEndPicker(true)}
                  style={[
                    styles.timeButton, 
                    { backgroundColor: colors.card }, 
                    getFieldStyle('endTime')
                  ]}
                >
                  <Text style={{ color: endTime ? colors.text : colors.secondary }}>
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
                      if (date) {
                        const time = formatTime(date);
                        setEndTime(time);
                        setFieldErrors(prev => ({ ...prev, endTime: false }));
                      }
                    }}
                  />
                )}
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.modalActions}>
              <AppSecondaryButton 
                title="Cancel" 
                onPress={handleClose}
                style={[styles.actionButton, { backgroundColor: colors.background, borderColor: colors.primary }]}
              />
              <AppButton
                title={editingEntry ? 'Update Class' : 'Add Class'}
                onPress={handleSubmit}
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
              />
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Validation Error Popup */}
      <StandardPopup
        visible={showValidationPopup}
        title="Missing Information"
        message={validationMessage}
        onConfirm={() => setShowValidationPopup(false)}
        confirmText="OK"
        showCancel={false}
      />
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
  required: {
    color: '#FF6B6B',
    fontSize: 14,
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
  loadingText: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
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