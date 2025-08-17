import React from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { AdminPOI } from '../../hooks/useMapAdmin';

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
        <View style={{ backgroundColor: 'white', borderRadius: 10, padding: 20 }}>
          <Text style={{ fontWeight: 'bold', fontSize: 18, marginBottom: 16 }}>
            {mode === 'add' ? 'Add Building' : 'Edit Building'}
          </Text>
          
          {mode === 'add' && (
            <>
              <Text style={{ marginBottom: 5 }}>Location:</Text>
              <View style={{ borderWidth: 1, borderRadius: 5, marginBottom: 10 }}>
                <Picker
                  selectedValue={selectedLocation}
                  onValueChange={setSelectedLocation}
                  style={{ height: 40 }}
                >
                  <Picker.Item label="Select a location" value="" />
                  {availableLocations.map((loc) => (
                    <Picker.Item key={loc} label={loc} value={loc} />
                  ))}
                </Picker>
              </View>
              
              <Text style={{ marginBottom: 5 }}>Name:</Text>
              <TextInput
                value={buildingName}
                onChangeText={setBuildingName}
                placeholder="Building Name"
                style={{ borderBottomWidth: 1, marginBottom: 10, paddingVertical: 8 }}
              />
              
              <Text style={{ marginBottom: 5 }}>Floors:</Text>
              <TextInput
                value={numberOfFloors}
                onChangeText={setNumberOfFloors}
                placeholder="e.g. 3"
                keyboardType="numeric"
                style={{ borderBottomWidth: 1, marginBottom: 20, paddingVertical: 8 }}
              />
            </>
          )}
          
          {mode === 'edit' && (
            <>
              <Text style={{ marginBottom: 5 }}>Name:</Text>
              <TextInput
                value={newName}
                onChangeText={setNewName}
                placeholder="New Name"
                style={{ borderBottomWidth: 1, marginBottom: 10, paddingVertical: 8 }}
              />
              
              <Text style={{ marginBottom: 5 }}>Floors:</Text>
              <TextInput
                value={newFloors}
                onChangeText={setNewFloors}
                placeholder="e.g. 4"
                keyboardType="numeric"
                style={{ borderBottomWidth: 1, marginBottom: 20, paddingVertical: 8 }}
              />
            </>
          )}
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Pressable onPress={onClose}>
              <Text style={{ color: '#666', paddingVertical: 10, paddingHorizontal: 20 }}>Cancel</Text>
            </Pressable>
            <Pressable onPress={onSubmit}>
              <Text style={{ 
                fontWeight: 'bold', 
                color: '#007AFF',
                paddingVertical: 10, 
                paddingHorizontal: 20 
              }}>
                {mode === 'add' ? 'Add' : 'Save'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default AdminPOIModal;
