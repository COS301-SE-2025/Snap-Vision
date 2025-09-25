import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Text } from 'react-native';
import { LocationSelector } from '../molecules/LocationSelector';
import BuildingSelector from '../molecules/BuildingSelector';
import AppInput from '../atoms/AppInput';
import { useAdminFloorplans } from '../../hooks/useAdminFloorplans';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';

interface AdminFloorplanUploadFlowProps {
  role: string | null;
  adminLocations: string[];
  onSelectionChange: (data: {
    locationId: string | null;
    buildingId: string | null;
    buildingName: string | null;
    floorNumber: string;
  }) => void;
}

export const AdminFloorplanUploadFlow: React.FC<AdminFloorplanUploadFlowProps> = ({
  role,
  adminLocations,
  onSelectionChange,
}) => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [selectedBuildingName, setSelectedBuildingName] = useState<string | null>(null);
  const [floorNumber, setFloorNumber] = useState<string>('');

  const [buildingDropdownOpen, setBuildingDropdownOpen] = useState(false);

  const { locations, buildings, fetchLocations, fetchBuildings } = useAdminFloorplans(
    role,
    adminLocations,
  );

  useEffect(() => {
    fetchLocations();
  }, [role, adminLocations]);

  useEffect(() => {
    if (selectedLocation) {
      fetchBuildings(selectedLocation);
      setSelectedBuildingId(null);
      setSelectedBuildingName(null);
      setFloorNumber('');
    }
  }, [selectedLocation]);

  // Notify parent component of selection changes
  useEffect(() => {
    onSelectionChange({
      locationId: selectedLocation,
      buildingId: selectedBuildingId,
      buildingName: selectedBuildingName,
      floorNumber,
    });
  }, [selectedLocation, selectedBuildingId, selectedBuildingName, floorNumber, onSelectionChange]);

  const handleLocationSelect = (locationId: string) => {
    setSelectedLocation(locationId);
    setSelectedBuildingId(null);
    setSelectedBuildingName(null);
    setFloorNumber('');
  };

  const handleBuildingSelect = (buildingId: string | null) => {
    setSelectedBuildingId(buildingId);
    
    // Find building name
    const building = buildings.find(b => b.id === buildingId);
    setSelectedBuildingName(building?.name || null);
    
    setFloorNumber('');
  };

  const handleFloorNumberChange = (text: string) => {
    // Only allow numbers
    const numericText = text.replace(/[^0-9]/g, '');
    setFloorNumber(numericText);
  };

  return (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      {/* Step 1: Location Selection */}
      <LocationSelector
        locations={locations}
        selectedLocation={selectedLocation || ''}
        onLocationSelect={handleLocationSelect}
      />

      {/* Step 2: Building Selection */}
      {selectedLocation && (
        <BuildingSelector
          buildings={buildings}
          selectedBuildingId={selectedBuildingId}
          setSelectedBuildingId={handleBuildingSelect}
          dropdownOpen={buildingDropdownOpen}
          setDropdownOpen={setBuildingDropdownOpen}
          title="Step 2: Select Building"
        />
      )}

      {/* Step 3: Floor Number Input */}
      {selectedBuildingId && (
        <View style={[styles.stepContainer, { backgroundColor: colors.card }]}>
          <Text style={[styles.stepTitle, { color: colors.primary }]}>
            Step 3: Enter Floor Number
          </Text>
          <Text style={[styles.stepDescription, { color: colors.text }]}>
            Enter the floor number where you want to upload the floorplan
          </Text>
          <AppInput
            placeholder="Enter floor number (e.g., 1, 2, 3...)"
            value={floorNumber}
            onChangeText={handleFloorNumberChange}
            keyboardType="number-pad"
            testID="input-floor-number"
            style={[
              styles.floorInput,
              { 
                borderColor: colors.primary, 
                color: colors.text, 
                backgroundColor: colors.background 
              },
            ]}
          />
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  stepContainer: {
    marginVertical: 8,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    marginBottom: 12,
    opacity: 0.7,
  },
  floorInput: {
    marginTop: 8,
  },
});