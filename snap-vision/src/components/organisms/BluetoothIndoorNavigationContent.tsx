import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import { useBluetoothIndoorNavigation } from '../../hooks/useBluetoothIndoorNavigation';
import SettingsHeader from '../molecules/SettingsHeader';
import Icon from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
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

  // Custom Floor Dropdown state
  const [floorDropdownVisible, setFloorDropdownVisible] = useState(false);

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

      {/* Top bar: custom floor picker and rooms button */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={[
            styles.floorDropdown,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          onPress={() => setFloorDropdownVisible(true)}
        >
          <Text style={[styles.floorDropdownText, { color: colors.text }]}>
            Floor: {roomManager.selectedFloorId}
          </Text>
          <Icon name="chevron-down" size={20} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.roomsButton, { backgroundColor: colors.primary }]}
          onPress={handleShowRoomsList}
        >
          <MaterialIcons name="list" size={16} color="white" />
          <Text style={styles.roomsButtonText}>
            Rooms ({roomManager.roomsOnSelectedFloor.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Custom Floor Dropdown Modal */}
      <Modal
        visible={floorDropdownVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFloorDropdownVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setFloorDropdownVisible(false)}
        >
          <View
            style={[
              styles.dropdownContainer,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Text style={[styles.dropdownTitle, { color: colors.text }]}>Select Floor</Text>
            <FlatList
              data={roomManager.floors}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.dropdownItem,
                    roomManager.selectedFloorId === item && {
                      backgroundColor: colors.primary + '20',
                    },
                  ]}
                  onPress={() => {
                    roomManager.setSelectedFloorId(item);
                    setFloorDropdownVisible(false);
                  }}
                >
                  <Text style={[styles.dropdownItemText, { color: colors.text }]}>{item}</Text>
                  {roomManager.selectedFloorId === item && (
                    <Icon name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

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
            startId={undefined}
            endId={navigationManager.destination?.id}
            routePolyline={navigationManager.routePolyline}
            completedPolyline={navigationManager.completedPolyline}
            onSelectRoom={handleRoomSelect}
            themeColors={colors}
            currentPos={beaconManager.currentPos || undefined}
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  floorDropdown: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 12,
  },
  floorDropdownText: {
    fontSize: 16,
    fontWeight: '600',
  },
  roomsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  roomsButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    width: '80%',
    maxHeight: '50%',
    borderRadius: 12,
    borderWidth: 1,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  dropdownTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  dropdownItemText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default BluetoothIndoorNavigationContent;
