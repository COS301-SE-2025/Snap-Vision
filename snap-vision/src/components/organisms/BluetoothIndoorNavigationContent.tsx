import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import { useBluetoothIndoorNavigation } from '../../hooks/useBluetoothIndoorNavigation';
import SettingsHeader from '../molecules/SettingsHeader';
import NavigationBar from '../molecules/NavigationBar';
import DebugInfoBar from '../molecules/DebugInfoBar';
import POIPopup from '../molecules/POIPopup';
import POIInfoModal from '../molecules/POIInfoModal';
import NavigationInstructionsBar from '../molecules/NavigationInstructionsBar';
import DirectionsModal from '../organisms/DirectionsModal';
import DestinationReachedPopup from '../molecules/DestinationReachedPopup';
import IndoorSchematicMap from '../organisms/IndoorSchematicMap';
import RoomsListOverlay from '../organisms/RoomsListOverlay';

type RootStackParamList = {
  BluetoothIndoorNavigation: {
    buildingId: string;
    buildingName: string;
    locationId: string;
  };
};
type RouteP = RouteProp<RootStackParamList, 'BluetoothIndoorNavigation'>;
type NavP = StackNavigationProp<RootStackParamList, 'BluetoothIndoorNavigation'>;

const BluetoothIndoorNavigationContent: React.FC = () => {
  const navigation = useNavigation<NavP>();
  const route = useRoute<RouteP>();
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const { buildingId, buildingName, locationId } = route.params;

  const {
    roomManager,
    floorplanManager,
    beaconManager,
    navigationManager,
    showRoomsList,
    setShowRoomsList,
    mapSize,
    setMapSize,
    showPOIPopup,
    showPOIInfoModal,
    setShowPOIInfoModal,
    selectedPOI,
    showDirectionsModal,
    setShowDirectionsModal,
    handleRoomSelect,
    handleNavigateHere,
    handleMoreInfo,
    handleClosePOIPopup,
    handleShowRoomsList,
    handleRoomListSelect,
  } = useBluetoothIndoorNavigation({
    buildingId,
    buildingName,
    locationId,
  });

  if (roomManager.loading) {
    return (
      <View style={styles.container}>
        <SettingsHeader title={`${buildingName} - Bluetooth Navigation`} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.secondary }]}>
            Loading building layout...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
                  : 'Waiting for beacon signals…'}
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
    </View>
  );
};

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

export default BluetoothIndoorNavigationContent;
