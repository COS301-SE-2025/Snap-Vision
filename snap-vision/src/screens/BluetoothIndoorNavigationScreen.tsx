
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import SettingsHeader from '../components/molecules/SettingsHeader';
import NavigationBar from '../components/molecules/NavigationBar';
import DebugInfoBar from '../components/molecules/DebugInfoBar';
import POIPopup from '../components/molecules/POIPopup';
import POIInfoModal from '../components/molecules/POIInfoModal';
import IndoorSchematicMap from '../components/organisms/IndoorSchematicMap';
import RoomsListOverlay from '../components/organisms/RoomsListOverlay';
import { useRoomManager, RoomPOI } from '../hooks/useRoomManager';
import { useFloorplanManager } from '../hooks/useFloorplanManager';
import { useBeaconManager } from '../hooks/useBeaconManager';

type RootStackParamList = {
  BluetoothIndoorNavigation: {
    buildingId: string;
    buildingName: string;
    locationId: string;
  };
};
type RouteP = RouteProp<RootStackParamList, 'BluetoothIndoorNavigation'>;
type NavP = StackNavigationProp<RootStackParamList, 'BluetoothIndoorNavigation'>;

export default function BluetoothIndoorNavigationScreen() {
  const navigation = useNavigation<NavP>();
  const route = useRoute<RouteP>();
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const { buildingId, buildingName, locationId } = route.params;

  const [showRoomsList, setShowRoomsList] = useState(false);
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  
  // POI popup state
  const [showPOIPopup, setShowPOIPopup] = useState(false);
  const [showPOIInfoModal, setShowPOIInfoModal] = useState(false);
  const [selectedPOI, setSelectedPOI] = useState<RoomPOI | null>(null);

  // Custom hooks for managing different aspects
  const roomManager = useRoomManager({ locationId, buildingId });
  const floorplanManager = useFloorplanManager({
    locationId,
    buildingId,
    selectedFloorId: roomManager.selectedFloorId,
  });
  const beaconManager = useBeaconManager({
    locationId,
    buildingId,
    selectedFloorId: roomManager.selectedFloorId,
  });

  const dotPx = useMemo(() => {
    if (!beaconManager.currentPos || !mapSize.width || !mapSize.height) return null;
    return {
      left: beaconManager.currentPos.x * mapSize.width,
      top: beaconManager.currentPos.y * mapSize.height,
    };
  }, [beaconManager.currentPos, mapSize]);

  const handleRoomSelect = (roomId: string) => {
    const room = roomManager.allRooms.find(r => r.id === roomId);
    if (room) {
      setSelectedPOI(room);
      setShowPOIPopup(true);
      // Don't set as selectedRoom to avoid destination color
    }
  };

  const handleNavigateHere = () => {
    if (selectedPOI) {
      console.log('Navigate to:', selectedPOI.name);
      // TODO: Implement navigation logic
      setShowPOIPopup(false);
    }
  };

  const handleMoreInfo = () => {
    setShowPOIPopup(false);
    setShowPOIInfoModal(true);
  };

  const handleClosePOIPopup = () => {
    setShowPOIPopup(false);
    setSelectedPOI(null);
  };

  const handleShowRoomsList = () => {
    setShowRoomsList(true);
  };

  const handleRoomListSelect = (room: any) => {
    // Don't set as selectedRoom to avoid destination color
    setSelectedPOI(room);
    setShowPOIPopup(true);
    setShowRoomsList(false); // Close the rooms list
  };

  if (roomManager.loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <SettingsHeader title={`${buildingName} - Bluetooth Navigation`} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.secondary }]}>
            Loading building layout...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title={`${buildingName} - Bluetooth Navigation`} />

      <NavigationBar
        floors={roomManager.floors}
        selectedFloorId={roomManager.selectedFloorId}
        onFloorChange={roomManager.setSelectedFloorId}
        roomCount={roomManager.roomsOnSelectedFloor.length}
        onShowRoomsList={handleShowRoomsList}
        themeColors={colors}
      />

      <DebugInfoBar
        isRunning={beaconManager.isRunning}
        beaconCount={beaconManager.floorBeacons.length}
        hookBeaconCount={beaconManager.beacons?.length ?? 0}
        hasPosition={!!beaconManager.currentPos}
        isVisible={beaconManager.visible}
        currentPos={beaconManager.currentPos}
        themeColors={colors}
      />

      <View style={{ flex: 1 }}>
        {floorplanManager.floorplanLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
        <View
          style={{ flex: 1 }}
          onLayout={(e) =>
            setMapSize({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })
          }
        >
          <IndoorSchematicMap
            rooms={roomManager.roomsOnSelectedFloor}
            startId={undefined} // Don't highlight any POI with destination color
            endId={undefined}
            routePolyline={[]}
            completedPolyline={[]}
            onSelectRoom={handleRoomSelect}
            themeColors={colors}
            currentPos={beaconManager.currentPos}
            floorplanUrl={floorplanManager.floorplanUrl || undefined}
          />
          {!beaconManager.visible && (
            <View
              style={{
                position: 'absolute',
                bottom: 8,
                left: 8,
                right: 8,
                alignItems: 'center',
                paddingVertical: 6,
                borderRadius: 12,
                backgroundColor: colors.card,
              }}
            >
              <Text style={{ color: colors.secondary, fontSize: 12 }}>
                Waiting for beacon signals…
              </Text>
            </View>
          )}
        </View>
      </View>

      <RoomsListOverlay
        visible={showRoomsList}
        rooms={roomManager.roomsOnSelectedFloor}
        onClose={() => setShowRoomsList(false)}
        onSelectRoom={handleRoomListSelect}
        themeColors={colors}
      />

      {showPOIPopup && selectedPOI && (
        <POIPopup
          visible={showPOIPopup}
          poi={selectedPOI}
          onClose={handleClosePOIPopup}
          onNavigate={handleNavigateHere}
          onMoreInfo={handleMoreInfo}
          themeColors={colors}
        />
      )}

      <POIInfoModal
        visible={showPOIInfoModal}
        poi={selectedPOI}
        onClose={() => setShowPOIInfoModal(false)}
        themeColors={colors}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 16, fontSize: 16 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
  },
});
