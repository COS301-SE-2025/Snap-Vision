import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, FlatList } from 'react-native';
import AppInput from '../atoms/AppInput';
import AppButton from '../atoms/AppButton';
import AppSecondaryButton from '../atoms/AppSecondaryButton';
import StandardPopup from '../atoms/StandardPopup';
import { TimetableEntry, DAYS_OF_WEEK } from '../../types/timetable.types';
import DateTimePicker from '@react-native-community/datetimepicker';
import { usePOIs } from '../../hooks/usePOIs'; 
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

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
  
  // Dropdown states
  const [showDayDropdown, setShowDayDropdown] = useState(false);
  const [showBuildingDropdown, setShowBuildingDropdown] = useState(false);
  
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

  const handleBuildingSelect = (building: any) => {
    setSelectedBuildingId(building.id);
    setSelectedBuildingName(building.name);
    setSelectedLocationId(building.location || 'up-campus');
    setShowBuildingDropdown(false);
    // Clear building error when user selects a building
    setFieldErrors(prev => ({ ...prev, building: false }));
  };

  const handleDaySelect = (selectedDay: string) => {
    setDay(selectedDay);
    setShowDayDropdown(false);
    setFieldErrors(prev => ({ ...prev, day: false }));
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
    setShowDayDropdown(false);
    setShowBuildingDropdown(false);
    onClose();
  };

  const getFieldStyle = (fieldName: string) => {
    return fieldErrors[fieldName] 
      ? { borderColor: '#FF6B6B', borderWidth: 2 }
      : { borderColor: colors.primary };
  };

  const renderDayItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.dropdownItem,
        {
          backgroundColor: day === item ? colors.primary : colors.background,
          borderBottomColor: colors.border,
        }
      ]}
      onPress={() => handleDaySelect(item)}
    >
      <Text style={[
        styles.dropdownItemText,
        { color: day === item ? colors.background : colors.text }
      ]}>
        {item}
      </Text>
    </TouchableOpacity>
  );

  const renderBuildingItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.dropdownItem,
        {
          backgroundColor: selectedBuildingId === item.id ? colors.primary : colors.background,
          borderBottomColor: colors.border,
        }
      ]}
      onPress={() => handleBuildingSelect(item)}
    >
      <Text style={[
        styles.dropdownItemText,
        { color: selectedBuildingId === item.id ? colors.background : colors.text }
      ]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>
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
              <TouchableOpacity
                style={[
                  styles.dropdownButton,
                  { backgroundColor: colors.card, borderColor: colors.primary },
                  getFieldStyle('day')
                ]}
                onPress={() => setShowDayDropdown(!showDayDropdown)}
              >
                <Text style={[styles.dropdownButtonText, { color: colors.text }]}>
                  {day}
                </Text>
                <Icon 
                  name={showDayDropdown ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={colors.text} 
                />
              </TouchableOpacity>
              
              {showDayDropdown && (
                <View style={[
                  styles.dropdown,
                  { backgroundColor: colors.card, borderColor: colors.border }
                ]}>
                  <FlatList
                    data={DAYS_OF_WEEK}
                    renderItem={renderDayItem}
                    keyExtractor={(item) => item}
                    style={styles.dropdownList}
                    showsVerticalScrollIndicator={true}
                  />
                </View>
              )}
            </View>

            {/* Building Selector */}
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Building <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={[
                  styles.dropdownButton,
                  { backgroundColor: colors.card, borderColor: colors.primary },
                  getFieldStyle('building')
                ]}
                onPress={() => setShowBuildingDropdown(!showBuildingDropdown)}
                disabled={poisLoading}
              >
                <Text style={[
                  styles.dropdownButtonText, 
                  { color: selectedBuildingName ? colors.text : colors.secondary }
                ]}>
                  {selectedBuildingName || 'Select Building'}
                </Text>
                <Icon 
                  name={showBuildingDropdown ? "chevron-up" : "chevron-down"} 
                  size={20} 
                  color={colors.text} 
                />
              </TouchableOpacity>
              
              {showBuildingDropdown && (
                <View style={[
                  styles.dropdown,
                  styles.buildingDropdown,
                  { backgroundColor: colors.card, borderColor: colors.border }
                ]}>
                  {buildings.length > 0 ? (
                    <FlatList
                      data={buildings}
                      renderItem={renderBuildingItem}
                      keyExtractor={(item) => item.id}
                      style={styles.dropdownList}
                      showsVerticalScrollIndicator={true}
                    />
                  ) : (
                    <View style={styles.emptyState}>
                      <Text style={[styles.emptyStateText, { color: colors.secondary }]}>
                        {poisLoading ? 'Loading buildings...' : 'No buildings found'}
                      </Text>
                    </View>
                  )}
                </View>
              )}
              
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
          </ScrollView>

          {/* Fixed Action Buttons Container */}
          <View style={[styles.modalActions, { borderTopColor: colors.border }]}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.cancelButton,
                { 
                  backgroundColor: colors.background, 
                  borderColor: colors.primary 
                }
              ]}
              onPress={handleClose}
            >
              <Text style={[styles.actionButtonText, { color: colors.primary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.primaryButton,
                { backgroundColor: colors.primary }
              ]}
              onPress={handleSubmit}
            >
              <Text style={[styles.actionButtonText, { color: 'white' }]}>
                {editingEntry ? 'Update Class' : 'Add Class'}
              </Text>
            </TouchableOpacity>
          </View>
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
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    borderRadius: 16,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  scrollContent: {
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  fieldContainer: {
    marginBottom: 16,
    position: 'relative', // For dropdown positioning
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
  dropdownButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 48,
  },
  dropdownButtonText: {
    fontSize: 16,
    flex: 1,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: 8,
    maxHeight: 150,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  buildingDropdown: {
    maxHeight: 200, // Taller for buildings
  },
  dropdownList: {
    flex: 1,
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  dropdownItemText: {
    fontSize: 16,
  },
  emptyState: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelButton: {
    borderWidth: 2,
  },
  primaryButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});