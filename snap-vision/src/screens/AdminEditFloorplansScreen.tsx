import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import TopBar from '../components/molecules/TopBar';
import AppSecondaryButton from '../components/atoms/AppSecondaryButton';
import AppButton from '../components/atoms/AppButton';
import AppInput from '../components/atoms/AppInput';

const ROOM_TYPES = ['Lecture Hall', 'Office', 'Bathroom', 'Cafeteria'];

export default function AdminEditFloorplansScreen() {
  const [roomName, setRoomName] = useState('');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const navigation = useNavigation();
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TopBar title="Edit Floorplans" onBackPress={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Map Container */}
        <View style={styles.mapContainer}>
          <View style={[styles.mapPlaceholder, { backgroundColor: colors.card }]}>
            <Text style={[styles.mapText, { color: colors.text }]}>
              Interactive canvas showing uploaded floorplan image.
            </Text>
            <View style={[styles.locationIcon, { backgroundColor: colors.secondary + '55' }]} />
          </View>
        </View>

        {/* Room Name Input */}
        <View style={styles.inputSection}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>Room Name</Text>
          <AppInput
            style={[
              styles.textField,
              { borderColor: colors.primary, color: colors.text, backgroundColor: colors.background }
            ]}
            placeholder="Enter room name"
            placeholderTextColor={colors.text + '99'}
            value={roomName}
            onChangeText={setRoomName}
          />
          <Text style={[styles.inputInfo, { color: colors.text }]}>
            Specify the name of the room being added.
          </Text>
        </View>

        {/* Room Type Selection */}
        <View style={styles.selectionSection}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>Room Type</Text>
          <View style={styles.chipGroup}>
            {ROOM_TYPES.map(type => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.chip,
                  { backgroundColor: selectedType === type ? colors.primary : colors.card }
                ]}
                onPress={() => setSelectedType(type)}
              >
                <Text style={[
                  styles.chipText,
                  {
                    color: selectedType === type ? colors.background : colors.text,
                    fontWeight: selectedType === type ? '500' : '400'
                  }
                ]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.inputInfo, { color: colors.text }]}>
            Select the type of room being added.
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <AppSecondaryButton
            title="Discard Changes"
            onPress={() => {/* handle discard */}}
            style={{ flex: 1, marginRight: 8, marginBottom: 0 }}
          />
          <AppButton
            title="Save Changes"
            onPress={() => {/* handle save */}}
            style={{ flex: 1, marginBottom: 0 }}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    width: '100%',
    height: 336,
    paddingHorizontal: 12,
    marginTop: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPlaceholder: {
    flex: 1,
    width: '100%',
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  mapText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 150,
  },
  locationIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    position: 'absolute',
    top: 144,
    left: '45%',
  },
  inputSection: {
    width: '100%',
    paddingHorizontal: 12,
    marginTop: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  textField: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4,
  },
  inputInfo: {
    fontSize: 12,
    marginBottom: 4,
  },
  selectionSection: {
    width: '100%',
    paddingHorizontal: 12,
    marginTop: 12,
  },
  chipGroup: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  chip: {
    padding: 8,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 4,
  },
  chipText: {
    fontSize: 14,
  },
  buttonRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginTop: 24,
    marginBottom: 8,
  },
});