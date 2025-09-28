import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AppSecondaryButton from '../atoms/AppSecondaryButton';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import { FloorplanMeta } from '../../types/floorplan.types';

interface FloorplanActionsProps {
  selectedFloorplan: FloorplanMeta;
  onEdit: () => void;
  onDelete: () => void;
}

export const FloorplanActions: React.FC<FloorplanActionsProps> = ({
  selectedFloorplan,
  onEdit,
  onDelete,
}) => {
  const { theme, isDark } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <View style={styles.sectionContainer}>
      <Text style={{ color: colors.text }}>
        <Text style={{ fontWeight: 'bold' }}>Floor Label: </Text>
        {selectedFloorplan.floorLabel}
      </Text>
      <Text style={{ color: colors.text }}>
        <Text style={{ fontWeight: 'bold' }}>Last Modified: </Text>
        {new Date(selectedFloorplan.timestamp).toLocaleString()}
      </Text>
      <AppSecondaryButton title="Edit Room POIs" onPress={onEdit} style={{ marginTop: 16 }} />
      <AppSecondaryButton title="Delete Floorplan" onPress={onDelete} style={{ marginTop: 12 }} />
    </View>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 8,
  },
});
