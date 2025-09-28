import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import PathDeletionModal, { PathItem } from '../molecules/PathDeletionModal';

interface FloorplanFooterProps {
  roomCount: number;
  pathCount: number;
  selectedPathId: string | null;
  paths: PathItem[];
  roomMarkers: Array<{ id: string; name: string }>;
  onDeletePath: (pathId: string) => void;
  onDone: () => void;
  colors: {
    text: string;
    border: string;
    primary: string;
    background: string;
    card: string;
  };
}

const FloorplanFooter: React.FC<FloorplanFooterProps> = ({
  roomCount,
  pathCount,
  selectedPathId,
  paths,
  roomMarkers,
  onDeletePath,
  onDone,
  colors,
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Enhance paths with room names for better display
  const enhancedPaths = paths.map((path) => ({
    ...path,
    startRoomName: roomMarkers.find((room) => room.id === path.startRoomId)?.name,
    endRoomName: roomMarkers.find((room) => room.id === path.endRoomId)?.name,
  }));

  return (
    <>
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Text style={[styles.footerText, { color: colors.text }]}>
          {roomCount} rooms • {pathCount} paths
          {selectedPathId && (
            <Text style={{ color: '#FF9800', marginLeft: 12 }}> Selected Path</Text>
          )}
        </Text>

        <View style={styles.buttonContainer}>
          {pathCount > 0 && (
            <TouchableOpacity
              onPress={() => setShowDeleteModal(true)}
              style={[styles.actionButton, { backgroundColor: '#D32F2F' }]}
            >
              <Text style={styles.actionButtonText}>Delete Paths</Text>
            </TouchableOpacity>
          )}
          {/* <TouchableOpacity
            onPress={onDone}
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.actionButtonText}>Done</Text>
          </TouchableOpacity> */}
        </View>
      </View>

      <PathDeletionModal
        visible={showDeleteModal}
        paths={enhancedPaths}
        onClose={() => setShowDeleteModal(false)}
        onDeletePath={onDeletePath}
        colors={colors}
      />
    </>
  );
};

const styles = StyleSheet.create({
  footer: {
    padding: 16,
    flexDirection: 'column',
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    minWidth: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    maxWidth: 150,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  deleteButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
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
