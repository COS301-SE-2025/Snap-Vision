import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { LocationSelector } from '../molecules/LocationSelector';
import BuildingSelector from '../molecules/BuildingSelector';
import FloorSelector from '../molecules/FloorSelector';
import { FloorplanActions } from '../molecules/FloorplanActions';
import { useAdminFloorplans } from '../../hooks/useAdminFloorplans';
import { FloorplanMeta } from '../../types/floorplan.types';

interface FloorplanSelectionFlowProps {
  role: string | null;
  adminLocations: string[];
  onEditFloorplan: (floorplan: FloorplanMeta) => void;
  onDeleteFloorplan: (floorplan: FloorplanMeta) => void;
}

export const FloorplanSelectionFlow: React.FC<FloorplanSelectionFlowProps> = ({
  role,
  adminLocations,
  onEditFloorplan,
  onDeleteFloorplan,
}) => {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [selectedFloorplan, setSelectedFloorplan] = useState<FloorplanMeta | null>(null);

  const [buildingDropdownOpen, setBuildingDropdownOpen] = useState(false);
  const [floorDropdownOpen, setFloorDropdownOpen] = useState(false);

  const { locations, buildings, floorplans, fetchLocations, fetchBuildings, fetchFloorplans } =
    useAdminFloorplans(role, adminLocations);

  useEffect(() => {
    fetchLocations();
  }, [role, adminLocations]);

  useEffect(() => {
    if (selectedLocation) {
      fetchBuildings(selectedLocation);
      setSelectedBuildingId(null);
      setSelectedFloorplan(null);
    }
  }, [selectedLocation]);

  useEffect(() => {
    if (selectedBuildingId) {
      fetchFloorplans(selectedLocation!, selectedBuildingId);
      setSelectedFloorplan(null);
    }
  }, [selectedBuildingId]);

  const handleLocationSelect = (locationId: string) => {
    setSelectedLocation(locationId);
    setSelectedBuildingId(null);
    setSelectedFloorplan(null);
  };

  const handleBuildingSelect = (buildingId: string | null) => {
    setSelectedBuildingId(buildingId);
    setSelectedFloorplan(null);
  };

  const handleFloorplanSelect = (floorplan: FloorplanMeta) => {
    setSelectedFloorplan(floorplan);
  };

  // Convert floorplans to the format expected by FloorSelector
  const floorSelectorData = floorplans.map((fp) => ({
    id: fp.id,
    name: fp.floorLabel,
  }));

  return (
    <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
      <LocationSelector
        locations={locations}
        selectedLocation={selectedLocation || ''}
        onLocationSelect={handleLocationSelect}
      />

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

      {selectedBuildingId && (
        <FloorSelector
          floors={floorSelectorData}
          selectedFloorId={selectedFloorplan?.id || null}
          setSelectedFloorId={(floorId) => {
            const match = floorplans.find((f) => f.id === floorId);
            if (match) handleFloorplanSelect(match);
          }}
          dropdownOpen={floorDropdownOpen}
          setDropdownOpen={setFloorDropdownOpen}
          title="Step 3: Select Floor"
        />
      )}

      {selectedFloorplan && (
        <FloorplanActions
          selectedFloorplan={selectedFloorplan}
          onEdit={() => onEditFloorplan(selectedFloorplan)}
          onDelete={() => onDeleteFloorplan(selectedFloorplan)}
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
});
