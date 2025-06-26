import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import AppInput from '../atoms/AppInput';
import AppButton from '../atoms/AppButton';
import AppSecondaryButton from '../atoms/AppSecondaryButton';
import SettingsHeader from '../molecules/SettingsHeader';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Interface for building data
interface Building {
  id: string;
  name: string;
  centroid?: {
    latitude: number;
    longitude: number;
  };
}

interface Props {
  colors: any;
  navigation: any;
  buildingName: string;
  setBuildingName: (v: string) => void;
  floorLabel: string;
  setFloorLabel: (v: string) => void;
  buildings: Building[];
  selectedBuilding: Building | null;
  onBuildingSelect: (building: Building) => void;
  fileUri: string | null;
  fileName: string;
  onPickFile: () => void;
  handleUpload: () => void;
  isLoading: boolean;
  error: string | null;
}

export default function AdminLoadFloorplansContent({
  colors,
  navigation,
  buildingName,
  setBuildingName,
  floorLabel,
  setFloorLabel,
  buildings,
  selectedBuilding,
  onBuildingSelect,
  fileUri,
  fileName,
  onPickFile,
  handleUpload,
  isLoading,
  error,
}: Props) {
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title="Upload Floorplan" />

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={{ color: colors.text, marginTop: 16 }}>Processing...</Text>
        </View>
      )}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Error message */}
        {error && (
          <View style={[styles.errorContainer, { backgroundColor: colors.error }]}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Step 1: Select Building */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            Step 1: Select Building
          </Text>

          {/* Building Selection */}
          {buildings.length === 0 ? (
            <Text style={[styles.infoText, { color: colors.secondary }]}>
              No buildings available. Please check your connection.
            </Text>
          ) : (
            <View style={styles.buildingSelector}>
              <Text style={[styles.inputTitle, { color: colors.primary }]}>Select a Building</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.buildingList}
              >
                {buildings.map((building) => (
                  <TouchableOpacity
                    key={building.id}
                    style={[
                      styles.buildingItem,
                      {
                        backgroundColor:
                          selectedBuilding?.id === building.id ? colors.primary : colors.card,
                      },
                    ]}
                    onPress={() => onBuildingSelect(building)}
                  >
                    <Text
                      style={{
                        color: selectedBuilding?.id === building.id ? colors.cardText : colors.text,
                      }}
                    >
                      {building.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Or manually enter building name */}
          <Text style={[styles.orText, { color: colors.text }]}>OR</Text>

          <View style={styles.inputSection}>
            <Text style={[styles.inputTitle, { color: colors.primary }]}>Building Name</Text>
            <AppInput
              placeholder="Enter the building's name"
              value={buildingName}
              onChangeText={setBuildingName}
              style={[
                styles.textField,
                { borderColor: colors.primary, color: colors.text, backgroundColor: colors.card },
              ]}
              placeholderTextColor={colors.secondary}
            />
            <Text style={[styles.infoText, { color: colors.secondary }]}>e.g. Science Hall</Text>
          </View>
        </View>

        {/* Step 2: Floor Label */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            Step 2: Floor Information
          </Text>

          <View style={styles.inputSection}>
            <Text style={[styles.inputTitle, { color: colors.primary }]}>Floor Number / Label</Text>
            <AppInput
              placeholder="e.g., Floor 2, Basement"
              value={floorLabel}
              onChangeText={setFloorLabel}
              style={[
                styles.textField,
                { borderColor: colors.primary, color: colors.text, backgroundColor: colors.card },
              ]}
              placeholderTextColor={colors.secondary}
            />
            <Text style={[styles.infoText, { color: colors.secondary }]}>
              Specify the floor designation
            </Text>
          </View>
        </View>

        {/* Step 3: Upload Floorplan */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>
            Step 3: Select Floorplan File
          </Text>

          {/* File Upload Button */}
          <View style={styles.fileUploadContainer}>
            <AppSecondaryButton
              title={fileUri ? 'Change Image' : 'Select Floorplan Image'}
              onPress={onPickFile}
              icon="file-image"
            />
            <Text style={[styles.infoText, { color: colors.secondary }]}>
              Select a PNG or JPG floorplan image
            </Text>

            {fileUri && (
              <View style={[styles.fileInfoContainer, { backgroundColor: colors.card }]}>
                <Icon name="file-document" size={24} color={colors.primary} />
                <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
                  {fileName}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Submit Button */}
        <View style={styles.submitContainer}>
          <AppButton
            title="Upload Floorplan"
            onPress={handleUpload}
            disabled={!fileUri || (!selectedBuilding && !buildingName) || !floorLabel}
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    marginVertical: 16,
  },
  errorText: {
    color: 'white',
    fontWeight: '500',
  },
  sectionContainer: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  buildingSelector: {
    marginBottom: 16,
  },
  buildingList: {
    paddingVertical: 8,
  },
  buildingItem: {
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  orText: {
    textAlign: 'center',
    fontWeight: 'bold',
    marginVertical: 8,
  },
  inputSection: {
    marginBottom: 16,
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
  fileUploadContainer: {
    marginTop: 8,
  },
  fileInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  fileName: {
    marginLeft: 8,
    flex: 1,
  },
  submitContainer: {
    marginTop: 8,
    marginBottom: 32,
  },
});
