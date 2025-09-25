import React, { useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import FloorplanWebView, { FloorplanWebViewRef } from '../atoms/FloorplanWebView';
import FloorplanHeader from '../molecules/FloorplanHeader';
import FloorplanFooter from '../molecules/FloorplanFooter';

const FLOORPLAN_CONTAINER_WIDTH = 360;
const FLOORPLAN_CONTAINER_HEIGHT = 300;

interface FloorplanEditorProps {
  // Header props
  floorLabel: string;
  isPathMode: boolean;
  selectedRooms: string[];
  currentPath: { x: number; y: number }[];
  onTogglePathMode: () => void;
  onSavePath: () => void;

  // WebView props
  imageUri: string;
  isDarkMode: boolean;
  onMessage: (event: { nativeEvent: { data: string } }) => void;

  // Footer props
  roomCount: number;
  pathCount: number;
  selectedPathId: string | null;
  paths: Array<{
    id: string;
    startRoomId: string;
    endRoomId: string;
    distance?: number;
  }>;
  roomMarkers: Array<{ id: string; name: string }>;
  onDeletePath: (pathId: string) => void;
  onDone: () => void;

  // Shared
  colors: {
    background: string;
    text: string;
    border: string;
    primary: string;
    card: string;
  };

  // WebView ref forwarding
  webViewRef?: React.RefObject<FloorplanWebViewRef | null>;
}

const FloorplanEditor: React.FC<FloorplanEditorProps> = ({
  floorLabel,
  isPathMode,
  selectedRooms,
  currentPath,
  onTogglePathMode,
  onSavePath,
  imageUri,
  isDarkMode,
  onMessage,
  roomCount,
  pathCount,
  selectedPathId,
  paths,
  roomMarkers,
  onDeletePath,
  onDone,
  colors,
  webViewRef,
}) => {
  const internalWebViewRef = useRef<FloorplanWebViewRef>(null);
  const activeWebViewRef = webViewRef || internalWebViewRef;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FloorplanHeader
        floorLabel={floorLabel}
        isPathMode={isPathMode}
        selectedRooms={selectedRooms}
        currentPath={currentPath}
        onTogglePathMode={onTogglePathMode}
        onSavePath={onSavePath}
        colors={colors}
      />

      <View style={styles.fixedFloorplanContainer}>
        <FloorplanWebView
          ref={activeWebViewRef}
          imageUri={imageUri}
          isDarkMode={isDarkMode}
          colors={colors}
          onMessage={onMessage}
          containerWidth={FLOORPLAN_CONTAINER_WIDTH}
          containerHeight={FLOORPLAN_CONTAINER_HEIGHT}
        />
      </View>

      <FloorplanFooter
        roomCount={roomCount}
        pathCount={pathCount}
        selectedPathId={selectedPathId}
        paths={paths}
        roomMarkers={roomMarkers}
        onDeletePath={onDeletePath}
        onDone={onDone}
        colors={colors}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fixedFloorplanContainer: {
    width: FLOORPLAN_CONTAINER_WIDTH,
    height: FLOORPLAN_CONTAINER_HEIGHT,
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    marginVertical: 16,
  },
});

export default FloorplanEditor;