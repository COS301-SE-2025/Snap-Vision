import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import PathModeButton from '../atoms/PathModeButton';

interface FloorplanHeaderProps {
  floorLabel: string;
  isPathMode: boolean;
  selectedRooms: string[];
  currentPath: { x: number; y: number }[];
  onTogglePathMode: () => void;
  onSavePath: () => void;
  colors: {
    text: string;
    border: string;
    primary: string;
    card: string;
    secondary: string;
  };
}

const FloorplanHeader: React.FC<FloorplanHeaderProps> = ({
  floorLabel,
  isPathMode,
  selectedRooms,
  currentPath,
  onTogglePathMode,
  onSavePath,
  colors,
}) => {
  return (
    <View style={[styles.header, { borderBottomColor: colors.border }]}>
      <Text style={[styles.headerTitle, { color: colors.primary }]}>Add Room POIs - {floorLabel}</Text>
      <Text style={[styles.headerSubtitle, { color: colors.secondary, fontWeight: 'bold' }]}>
        {isPathMode
          ? `Path Mode: Select 2 rooms, then tap to add waypoints. 

Tip: Use minimal waypoints for best results. Double tap a waypoint to remove it. Selected: ${selectedRooms.length}/2`
          : 'Tap on the floorplan to add rooms or tap existing markers to edit'}
      </Text>

      {/* Path creation controls */}
      <View style={styles.pathControls}>
        <PathModeButton
          isPathMode={isPathMode}
          onTogglePathMode={onTogglePathMode}
          colors={colors}
        />

        {isPathMode && selectedRooms.length === 2 && (
          <TouchableOpacity
            onPress={onSavePath}
            style={[styles.pathButton, { backgroundColor: colors.primary }]}
          >
            <Text style={{ color: '#FFFFFF' }}>Save Path ({currentPath.length} waypoints)</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  pathControls: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  pathButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default FloorplanHeader;
