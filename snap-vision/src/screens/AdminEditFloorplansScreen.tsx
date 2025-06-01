import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import TopBar from '../components/molecules/TopBar';
import AppButton from '../components/atoms/AppButton';
import AppSecondaryButton from '../components/atoms/AppSecondaryButton';
import AppInput from '../components/atoms/AppInput';

const mockFloorplans = [
  { id: '1', name: 'Science Hall - Floor 2' },
  { id: '2', name: 'Main Mall - Basement' },
];

const ACTIONS = [
  { key: 'add', label: 'Add Room/Shop' },
  { key: 'update', label: 'Update Room/Shop' },
  { key: 'remove', label: 'Remove Room/Shop' },
];

export default function AdminEditFloorplansScreen() {
  const navigation = useNavigation();
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  const [selectedFloorplan, setSelectedFloorplan] = useState<string | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  // Example state for add/update
  const [roomName, setRoomName] = useState('');
  const [roomType, setRoomType] = useState('');

  // Handlers for actions
  const handleUploadNew = () => { /* logic to upload new floorplan */ };
  const handleAddRoom = () => { /* logic to add room */ };
  const handleUpdateRoom = () => { /* logic to update room */ };
  const handleRemoveRoom = () => { /* logic to remove room */ };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TopBar title="Edit Floorplans" onBackPress={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Step 1: Select Floorplan */}
        <Text style={[styles.label, { color: colors.text }]}>Select Floorplan</Text>
        <View style={styles.floorplanList}>
          {mockFloorplans.map(fp => (
            <TouchableOpacity
              key={fp.id}
              style={[
                styles.floorplanItem,
                { backgroundColor: selectedFloorplan === fp.id ? colors.primary : colors.card }
              ]}
              onPress={() => {
                setSelectedFloorplan(fp.id);
                setSelectedAction(null);
              }}
            >
              <Text style={{ color: selectedFloorplan === fp.id ? colors.background : colors.text }}>
                {fp.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <AppSecondaryButton title="Upload New Floorplan" onPress={handleUploadNew} />

        {/* Step 2: Choose Action */}
        {selectedFloorplan && (
          <>
            <Text style={[styles.label, { color: colors.text, marginTop: 24 }]}>What would you like to do?</Text>
            <View style={styles.actionRow}>
              {ACTIONS.map(action => (
                <AppButton
                  key={action.key}
                  title={action.label}
                  onPress={() => setSelectedAction(action.key)}
                  style={{
                    flex: 1,
                    marginRight: action.key !== ACTIONS[ACTIONS.length - 1].key ? 8 : 0,
                    backgroundColor: selectedAction === action.key ? colors.primary : colors.card,
                  }}
                  textStyle={{
                    color: selectedAction === action.key ? colors.background : colors.text,
                  }}
                />
              ))}
            </View>
          </>
        )}

        {/* Step 3: Show Form/Action */}
        {selectedAction === 'add' && (
          <View style={{ marginTop: 24 }}>
            <Text style={[styles.label, { color: colors.text }]}>Add Room/Shop</Text>
            <AppInput
              placeholder="Room/Shop Name"
              value={roomName}
              onChangeText={setRoomName}
              style={[
                styles.textField,
                { borderColor: colors.primary, color: colors.text, backgroundColor: colors.background }
              ]}
              placeholderTextColor={colors.text + '99'}
            />
            <AppInput
              placeholder="Room/Shop Type"
              value={roomType}
              onChangeText={setRoomType}
              style={[
                styles.textField,
                { borderColor: colors.primary, color: colors.text, backgroundColor: colors.background }
              ]}
              placeholderTextColor={colors.text + '99'}
            />
            <AppButton title="Add" onPress={handleAddRoom} />
          </View>
        )}

        {selectedAction === 'update' && (
          <View style={{ marginTop: 24 }}>
            <Text style={[styles.label, { color: colors.text }]}>Update Room/Shop</Text>
            {/* Add update form here */}
            <AppButton title="Update" onPress={handleUpdateRoom} />
          </View>
        )}

        {selectedAction === 'remove' && (
          <View style={{ marginTop: 24 }}>
            <Text style={[styles.label, { color: colors.text }]}>Remove Room/Shop</Text>
            {/* Add remove form here */}
            <AppButton title="Remove" onPress={handleRemoveRoom} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  label: { fontSize: 16, fontWeight: '500', marginBottom: 8 },
  floorplanList: { flexDirection: 'row', marginBottom: 12, flexWrap: 'wrap', gap: 8 },
  floorplanItem: {
    padding: 12,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  actionRow: { flexDirection: 'row', marginTop: 8, marginBottom: 8 },
  textField: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 8 },
});