import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AppButton from '../atoms/AppButton';
import FloorplanWebView, { FloorplanWebViewRef } from '../atoms/FloorplanWebView';
import FloorplanHeader from '../molecules/FloorplanHeader';
import RoomDetailsModal from '../molecules/RoomDetailsModal';
import StandardPopup from '../atoms/StandardPopup';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import firestore from '@react-native-firebase/firestore';
import type { StackNavigationProp } from '@react-navigation/stack';

const FLOORPLAN_CONTAINER_WIDTH = 360;
const FLOORPLAN_CONTAINER_HEIGHT = 300;

type FloorplanEditorScreenRouteParams = {
  locationId: string;
  buildingId: string;
  floorLabel: string;
  imageUri: string;
};

interface RoomPOI {
  id: string;
  name: string;
  buildingId: string;
  floorId: string;
  coordinates: { x: number; y: number };
  type: string;
  description: string | null;
  isEntrance?: boolean;
  connectorGroupId?: string;
}

interface PathPOI {
  id: string;
  buildingId: string;
  floorId: string;
  startRoomId: string;
  endRoomId: string;
  waypoints: { x: number; y: number }[];
  distance: number;
  accessible: boolean;
  createdAt: string;
}

type Point = { x: number; y: number } | null;

export default function AdminFloorplanEditorContent() {
  const route = useRoute<RouteProp<{ params: FloorplanEditorScreenRouteParams }, 'params'>>();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const isDarkMode = isDark;

  const webViewRef = useRef<FloorplanWebViewRef>(null);
  const [roomMarkers, setRoomMarkers] = useState<RoomPOI[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentPoint, setCurrentPoint] = useState<Point>(null);
  const [roomData, setRoomData] = useState({
    name: '',
    type: 'classroom',
    description: '',
    isEntrance: false,
    connectorGroupId: '',
  });
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [pathMarkers, setPathMarkers] = useState<PathPOI[]>([]);
  const [isPathMode, setIsPathMode] = useState(false);
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([]);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);

  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  const { buildingId, floorLabel, imageUri, locationId } = route.params;

  useEffect(() => {
    if (!route.params || !buildingId || !floorLabel) {
      return;
    }

    const loadRoomPOIs = async () => {
      try {
        const snapshot = await firestore()
          .collection(`locations/${locationId}/roomPOIs`)
          .where('buildingId', '==', buildingId)
          .where('floorId', '==', floorLabel)
          .get();

        const markers = snapshot.docs.map((doc) => ({
          ...(doc.data() as RoomPOI),
        }));
        setRoomMarkers(markers as RoomPOI[]);

        if (markers.length > 0) {
          setTimeout(() => {
            markers.forEach((marker) => {
              webViewRef.current?.injectJavaScript(`
                addMarker("${marker.id}", ${marker.coordinates.x}, ${marker.coordinates.y}, "${marker.name}");
                true;
              `);
            });
          }, 1000);
        }
      } catch (error) {
        console.error('Error loading room POIs:', error);
      }
    };

    loadRoomPOIs();
  }, [buildingId, floorLabel, route.params, locationId]);

  useEffect(() => {
    if (!route.params || !buildingId || !floorLabel) return;

    const loadPaths = async () => {
      try {
        const snapshot = await firestore()
          .collection(`locations/${locationId}/pathPOIs`)
          .where('buildingId', '==', buildingId)
          .where('floorId', '==', floorLabel)
          .get();

        const paths = snapshot.docs.map((doc) => ({
          ...(doc.data() as PathPOI),
        }));
        setPathMarkers(paths);

        if (paths.length > 0) {
          setTimeout(() => {
            const pathData = paths.map((path) => ({
              id: path.id,
              d: generatePathSVG(path.waypoints),
            }));
            webViewRef.current?.injectJavaScript(`
              window.drawPaths && window.drawPaths(${JSON.stringify(pathData)});
              true;
            `);
          }, 1000);
        }
      } catch (error) {
        console.error('Error loading paths:', error);
      }
    };

    loadPaths();
  }, [buildingId, floorLabel, route.params, locationId]);

  const handleSelectPath = (pathId: string) => {
    setSelectedPathId(pathId);
    webViewRef.current?.injectJavaScript(`
    document.querySelectorAll('.path-line').forEach(p => {
      p.setAttribute('stroke', p.getAttribute('data-path-id') === '${pathId}' ? '#FF9800' : '${colors.primary}');
      p.setAttribute('opacity', p.getAttribute('data-path-id') === '${pathId}' ? '1' : '0.8');
      p.setAttribute('stroke-width', p.getAttribute('data-path-id') === '${pathId}' ? '2.5' : '1');
    });
    true;
  `);
  };

  const deleteSelectedPath = async () => {
    if (!selectedPathId) return;
    try {
      await firestore().collection(`locations/${locationId}/pathPOIs`).doc(selectedPathId).delete();
      setPathMarkers(pathMarkers.filter((p) => p.id !== selectedPathId));
      setSelectedPathId(null);
      webViewRef.current?.injectJavaScript(`
      document.querySelectorAll('.path-line[data-path-id="${selectedPathId}"]').forEach(p => p.remove());
      true;
    `);
      setSuccessMessage('Path deleted successfully');
      setShowSuccessPopup(true);
    } catch (error) {
      setErrorMessage('Failed to delete path');
      setShowErrorPopup(true);
    }
  };

  const generatePathSVG = (waypoints: { x: number; y: number }[]) => {
    if (waypoints.length < 2) return '';

    let pathString = `M ${waypoints[0].x * 100} ${waypoints[0].y * 100}`;
    for (let i = 1; i < waypoints.length; i++) {
      pathString += ` L ${waypoints[i].x * 100} ${waypoints[i].y * 100}`;
    }
    return pathString;
  };

  const calculatePathDistance = (waypoints: { x: number; y: number }[]) => {
    let totalDistance = 0;
    for (let i = 1; i < waypoints.length; i++) {
      const dx = waypoints[i].x - waypoints[i - 1].x;
      const dy = waypoints[i].y - waypoints[i - 1].y;
      totalDistance += Math.sqrt(dx * dx + dy * dy);
    }
    return totalDistance;
  };

  const togglePathMode = () => {
    const newPathMode = !isPathMode;
    setIsPathMode(newPathMode);
    setSelectedRooms([]);
    setCurrentPath([]);

    webViewRef.current?.injectJavaScript(`
      window.togglePathMode && window.togglePathMode(${newPathMode});
      true;
    `);
  };

  const savePath = async () => {
    if (selectedRooms.length !== 2 || currentPath.length < 2) {
      setErrorMessage('Please select two rooms and add waypoints to create a path');
      setShowErrorPopup(true);
      return;
    }

    try {
      const pathId = `path_${buildingId.replace(/\//g, '_')}_${floorLabel.replace(/\s/g, '_')}_${Date.now()}`;

      const startRoom = roomMarkers.find((r) => r.id === selectedRooms[0]);
      const endRoom = roomMarkers.find((r) => r.id === selectedRooms[1]);

      if (!startRoom || !endRoom) {
        setErrorMessage('Selected rooms not found');
        setShowErrorPopup(true);
        return;
      }

      const waypoints = [startRoom.coordinates, ...currentPath, endRoom.coordinates];

      const pathPOI: PathPOI = {
        id: pathId,
        buildingId: buildingId,
        floorId: floorLabel,
        startRoomId: selectedRooms[0],
        endRoomId: selectedRooms[1],
        waypoints: waypoints,
        distance: calculatePathDistance(waypoints),
        accessible: true,
        createdAt: new Date().toISOString(),
      };

      await firestore().collection(`locations/${locationId}/pathPOIs`).doc(pathId).set(pathPOI);

      setPathMarkers([...pathMarkers, pathPOI]);

      const pathData = {
        id: pathId,
        d: generatePathSVG(waypoints),
      };

      webViewRef.current?.injectJavaScript(`
        window.drawSinglePath && window.drawSinglePath(${JSON.stringify(pathData)});
        true;
      `);

      setIsPathMode(false);
      setSelectedRooms([]);
      setCurrentPath([]);

      webViewRef.current?.injectJavaScript(`
        window.togglePathMode && window.togglePathMode(false);
        true;
      `);

      setSuccessMessage('Path created successfully');
      setShowSuccessPopup(true);
    } catch (error) {
      console.error('Error saving path:', error);
      setErrorMessage('Failed to save path');
      setShowErrorPopup(true);
    }
  };

  if (!route.params) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
          backgroundColor: colors.background,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20, color: colors.text }}>
          Missing floorplan information
        </Text>
        <Text style={{ textAlign: 'center', marginBottom: 20, color: colors.text }}>
          Please select a floorplan from the edit screen or make sure you&apos;ve initialized the
          pre-bundled floorplans.
        </Text>
        <AppButton
          title="Go Back"
          onPress={() => navigation.goBack()}
          style={{ backgroundColor: colors.primary }}
        />
      </View>
    );
  }

  if (!buildingId || !floorLabel || !imageUri) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
          backgroundColor: colors.background,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20, color: colors.text }}>
          Incomplete floorplan data
        </Text>
        <Text style={{ textAlign: 'center', marginBottom: 20, color: colors.text }}>
          {!buildingId ? 'Missing building ID. ' : ''}
          {!floorLabel ? 'Missing floor label. ' : ''}
          {!imageUri ? 'Missing image URI. ' : ''}
          Please go back and try again.
        </Text>
        <AppButton
          title="Go Back"
          onPress={() => navigation.goBack()}
          style={{ backgroundColor: colors.primary }}
        />
      </View>
    );
  }

  // Handle messages from WebView
  const handleMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'add_marker') {
        if (isPathMode && selectedRooms.length === 2) {
          // Add waypoint in path mode (handled in WebView)
          return;
        } else {
          // Regular room marker creation
          setCurrentPoint({ x: data.x, y: data.y });
          setIsEditing(false);
          setEditingRoomId(null);
          setRoomData({
            name: '',
            type: 'classroom',
            description: '',
            isEntrance: false,
            connectorGroupId: '',
          });
          setIsModalVisible(true);
        }
      } else if (data.type === 'edit_marker') {
        if (isPathMode) {
          // Room selection for path creation (handled in WebView)
          return;
        } else {
          // Regular room editing
          const roomToEdit = roomMarkers.find((room) => room.id === data.id);
          if (roomToEdit) {
            setEditingRoomId(data.id);
            setIsEditing(true);
            setCurrentPoint(roomToEdit.coordinates);
            setRoomData({
              name: roomToEdit.name,
              type: roomToEdit.type,
              description: roomToEdit.description || '',
              isEntrance: !!roomToEdit.isEntrance,
              connectorGroupId: roomToEdit.connectorGroupId || '',
            });
            setIsModalVisible(true);
          }
        }
      } else if (data.type === 'rooms_selected') {
        setSelectedRooms(data.selectedRooms);
      } else if (data.type === 'waypoint_added') {
        setCurrentPath(data.currentPath);
      } else if (data.type === 'waypoint_removed') {
        setCurrentPath(data.currentPath);
      } else if (data.type === 'select_path') {
        handleSelectPath(data.pathId);
      }
    } catch (e) {
      console.error('Error parsing WebView message:', e);
    }
  };

  // Save or update room POI
  const saveRoomPOI = async () => {
    if (!roomData.name.trim()) {
      setErrorMessage('Room name is required');
      setShowErrorPopup(true);
      return;
    }
    if (!currentPoint) {
      setErrorMessage('No location selected for the room.');
      setShowErrorPopup(true);
      return;
    }

    try {
      let roomId = editingRoomId;

      if (!isEditing) {
        // Create a new room POI
        roomId = `room_${buildingId.replace(/\//g, '_')}_${floorLabel.replace(/\s/g, '_')}_${Date.now()}`;
      }

      // Create/update room POI object
      const roomPOI = {
        id: roomId as string,
        name: roomData.name,
        buildingId: buildingId,
        floorId: floorLabel,
        coordinates: {
          x: currentPoint.x,
          y: currentPoint.y,
        },
        type: roomData.type,
        description: roomData.description || null,
        isEntrance: !!roomData.isEntrance, // NEW
        connectorGroupId: roomData.connectorGroupId || '',
      };

      // Save to Firestore
      await firestore()
        .collection(`locations/${locationId}/roomPOIs`)
        .doc(roomId as string)
        .set(roomPOI);

      // Update local state
      if (isEditing) {
        // Replace the edited room in the array
        setRoomMarkers(roomMarkers.map((room) => (room.id === roomId ? roomPOI : room)));
      } else {
        // Add the new room to the array
        setRoomMarkers([...roomMarkers, roomPOI]);
      }

      // Add/update marker on WebView
      webViewRef.current?.injectJavaScript(`
        addMarker("${roomId}", ${currentPoint.x}, ${currentPoint.y}, "${roomData.name}");
        true;
      `);

      // Reset form
      setRoomData({
        name: '',
        type: 'classroom',
        description: '',
        isEntrance: false,
        connectorGroupId: '',
      });
      setIsEditing(false);
      setEditingRoomId(null);
      setIsModalVisible(false);
    } catch (error) {
      console.error('Error saving room POI:', error);
      setErrorMessage('Failed to save room POI');
      setShowErrorPopup(true);
    }
  };

  // Delete room POI
  const deleteRoomPOI = async () => {
    if (!editingRoomId) {
      console.error('No room selected for deletion');
      return;
    }

    try {
      await firestore().collection(`locations/${locationId}/roomPOIs`).doc(editingRoomId).delete();

      // Remove from local state
      setRoomMarkers(roomMarkers.filter((room) => room.id !== editingRoomId));

      // Remove marker from WebView
      webViewRef.current?.injectJavaScript(`
        const markerToRemove = document.getElementById('marker-${editingRoomId}');
        if (markerToRemove) {
          markerToRemove.remove();
        }
        true;
      `);

      // Reset form and close modal
      setRoomData({
        name: '',
        type: 'classroom',
        description: '',
        isEntrance: false,
        connectorGroupId: '',
      });
      setIsEditing(false);
      setEditingRoomId(null);
      setIsModalVisible(false);
    } catch (error) {
      console.error('Error deleting room POI:', error);
      setErrorMessage('Failed to delete room POI');
      setShowErrorPopup(true);
    }
  };

  // Show delete confirmation
  const confirmDelete = () => {
    setShowDeleteConfirmation(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    setShowDeleteConfirmation(false);
    deleteRoomPOI();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FloorplanHeader
        floorLabel={floorLabel}
        isPathMode={isPathMode}
        selectedRooms={selectedRooms}
        currentPath={currentPath}
        onTogglePathMode={togglePathMode}
        onSavePath={savePath}
        colors={colors}
      />

      <View style={styles.fixedFloorplanContainer}>
        <FloorplanWebView
          ref={webViewRef}
          imageUri={imageUri}
          isDarkMode={isDarkMode}
          colors={colors}
          onMessage={handleMessage}
          containerWidth={FLOORPLAN_CONTAINER_WIDTH}
          containerHeight={FLOORPLAN_CONTAINER_HEIGHT}
        />
      </View>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Text style={[styles.footerText, { color: colors.text }]}>
          {roomMarkers.length} rooms • {pathMarkers.length} paths
          {selectedPathId && (
            <Text style={{ color: '#FF9800', marginLeft: 12 }}> Selected Path</Text>
          )}
        </Text>
        {selectedPathId && (
          <TouchableOpacity
            onPress={deleteSelectedPath}
            style={[styles.doneButton, { backgroundColor: '#D32F2F', marginRight: 8 }]}
          >
            <Text style={styles.doneButtonText}>Delete Path</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.doneButton, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>

      {/* Modal for room details */}
      <RoomDetailsModal
        isVisible={isModalVisible}
        isEditing={isEditing}
        roomData={roomData}
        onRoomDataChange={setRoomData}
        onCancel={() => setIsModalVisible(false)}
        onSave={saveRoomPOI}
        onDelete={confirmDelete}
        colors={colors}
      />

      {/* Error Popup */}
      <StandardPopup
        visible={showErrorPopup}
        title="Error"
        message={errorMessage}
        onConfirm={() => setShowErrorPopup(false)}
        confirmText="OK"
        showCancel={false}
      />

      {/* Success Popup */}
      <StandardPopup
        visible={showSuccessPopup}
        title="Success"
        message={successMessage}
        onConfirm={() => setShowSuccessPopup(false)}
        confirmText="OK"
        showCancel={false}
      />

      {/* Delete Confirmation Popup */}
      <StandardPopup
        visible={showDeleteConfirmation}
        title="Delete Room"
        message={`Are you sure you want to delete ${roomData.name}?`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteConfirmation(false)}
        confirmText="Delete"
        cancelText="Cancel"
        showCancel={true}
      />
    </View>
  );
}

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
