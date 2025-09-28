import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { LocationSelector } from '../molecules/LocationSelector';
import BuildingSelector from '../molecules/BuildingSelector';
import FloorSelector from '../molecules/FloorSelector';
import firestore from '@react-native-firebase/firestore';

interface LocationItem {
  id: string;
  name: string;
}

interface BuildingItem {
  id: string;
  name: string;
}

interface FloorItem {
  id: string;
  name: string;
}

interface Floorplan {
  locationId: string;
  buildingId: string;
  floorLabel: string;
  downloadURL: string;
  id: string;
}

interface BeaconPositioningFlowProps {
  role: string | null;
  adminLocations: string[];
  buildingId?: string | null;
  floorId?: string | null;
  onFloorplanSelect: (floorplan: Floorplan | null) => void;
}

export const BeaconPositioningFlow: React.FC<BeaconPositioningFlowProps> = ({
  role,
  adminLocations,
  buildingId,
  floorId,
  onFloorplanSelect,
}) => {
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [buildings, setBuildings] = useState<BuildingItem[]>([]);
  const [floorplans, setFloorplans] = useState<Floorplan[]>([]);

  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [selectedFloorplan, setSelectedFloorplan] = useState<Floorplan | null>(null);

  const [buildingDropdownOpen, setBuildingDropdownOpen] = useState(false);
  const [floorDropdownOpen, setFloorDropdownOpen] = useState(false);

  // Fetch locations (respect editor RBAC)
  const fetchLocations = async () => {
    if (!role) return;
    const locSnap = await firestore().collection('locations').get();
    const all = locSnap.docs.map((doc) => ({
      id: doc.id,
      name: (doc.data() as any).name || doc.id,
    }));
    const filtered = role === 'editor' ? all.filter((loc) => adminLocations.includes(loc.id)) : all;
    setLocations(filtered);
  };

  // Fetch buildings under location
  const fetchBuildings = async (locationId: string) => {
    const snap = await firestore().collection(`locations/${locationId}/buildingPOIs`).get();
    const list = snap.docs.map((doc) => ({
      id: doc.id,
      name: (doc.data() as any).name || doc.id,
    }));
    setBuildings(list);
  };

  // Fetch floorplans for a selected building
  const fetchFloorplans = async (locationId: string, buildingId: string) => {
    const snap = await firestore()
      .collection(`locations/${locationId}/buildingPOIs/${buildingId}/floorplans`)
      .get();
    const list = snap.docs.map((doc) => {
      const d = doc.data() as any;
      return {
        locationId,
        buildingId,
        floorLabel: d.floorLabel || doc.id,
        downloadURL: d.downloadURL,
        id: `${buildingId}_${d.floorLabel || doc.id}`,
      } as Floorplan;
    });
    setFloorplans(list);

    // Auto-select by prop if provided
    if (floorId) {
      const match = list.find((fp) => fp.floorLabel === floorId || fp.id.endsWith(`_${floorId}`));
      if (match) {
        setSelectedFloorplan(match);
        onFloorplanSelect(match);
      }
    }
  };

  // Effects
  useEffect(() => {
    fetchLocations();
  }, [role, adminLocations]);

  useEffect(() => {
    if (selectedLocation) {
      fetchBuildings(selectedLocation);
      // Only auto-select building if props specify it and we haven't manually selected yet
      if (buildingId && !selectedBuildingId) {
        setSelectedBuildingId(buildingId);
      }
    }
  }, [selectedLocation]);

  useEffect(() => {
    if (selectedLocation && selectedBuildingId) {
      fetchFloorplans(selectedLocation, selectedBuildingId);
    }
  }, [selectedBuildingId]);

  // Handlers
  const handleLocationSelect = (locationId: string) => {
    setSelectedLocation(locationId);
    setSelectedBuildingId(null);
    setSelectedFloorplan(null);
    onFloorplanSelect(null);
  };

  const handleBuildingSelect = (buildingId: string | null) => {
    setSelectedBuildingId(buildingId);
    setSelectedFloorplan(null);
    onFloorplanSelect(null);
  };

  const handleFloorSelect = (floorId: string | null) => {
    const match = floorplans.find((fp) => fp.id === floorId);
    setSelectedFloorplan(match || null);
    onFloorplanSelect(match || null);
  };

  // Convert floorplans to the format expected by FloorSelector
  const floorSelectorData = floorplans.map((fp) => ({
    id: fp.id,
    name: fp.floorLabel,
  }));

  return (
    <View style={styles.container}>
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
          setSelectedFloorId={handleFloorSelect}
          dropdownOpen={floorDropdownOpen}
          setDropdownOpen={setFloorDropdownOpen}
          title="Step 3: Select Floor"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
