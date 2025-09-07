import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface FloorplanFooterProps {
  roomCount: number;
  pathCount: number;
  selectedPathId: string | null;
  onDeletePath: () => void;
  onDone: () => void;
  colors: {
    text: string;
    border: string;
    primary: string;
  };
}

const FloorplanFooter: React.FC<FloorplanFooterProps> = ({
  roomCount,
  pathCount,
  selectedPathId,
  onDeletePath,
  onDone,
  colors,
}) => {
  return (
    <View style={[styles.footer, { borderTopColor: colors.border }]}>
      <Text style={[styles.footerText, { color: colors.text }]}>
        {roomCount} rooms • {pathCount} paths
        {selectedPathId && (
          <Text style={{ color: '#FF9800', marginLeft: 12 }}> Selected Path</Text>
        )}
      </Text>
      {selectedPathId && (
        <TouchableOpacity
          onPress={onDeletePath}
          style={[styles.doneButton, { backgroundColor: '#D32F2F', marginRight: 8 }]}
        >
          <Text style={styles.doneButtonText}>Delete Path</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        onPress={onDone}
        style={[styles.doneButton, { backgroundColor: colors.primary }]}
      >
        <Text style={styles.doneButtonText}>Done</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  footer: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 16,
  },
  doneButton: {
    paddingHorizontal: 40,
    paddingVertical: 15,
    minWidth: 140,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  doneButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default FloorplanFooter;
