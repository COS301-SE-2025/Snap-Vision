import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
// import TopBar from '../molecules/TopBar';
import AppInput from '../atoms/AppInput';
import AppButton from '../atoms/AppButton';
import AppSecondaryButton from '../atoms/AppSecondaryButton';
import FloorplanListItem from '../molecules/FloorplanListItem';
import SettingsHeader from '../molecules/SettingsHeader';


interface FloorplanItem {
  id: string;
  buildingName: string;
  floorLabel: string;
  status: 'active' | 'draft';
  uploadDate: string;
  icon: string;
}

interface Props {
  colors: any;
  navigation: any;
  buildingName: string;
  setBuildingName: (v: string) => void;
  floorLabel: string;
  setFloorLabel: (v: string) => void;
  mockFloorplans: FloorplanItem[];
  handleUpload: () => void;
  handleSaveChanges: () => void;
  handleView: (id: string) => void;
  handleEdit: (id: string) => void;
  handleDelete: (id: string) => void;
}

export default function AdminLoadFloorplansContent({
  colors,
  navigation,
  buildingName,
  setBuildingName,
  floorLabel,
  setFloorLabel,
  mockFloorplans,
  handleUpload,
  handleSaveChanges,
  handleView,
  handleEdit,
  handleDelete,
}: Props) {
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title="Load Floorplans" />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Building Name Input */}
        <View style={styles.inputSection}>
          <Text style={[styles.inputTitle, { color: colors.primary }]}>Building Name</Text>
          <AppInput
            placeholder="Enter the building's name"
            value={buildingName}
            onChangeText={setBuildingName}
            style={[
              styles.textField,
              { borderColor: colors.primary, color: colors.secondary, backgroundColor: colors.background }
            ]}
            placeholderTextColor={colors.secondary}
          />
          <Text style={[styles.infoText, { color: colors.secondary}]}>e.g. Science Hall</Text>
        </View>

        {/* Floor Label Input */}
        <View style={styles.inputSection}>
          <Text style={[styles.inputTitle, { color: colors.primary }]}>Floor Number / Label</Text>
          <AppInput
            placeholder="e.g., Floor 2, Basement"
            value={floorLabel}
            onChangeText={setFloorLabel}
            style={[
              styles.textField,
              { borderColor: colors.primary, color: colors.text, backgroundColor: colors.background }
            ]}
            placeholderTextColor={colors.secondary}
          />
          <Text style={[styles.infoText, { color: colors.secondary }]}>Specify the floor designation</Text>
        </View>

        {/* Upload Button */}
        <View style={styles.buttonSection}>
          <AppSecondaryButton
            title="Click to Upload"
            onPress={handleUpload}
          />
        </View>

        {/* Save Changes Button */}
        <View style={styles.buttonSection}>
          <AppButton title="Save Changes" onPress={handleSaveChanges} />
        </View>

        {/* Previously Uploaded Floorplans */}
        <View style={styles.listSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.headerText}>
              <Text style={[styles.sectionTitle, { color: colors.primary }]}>
                Previously Uploaded Floorplans
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.secondary }]}>Manage your uploads</Text>
            </View>
          </View>

          {mockFloorplans.map((item) => (
            <FloorplanListItem
              key={item.id}
              item={item}
              onView={() => handleView(item.id)}
              onEdit={() => handleEdit(item.id)}
              onDelete={() => handleDelete(item.id)}
              colors={colors}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 12,
  },
  inputSection: {
    marginBottom: 20,
    paddingTop: 12,
  },
  inputTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  textField: {
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
  },
  buttonSection: {
    marginBottom: 16,
  },
  listSection: {
    marginTop: 20,
  },
  sectionHeader: {
    paddingTop: 16,
    marginBottom: 12,
  },
  headerText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 12,
  },
});