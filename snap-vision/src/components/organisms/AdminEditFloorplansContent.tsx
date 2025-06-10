import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import TopBar from '../molecules/TopBar';
import AppButton from '../atoms/AppButton';
import AppSecondaryButton from '../atoms/AppSecondaryButton';

interface Floorplan {
  id: string;
  name: string;
}

interface Props {
  colors: any;
  navigation: any;
  mockFloorplans: Floorplan[];
  selectedFloorplan: string | null;
  setSelectedFloorplan: (id: string) => void;
  handleUploadUpdated: () => void;
  handleSave: () => void;
}

export default function AdminEditFloorplansContent({
  colors,
  navigation,
  mockFloorplans,
  selectedFloorplan,
  setSelectedFloorplan,
  handleUploadUpdated,
  handleSave,
}: Props) {
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
              onPress={() => setSelectedFloorplan(fp.id)}
            >
              <Text style={{ color: selectedFloorplan === fp.id ? colors.background : colors.text }}>
                {fp.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Step 2: Upload Updated Floorplan */}
        {selectedFloorplan && (
          <AppSecondaryButton
            title="Upload Updated Floorplan"
            onPress={handleUploadUpdated}
            style={{ marginTop: 24 }}
          />
        )}

        {/* Step 3: Save Changes */}
        {selectedFloorplan && (
          <AppButton
            title="Save Changes"
            onPress={handleSave}
          />
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
});