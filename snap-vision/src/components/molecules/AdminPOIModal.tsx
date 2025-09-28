import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  TouchableOpacity,
  FlatList,
  StyleSheet,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { AdminPOI } from '../../hooks/useMapAdmin';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

interface AdminPOIModalProps {
  visible: boolean;
  mode: 'add' | 'edit';
  onClose: () => void;
  onSubmit: () => void;

  // Add POI props
  buildingName?: string;
  setBuildingName?: (name: string) => void;
  numberOfFloors?: string;
  setNumberOfFloors?: (floors: string) => void;
  selectedLocation?: string;
  setSelectedLocation?: (location: string) => void;
  availableLocations?: string[];

  // Edit POI props
  newName?: string;
  setNewName?: (name: string) => void;
  newFloors?: string;
  setNewFloors?: (floors: string) => void;
  editingPOI?: AdminPOI | null;
}

export const AdminPOIModal: React.FC<AdminPOIModalProps> = ({
  visible,
  mode,
  onClose,
  onSubmit,
  buildingName = '',
  setBuildingName = () => {},
  numberOfFloors = '',
  setNumberOfFloors = () => {},
  selectedLocation = '',
  setSelectedLocation = () => {},
  availableLocations = [],
  newName = '',
  setNewName = () => {},
  newFloors = '',
  setNewFloors = () => {},
  editingPOI,
}) => {
  const { theme, isDark } = useTheme();
  const colors = getThemeColors(theme);
  const [locationDropdownVisible, setLocationDropdownVisible] = useState(false);
  if (!visible) return null;

  return (
    <Modal transparent visible animationType="slide">
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          backgroundColor: 'rgba(0,0,0,0.5)',
          padding: 20,
        }}
      >
        <View style={{ backgroundColor: colors.card, borderRadius: 10, padding: 20 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 16, color: colors.text }}>
            {mode === 'add' ? 'Add Building' : 'Edit Building'}
          </Text>

          {mode === 'add' && (
            <>
              <Text style={{ marginBottom: 5, color: colors.primary }}>Location:</Text>
              <TouchableOpacity
                style={[
                  styles.locationDropdown,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                onPress={() => setLocationDropdownVisible(true)}
              >
                <Text style={[styles.locationDropdownText, { color: colors.text }]}>
                  {selectedLocation || 'Select a location'}
                </Text>
                <Icon name="chevron-down" size={20} color={colors.text} />
              </TouchableOpacity>

              <Text style={{ marginBottom: 5, color: colors.primary }}>Name:</Text>
              <TextInput
                value={buildingName}
                onChangeText={setBuildingName}
                // placeholder="Building Name"
                style={{
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                  marginBottom: 10,
                  paddingVertical: 8,
                  color: colors.text,
                }}
              />

              <Text style={{ marginBottom: 5, color: colors.primary }}>Floors:</Text>
              <TextInput
                value={numberOfFloors}
                onChangeText={setNumberOfFloors}
                // placeholder="e.g. 3"
                keyboardType="numeric"
                style={{
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                  marginBottom: 20,
                  paddingVertical: 8,
                  color: colors.text,
                }}
              />
            </>
          )}

          {mode === 'edit' && (
            <>
              <Text style={{ marginBottom: 5, color: colors.primary }}>Name:</Text>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                style={{
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                  marginBottom: 10,
                  paddingVertical: 8,
                  color: colors.text,
                }}
              />

              <Text style={{ marginBottom: 5, color: colors.primary }}>Floors:</Text>
              <TextInput
                value={newFloors}
                onChangeText={setNewFloors}
                keyboardType="numeric"
                style={{
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border,
                  marginBottom: 20,
                  paddingVertical: 8,
                  color: colors.text,
                }}
              />
            </>
          )}

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Pressable onPress={onClose}>
              <Text
                style={{ color: colors.subtleText, paddingVertical: 10, paddingHorizontal: 20 }}
              >
                Cancel
              </Text>
            </Pressable>
            <Pressable onPress={onSubmit}>
              <Text
                style={{
                  fontWeight: 'bold',
                  color: colors.primary,
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                }}
              >
                {mode === 'add' ? 'Add' : 'Save'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Custom Location Dropdown Modal */}
      <Modal
        visible={locationDropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setLocationDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setLocationDropdownVisible(false)}
        >
          <View
            style={[
              styles.dropdownContainer,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.dropdownTitle, { color: colors.text }]}>Select Location</Text>
            <FlatList
              data={availableLocations}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.dropdownItem,
                    selectedLocation === item && { backgroundColor: colors.primary + '20' },
                  ]}
                  onPress={() => {
                    setSelectedLocation(item);
                    setLocationDropdownVisible(false);
                  }}
                >
                  <Text style={[styles.dropdownItemText, { color: colors.text }]}>{item}</Text>
                  {selectedLocation === item && (
                    <Icon name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  locationDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },

  locationDropdownText: {
    fontSize: 16,
    fontWeight: '500',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  dropdownContainer: {
    width: '80%',
    maxHeight: '50%',
    borderRadius: 12,
    borderWidth: 1,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },

  dropdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },

  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },

  dropdownItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default AdminPOIModal;
