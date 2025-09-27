import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AppButton from '../atoms/AppButton';
import FloorplanWebView, { FloorplanWebViewRef } from '../atoms/FloorplanWebView';
import FloorplanEditor from '../organisms/FloorplanEditor';
import RoomDetailsModal from '../molecules/RoomDetailsModal';
import StandardPopup from '../atoms/StandardPopup';
import SettingsHeader from '../molecules/SettingsHeader';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import { useRoomManagement } from '../../hooks/useRoomManagement';
import { usePathManagement } from '../../hooks/usePathManagement';
import { useWebViewMessaging } from '../../hooks/useWebViewMessaging';
import { generatePathSVG } from '../../utils/pathUtils';
import type { StackNavigationProp } from '@react-navigation/stack';

type FloorplanEditorScreenRouteParams = {
  locationId: string;
  buildingId: string;
  floorLabel: string;
  imageUri: string;
};

export default function AdminFloorplanEditorContent() {
  const route = useRoute<RouteProp<{ params: FloorplanEditorScreenRouteParams }, 'params'>>();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const isDarkMode = isDark;

  const webViewRef = useRef<FloorplanWebViewRef>(null);

  // Error/Success handling
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  const { buildingId, floorLabel, imageUri, locationId } = route.params;

  const handleError = useCallback((message: string) => {
    setErrorMessage(message);
    setShowErrorPopup(true);
  }, []);

  const handleSuccess = useCallback((message: string) => {
    setSuccessMessage(message);
    setShowSuccessPopup(true);
  }, []);

  // Use custom hooks
  const roomManagement = useRoomManagement({
    locationId,
    buildingId,
    floorLabel,
    onError: handleError,
    onSuccess: handleSuccess,
  });

  const pathManagement = usePathManagement({
    locationId,
    buildingId,
    floorLabel,
    onError: handleError,
    onSuccess: handleSuccess,
  });

  const webViewMessaging = useWebViewMessaging({
    isPathMode: pathManagement.isPathMode,
    onCreateRoom: roomManagement.startCreateRoom,
    onEditRoom: roomManagement.startEditRoom,
    onRoomsSelected: pathManagement.setSelectedRooms,
    onWaypointAdded: pathManagement.setCurrentPath,
    onWaypointRemoved: pathManagement.setCurrentPath,
    onSelectPath: (pathId) => pathManagement.handleSelectPath(pathId, webViewRef, colors),
  });

  // Load data on mount
  useEffect(() => {
    if (!route.params || !buildingId || !floorLabel) return;

    roomManagement.loadRoomPOIs().then((markers) => {
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
    });
  }, [buildingId, floorLabel, route.params, locationId]);

  useEffect(() => {
    if (!route.params || !buildingId || !floorLabel) return;

    pathManagement.loadPaths().then((paths) => {
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
    });
  }, [buildingId, floorLabel, route.params, locationId]);

  // Delete confirmations
  const confirmDelete = () => {
    setShowDeleteConfirmation(true);
  };

  const handleDeleteConfirm = () => {
    setShowDeleteConfirmation(false);
    roomManagement.deleteRoomPOI(webViewRef);
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title={`Edit ${floorLabel} Floorplan`} />

      <FloorplanEditor
        floorLabel={floorLabel}
        isPathMode={pathManagement.isPathMode}
        selectedRooms={pathManagement.selectedRooms}
        currentPath={pathManagement.currentPath}
        onTogglePathMode={() => pathManagement.togglePathMode(webViewRef)}
        onSavePath={() => pathManagement.savePath(roomManagement.roomMarkers, webViewRef)}
        imageUri={imageUri}
        isDarkMode={isDarkMode}
        onMessage={webViewMessaging.handleMessage}
        roomCount={roomManagement.roomMarkers.length}
        pathCount={pathManagement.pathMarkers.length}
        selectedPathId={pathManagement.selectedPathId}
        paths={pathManagement.pathMarkers}
        roomMarkers={roomManagement.roomMarkers}
        onDeletePath={(pathId) => pathManagement.deletePathById(pathId, webViewRef)}
        onDone={() => {}}
        colors={colors}
        webViewRef={webViewRef}
      />

      {/* Modal for room details */}
      <RoomDetailsModal
        isVisible={roomManagement.isModalVisible}
        isEditing={roomManagement.isEditing}
        roomData={roomManagement.roomData}
        onRoomDataChange={roomManagement.setRoomData}
        onCancel={() => roomManagement.setIsModalVisible(false)}
        onSave={() => roomManagement.saveRoomPOI(webViewRef)}
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
        message={`Are you sure you want to delete ${roomManagement.roomData.name}?`}
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
});
