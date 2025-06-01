import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import AppInput from '../components/atoms/AppInput';
import AppButton from '../components/atoms/AppButton';
import AppSecondaryButton from '../components/atoms/AppSecondaryButton';
import FloorplanListItem from '../components/molecules/FloorplanListItem';
import TopBar from '../components/molecules/TopBar';

interface FloorplanItem {
  id: string;
  buildingName: string;
  floorLabel: string;
  status: 'active' | 'draft';
  uploadDate: string;
  icon: string;
}

const mockFloorplans: FloorplanItem[] = [
  {
    id: '1',
    buildingName: 'Science Hall',
    floorLabel: 'Floor 2',
    status: 'active',
    uploadDate: '2023-10-01',
    icon: '🏢',
  },
  {
    id: '2',
    buildingName: 'Main Mall',
    floorLabel: 'Basement',
    status: 'draft',
    uploadDate: '2023-10-05',
    icon: '🏬',
  },
];

export default function AdminLoadFloorplansScreen({ navigation }: any) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const [buildingName, setBuildingName] = useState('');
  const [floorLabel, setFloorLabel] = useState('');

  const handleUpload = () => {
    console.log('Upload floorplan');
  };

  const handleSaveChanges = () => {
    console.log('Save changes');
  };

  const handleView = (id: string) => {
    console.log('View floorplan:', id);
  };

  const handleEdit = (id: string) => {
    console.log('Edit floorplan:', id);
  };

  const handleDelete = (id: string) => {
    console.log('Delete floorplan:', id);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TopBar title="Load Floorplans" onBackPress={() => navigation.goBack()} />
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Building Name Input */}
        <View style={styles.inputSection}>
          <Text style={[styles.inputTitle, { color: colors.text }]}>Building Name</Text>
          <AppInput
            placeholder="Enter the building's name"
            value={buildingName}
            onChangeText={setBuildingName}
            style={[
              styles.textField,
              { borderColor: colors.primary, color: colors.text, backgroundColor: colors.background }
            ]}
            placeholderTextColor={colors.text + '99'}
          />
          <Text style={[styles.infoText, { color: colors.text } ]}>e.g. Science Hall</Text>
        </View>

        {/* Floor Label Input */}
        <View style={styles.inputSection}>
          <Text style={[styles.inputTitle, { color: colors.text }]}>Floor Number / Label</Text>
          <AppInput
            placeholder="e.g., Floor 2, Basement"
            value={floorLabel}
            onChangeText={setFloorLabel}
            style={[
              styles.textField,
              { borderColor: colors.primary, color: colors.text, backgroundColor: colors.background }
            ]}
            placeholderTextColor={colors.text + '99'}
          />
          <Text style={[styles.infoText, { color: colors.text } ]}>Specify the floor designation</Text>
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
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Previously Uploaded Floorplans
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.text }]}>Manage your uploads</Text>
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
    // color removed
  },
  textField: {
    marginBottom: 4,
  },
  infoText: {
    fontSize: 12,
    // color removed
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
    // color removed
  },
  sectionSubtitle: {
    fontSize: 12,
    // color removed
  },
});