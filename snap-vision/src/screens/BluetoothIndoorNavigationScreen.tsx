
import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import BluetoothIndoorNavigationContent from '../components/organisms/BluetoothIndoorNavigationContent';

export default function BluetoothIndoorNavigationScreen() {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const { buildingId, buildingName, locationId } = route.params;

  const [showRoomsList, setShowRoomsList] = useState(false);
  const [mapSize, setMapSize] = useState({ width: 0, height: 0 });
  
  // POI popup state
  const [showPOIPopup, setShowPOIPopup] = useState(false);
  const [showPOIInfoModal, setShowPOIInfoModal] = useState(false);
  const [selectedPOI, setSelectedPOI] = useState<RoomPOI | null>(null);

  // Navigation state
  const [showDirectionsModal, setShowDirectionsModal] = useState(false);

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
  const navigationManager = useNavigationManager({
    locationId,
    buildingId,
    currentPosition: beaconManager.currentPos,
    allRooms: roomManager.allRooms,
  });

  // Debug navigation manager state
  console.log('[SCREEN] Navigation manager state:', {
    isNavigating: navigationManager.isNavigating,
    destination: navigationManager.destination?.name,
    stepsCount: navigationManager.steps.length,
    pathPOIsLoaded: navigationManager.pathPOIsLoaded,
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

  const handleNavigateHere = async () => {
    console.log('[SCREEN] handleNavigateHere called');
    console.log('[SCREEN] selectedPOI:', selectedPOI);
    console.log('[SCREEN] Navigation manager isNavigating:', navigationManager.isNavigating);
    
    if (selectedPOI) {
      console.log('Starting navigation to:', selectedPOI.name);
      const success = await navigationManager.startNavigation(selectedPOI);
      console.log('[SCREEN] Navigation start result:', success);
      
      if (success) {
        console.log('[SCREEN] Navigation started successfully, closing popup');
        setShowPOIPopup(false);
        // Optionally show directions modal
        // setShowDirectionsModal(true);
      } else {
        console.warn('Failed to start navigation');
        // Could show an error message here
      }
    } else {
      console.warn('[SCREEN] No selectedPOI available');
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
            endId={navigationManager.destination?.id} // Highlight destination when navigating
            routePolyline={navigationManager.routePolyline}
            completedPolyline={navigationManager.completedPolyline}
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
                {beaconManager.isRunning 
                  ? 'Improving location accuracy...' 
                  : 'Waiting for beacon signals…'
                }
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

      <NavigationInstructionsBar
        visible={navigationManager.isNavigating}
        currentStep={navigationManager.steps[navigationManager.currentStep] || null}
        stepNumber={navigationManager.currentStep}
        totalSteps={navigationManager.steps.length}
        destination={navigationManager.destination?.name || ''}
        onShowAllDirections={() => setShowDirectionsModal(true)}
        onStopNavigation={navigationManager.stopNavigation}
        themeColors={colors}
      />

      <DirectionsModal
        visible={showDirectionsModal}
        onClose={() => setShowDirectionsModal(false)}
        onStart={() => {}} // Already started
        destination={navigationManager.destination?.name || ''}
        steps={navigationManager.steps}
        currentStep={navigationManager.currentStep}
        isNavigating={navigationManager.isNavigating}
      />

      <DestinationReachedPopup
        visible={navigationManager.destinationReached}
        destination={navigationManager.destination?.name || ''}
        onClose={navigationManager.handleDestinationReachedClose}
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
});
