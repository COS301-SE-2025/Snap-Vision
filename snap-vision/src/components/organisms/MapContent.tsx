import React from 'react';
import { View, Text, TouchableOpacity, Pressable } from 'react-native';
import { WebView as WebViewType } from 'react-native-webview';
import { useNavigation } from '@react-navigation/native';
import MapWebView from './MapWebView';
import AdminPOIModal from '../molecules/AdminPOIModal';
import AdminActionsModal from '../molecules/AdminActionsModal';
import StatusOverlay from '../atoms/StatusOverlay';
import StandardPopup from '../atoms/StandardPopup';
import DestinationSearch from '../molecules/DestinationSearch';
import MapActionsPanel from './MapActionsPanel';
import NavigationPanel from './NavigationPanel';
import DirectionsModal from './DirectionsModal';
import CrowdReportModal from '../molecules/CrowdReportModal';
import IndoorPickerModal from '../molecules/IndoorPickerModal';
import IndoorNavigationButton from '../atoms/IndoorNavigationButton';
import ARNavigationOverlay from './ARNavigationOverlay';
import { useNotificationInstruction } from '../../hooks/useNotificationInstruction';
import BluetoothNavigationButton from '../molecules/BluetoothNavigationButton';
import { useTimetableNavigation } from '../hooks/useTimetableNavigation';

// Define the props interface for MapContent
interface MapContentProps {
  // Theme and styling
  colors: any;
  isDark: boolean;

  // WebView ref - Allow null in ref
  webViewRef: React.RefObject<WebViewType | null>;
  onWebViewMessage: (event: any) => void;

  // Location data
  currentLocation: any;
  isRefreshingLocation: boolean;
  onRefreshLocation: () => void;

  // Navigation state
  isNavigating: boolean;
  destination: string;
  destinationCoords: [number, number] | null;
  steps: any[];
  currentStep: number;
  routeProgress: number;
  distanceToDestination: number | null;
  distanceWalked: number;
  originalRouteDistance: number | null;
  estimatedTime: string | null; // Keep as string to match your hook
  isRouteLoading: boolean;
  routeCoordinates: any[];
  showDirectionsSheet: boolean;
  onSetShowDirectionsSheet: (show: boolean) => void;
  onStartNavigation: () => void;
  onStopNavigation: () => void;
  onCancelRoute: () => void;

  // Voice and AR
  isVoiceEnabled: boolean;
  onToggleVoice: () => void;
  showAR: boolean;
  onToggleAR: () => void;
  deviceHeading: number;
  isNavigationMinimized: boolean;
  onToggleMinimize: () => void;
  onSpeakingChange: (speaking: boolean) => void;

  // POI and search
  poiSuggestions: any[];
  pois: any[];
  selectedPOI: any;
  selectedFeature: any;
  onDestinationChange: (text: string) => void;
  onDestinationSearch: () => void;
  onSelectPOI: (poi: any) => void;

  // Bluetooth navigation
  onOpenBluetoothNavigation: () => void;

  // Admin functionality - Fixed types to match hooks
  isAdmin: boolean;
  showAddPOIModal: boolean;
  showEditPOIModal: boolean;
  showAdminActions: boolean;
  adminActionPOI: any;
  editingPOI: any;
  buildingName: string;
  numberOfFloors: string; // Changed to string to match your hook
  newName: string;
  newFloors: string; // Changed to string to match your hook
  selectedLocation: string;
  availableLocations: any[];
  onSetShowAddPOIModal: (show: boolean) => void;
  onSetShowEditPOIModal: (show: boolean) => void;
  onSetShowAdminActions: (show: boolean) => void;
  onSetBuildingName: (name: string) => void;
  onSetNumberOfFloors: (floors: string) => void; // Changed to string
  onSetNewName: (name: string) => void;
  onSetNewFloors: (floors: string) => void; // Changed to string
  onSetSelectedLocation: (location: string) => void;
  onSubmitNewBuilding: () => void;
  onSubmitEditBuilding: () => void;
  onOpenEditBuildingModal: (poi: any) => void; // Added poi parameter
  onConfirmDeleteBuilding: (poi: any, callback: () => void) => void;
  onEnableAdminPOICreation: () => void;

  // Crowd reports
  showCrowdPopup: boolean;
  selectedDensity: string;
  showReportTooltip: boolean;
  onSubmitCrowdReport: () => void;
  onCloseCrowdReportModal: () => void;
  onOpenCrowdReportModal: () => void;
  onSetSelectedDensity: (density: string) => void;
  onHandleReportTooltipShow: () => void;
  onHandleReportTooltipHide: () => void;

  // Indoor navigation
  showIndoorPicker: boolean;
  indoorRooms: any[];
  selectedIndoorRoom: any;
  selectedBuildingForIndoor: any;
  selectedStartRoom: any;
  onCloseIndoorPicker: () => void;
  onStartIndoorNavigation: () => void;
  onSetSelectedStartRoom: (room: any) => void;
  onSetSelectedIndoorRoom: (room: any) => void;
  onOpenIndoorNavigation: () => void;

  // Share functionality
  showShareTooltip: boolean;
  onShareLocation: () => void;
  onSetShowShareTooltip: (show: boolean) => void;

  // Status and popups
  error: string | null;
  showErrorPopup: boolean;
  errorPopupMessage: string;
  showSuccessPopup: boolean;
  successPopupMessage: string;
  showConfirmationPopup: boolean;
  confirmationPopupData: any;
  showDestinationReachedPopup: boolean;
  showLocationRefreshPopup: boolean;
  tempMessage: string;
  onSetShowErrorPopup: (show: boolean) => void;
  onSetShowSuccessPopup: (show: boolean) => void;
  onSetShowConfirmationPopup: (show: boolean) => void;
  onSetShowDestinationReachedPopup: (show: boolean) => void;
  onSetShowLocationRefreshPopup: (show: boolean) => void;
  onHandleDestinationReachedConfirm: () => void;
  onRefreshMap: () => void;

  // auto nav props
  autoNavigationPopup: {
    visible: boolean;
    entry: any;
    building: any;
  };
  onAutoNavigationConfirm: () => void;
  onAutoNavigationDismiss: () => void;
}

const MapContent: React.FC<MapContentProps> = ({
  // Theme
  colors,
  isDark,

  // WebView
  webViewRef,
  onWebViewMessage,

  // Location
  currentLocation,
  isRefreshingLocation,
  onRefreshLocation,

  // Navigation
  isNavigating,
  destination,
  destinationCoords,
  steps,
  currentStep,
  routeProgress,
  distanceToDestination,
  distanceWalked,
  originalRouteDistance,
  estimatedTime,
  isRouteLoading,
  routeCoordinates,
  showDirectionsSheet,
  onSetShowDirectionsSheet,
  onStartNavigation,
  onStopNavigation,
  onCancelRoute,

  // Voice and AR
  isVoiceEnabled,
  onToggleVoice,
  showAR,
  onToggleAR,
  deviceHeading,
  isNavigationMinimized,
  onToggleMinimize,
  onSpeakingChange,

  // POI and search
  poiSuggestions,
  pois,
  selectedPOI,
  selectedFeature,
  onDestinationChange,
  onDestinationSearch,
  onSelectPOI,

  // Bluetooth navigation
  onOpenBluetoothNavigation,

  // Admin
  isAdmin,
  showAddPOIModal,
  showEditPOIModal,
  showAdminActions,
  adminActionPOI,
  editingPOI,
  buildingName,
  numberOfFloors,
  newName,
  newFloors,
  selectedLocation,
  availableLocations,
  onSetShowAddPOIModal,
  onSetShowEditPOIModal,
  onSetShowAdminActions,
  onSetBuildingName,
  onSetNumberOfFloors,
  onSetNewName,
  onSetNewFloors,
  onSetSelectedLocation,
  onSubmitNewBuilding,
  onSubmitEditBuilding,
  onOpenEditBuildingModal,
  onConfirmDeleteBuilding,
  onEnableAdminPOICreation,

  // Crowd reports
  showCrowdPopup,
  selectedDensity,
  showReportTooltip,
  onSubmitCrowdReport,
  onCloseCrowdReportModal,
  onOpenCrowdReportModal,
  onSetSelectedDensity,
  onHandleReportTooltipShow,
  onHandleReportTooltipHide,

  // Indoor navigation
  showIndoorPicker,
  indoorRooms,
  selectedIndoorRoom,
  selectedBuildingForIndoor,
  selectedStartRoom,
  onCloseIndoorPicker,
  onStartIndoorNavigation,
  onSetSelectedStartRoom,
  onSetSelectedIndoorRoom,
  onOpenIndoorNavigation,

  // Share
  showShareTooltip,
  onShareLocation,
  onSetShowShareTooltip,

  // Status and popups
  error,
  showErrorPopup,
  errorPopupMessage,
  showSuccessPopup,
  successPopupMessage,
  showConfirmationPopup,
  confirmationPopupData,
  showDestinationReachedPopup,
  showLocationRefreshPopup,
  tempMessage,
  onSetShowErrorPopup,
  onSetShowSuccessPopup,
  onSetShowConfirmationPopup,
  onSetShowDestinationReachedPopup,
  onSetShowLocationRefreshPopup,
  onHandleDestinationReachedConfirm,
  onRefreshMap,

  //auto nav
  autoNavigationPopup,
  onAutoNavigationConfirm,
  onAutoNavigationDismiss,
}) => {
  useNotificationInstruction(isNavigating, steps[currentStep]?.instruction || '');
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Modals */}
      <CrowdReportModal
        visible={showCrowdPopup}
        selectedDensity={selectedDensity}
        selectedPOI={selectedPOI}
        availablePOIs={pois}
        onChangeDensity={onSetSelectedDensity}
        onChangePOI={onSelectPOI}
        onSubmit={onSubmitCrowdReport}
        onCancel={onCloseCrowdReportModal}
      />

      <AdminPOIModal
        visible={showAddPOIModal}
        mode="add"
        onClose={() => onSetShowAddPOIModal(false)}
        onSubmit={onSubmitNewBuilding}
        buildingName={buildingName}
        setBuildingName={onSetBuildingName}
        numberOfFloors={numberOfFloors}
        setNumberOfFloors={onSetNumberOfFloors}
        selectedLocation={selectedLocation}
        setSelectedLocation={onSetSelectedLocation}
        availableLocations={availableLocations}
      />

      <AdminPOIModal
        visible={showEditPOIModal}
        mode="edit"
        onClose={() => onSetShowEditPOIModal(false)}
        onSubmit={onSubmitEditBuilding}
        newName={newName}
        setNewName={onSetNewName}
        newFloors={newFloors}
        setNewFloors={onSetNewFloors}
        editingPOI={editingPOI}
      />

      <AdminActionsModal
        visible={showAdminActions}
        adminActionPOI={adminActionPOI}
        onEdit={onOpenEditBuildingModal}
        onDelete={(poi) => onConfirmDeleteBuilding(poi, () => onSetShowAdminActions(false))}
        onClose={() => onSetShowAdminActions(false)}
      />

      <DirectionsModal
        visible={showDirectionsSheet}
        onClose={() => onSetShowDirectionsSheet(false)}
        onStart={() => {
          onStartNavigation();
          onSetShowDirectionsSheet(false);
        }}
        destination={destination}
        steps={steps}
        currentStep={currentStep}
        isNavigating={isNavigating}
      />

      <IndoorPickerModal
        visible={showIndoorPicker}
        indoorRooms={indoorRooms}
        selectedStartRoom={selectedStartRoom}
        selectedIndoorRoom={selectedIndoorRoom}
        colors={colors}
        onSelectStartRoom={onSetSelectedStartRoom}
        onSelectIndoorRoom={onSetSelectedIndoorRoom}
        onCancel={onCloseIndoorPicker}
        onStart={onStartIndoorNavigation}
      />

      {/* Search Bar - Only shown when not navigating */}
      {!isNavigating && (
        <>
          <DestinationSearch
            value={destination}
            onChange={onDestinationChange}
            onSearch={onDestinationSearch}
            suggestions={poiSuggestions}
            onSelectSuggestion={onSelectPOI}
          />

          {/* Bluetooth Navigation Button */}
          <BluetoothNavigationButton onPress={onOpenBluetoothNavigation} />
        </>
      )}

      {/* Main Map View */}
      <View style={{ flex: 1 }}>
        <MapWebView ref={webViewRef} onMessage={onWebViewMessage} />
      </View>

      {/* Navigation Panel - Shown when destination is set */}
      {destination && destinationCoords && (
        <NavigationPanel
          isNavigating={isNavigating}
          isLoading={isRouteLoading}
          onStartNavigation={onStartNavigation}
          onStopNavigation={onStopNavigation}
          onCancelRoute={onCancelRoute}
          progress={routeProgress}
          distance={distanceToDestination}
          distanceWalked={distanceWalked}
          originalRouteDistance={originalRouteDistance}
          time={
            estimatedTime !== null && !isNaN(Number(estimatedTime)) ? Number(estimatedTime) : null
          }
          destination={destination}
          isVoiceEnabled={isVoiceEnabled}
          onToggleVoice={onToggleVoice}
          currentInstruction={steps[currentStep]?.instruction}
          onSpeakingChange={onSpeakingChange}
          showAR={showAR}
          onToggleAR={onToggleAR}
          destinationCoords={destinationCoords}
          isMinimized={isNavigationMinimized}
          onToggleMinimize={onToggleMinimize}
        />
      )}

      {/* Indoor Navigation Button */}
      <IndoorNavigationButton
        visible={!!selectedBuildingForIndoor}
        colors={colors}
        onPress={onOpenIndoorNavigation}
      />

      {/* Map Actions Panel */}
      <MapActionsPanel
        currentLocation={!!currentLocation}
        onShare={onShareLocation}
        onReport={onOpenCrowdReportModal}
        isAdmin={isAdmin}
        onAddPOI={onEnableAdminPOICreation}
        shareTooltip={showShareTooltip}
        reportTooltip={showReportTooltip}
        onShareIn={() => onSetShowShareTooltip(true)}
        onShareOut={() => onSetShowShareTooltip(false)}
        onReportIn={onHandleReportTooltipShow}
        onReportOut={onHandleReportTooltipHide}
        color={colors.primary}
      />

      {/* Location Refresh Button - shown when no location available */}
      {!currentLocation && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            bottom: 160, // Above the MapActionsPanel
            right: 20,
            backgroundColor: colors.primary,
            paddingVertical: 12,
            paddingHorizontal: 16,
            borderRadius: 8,
            elevation: 4,
            flexDirection: 'row',
            alignItems: 'center',
          }}
          onPress={onRefreshLocation}
          disabled={isRefreshingLocation}
        >
          <Text style={{ color: 'white', fontWeight: 'bold', marginRight: 8 }}>
            {isRefreshingLocation ? 'Finding Location...' : '📍 Find My Location'}
          </Text>
        </TouchableOpacity>
      )}

      {/* AR Navigation Overlay */}
      {showAR && isNavigating && destinationCoords && currentLocation && (
        <ARNavigationOverlay
          currentLocation={{
            x: currentLocation.longitude,
            y: currentLocation.latitude,
          }}
          destinationCoords={{
            x: destinationCoords[0],
            y: destinationCoords[1],
          }}
          deviceHeading={deviceHeading}
          navigationSteps={steps}
          routeCoordinates={routeCoordinates}
          currentRouteIndex={Math.floor((routeProgress / 100) * (routeCoordinates.length - 1))}
          showMiniMap={true}
        />
      )}

      {/* Current Navigation Instruction - Top overlay during navigation */}
      {isNavigating && steps.length > 0 && (
        <Pressable
          onPress={() => onSetShowDirectionsSheet(true)}
          style={{
            position: 'absolute',
            top: 20,
            left: 20,
            right: 20,
            backgroundColor: colors.card,
            borderRadius: 8,
            padding: 12,
            alignItems: 'center',
            elevation: 4,
            zIndex: 1001,
          }}
        >
          <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 16 }}>
            {steps[currentStep]?.instruction}
          </Text>
        </Pressable>
      )}

      {/*  Auto Navigation Popup  */}
      <StandardPopup
        visible={autoNavigationPopup.visible}
        title="Class Starting Soon!"
        message={
          autoNavigationPopup.entry && autoNavigationPopup.building
            ? `Your ${autoNavigationPopup.entry.course} class starts at ${autoNavigationPopup.entry.startTime} at ${autoNavigationPopup.entry.venue}. Would you like to start navigation to ${autoNavigationPopup.building.name || autoNavigationPopup.building.title}?`
            : ''
        }
        onConfirm={onAutoNavigationConfirm}
        onCancel={onAutoNavigationDismiss}
        confirmText="Start Navigation"
        cancelText="Dismiss"
        showCancel={true}
      />

      {/* Status Overlay */}
      {error && <StatusOverlay status={error} />}

      {/* Temporary Message Banner */}
      {tempMessage ? (
        <View
          style={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            right: 20,
            backgroundColor: colors.card,
            padding: 10,
            borderRadius: 8,
            alignItems: 'center',
            elevation: 4,
          }}
        >
          <Text style={{ color: colors.text, fontWeight: 'bold' }}>{tempMessage}</Text>
        </View>
      ) : null}

      {/* Custom Location Error Popup */}
      {showLocationRefreshPopup && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1003,
            pointerEvents: 'box-none',
          }}
        >
          <View
            style={{
              backgroundColor: isDark ? '#2c2c2c' : 'white',
              borderRadius: 16,
              padding: 24,
              marginHorizontal: 48,
              maxWidth: 360,
              width: '100%',
              elevation: 8,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              pointerEvents: 'auto',
            }}
          >
            {/* Close button */}
            <TouchableOpacity
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                padding: 8,
                zIndex: 1,
              }}
              onPress={() => onSetShowLocationRefreshPopup(false)}
            >
              <Text
                style={{
                  color: isDark ? '#ccc' : '#666',
                  fontSize: 20,
                  fontWeight: 'bold',
                }}
              >
                ×
              </Text>
            </TouchableOpacity>

            {/* Title */}
            <Text
              style={{
                color: isDark ? 'white' : colors.text,
                fontSize: 18,
                fontWeight: 'bold',
                marginBottom: 12,
                textAlign: 'center',
                paddingRight: 32,
              }}
            >
              Location Not Found
            </Text>

            {/* Message */}
            <Text
              style={{
                color: isDark ? '#ccc' : colors.text,
                fontSize: 14,
                marginBottom: 20,
                lineHeight: 20,
                textAlign: 'center',
              }}
            >
              Unable to find your location. This can happen indoors or in areas with poor GPS
              signal.
            </Text>

            {/* Action buttons */}
            <View style={{ flexDirection: 'column', gap: 12 }}>
              <TouchableOpacity
                style={{
                  backgroundColor: colors.primary,
                  paddingVertical: 14,
                  paddingHorizontal: 24,
                  borderRadius: 8,
                }}
                onPress={onRefreshLocation}
              >
                <Text
                  style={{
                    color: 'white',
                    fontSize: 16,
                    fontWeight: '600',
                    textAlign: 'center',
                  }}
                >
                  Retry Location
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  backgroundColor: 'transparent',
                  paddingVertical: 14,
                  paddingHorizontal: 24,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: colors.primary,
                }}
                onPress={onRefreshMap}
              >
                <Text
                  style={{
                    color: colors.primary,
                    fontSize: 16,
                    fontWeight: '600',
                    textAlign: 'center',
                  }}
                >
                  Refresh Map
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Standard Popups */}
      <StandardPopup
        visible={showErrorPopup}
        title="Error"
        message={errorPopupMessage}
        onConfirm={() => onSetShowErrorPopup(false)}
        showCancel={false}
      />

      <StandardPopup
        visible={showSuccessPopup}
        title="Success"
        message={successPopupMessage}
        onConfirm={() => onSetShowSuccessPopup(false)}
        showCancel={false}
      />

      <StandardPopup
        visible={showConfirmationPopup}
        title={confirmationPopupData?.title || ''}
        message={confirmationPopupData?.message || ''}
        onConfirm={confirmationPopupData?.onConfirm}
        onCancel={() => onSetShowConfirmationPopup(false)}
        confirmText="Delete"
        cancelText="Cancel"
        showCancel={true}
      />

      <StandardPopup
        visible={showDestinationReachedPopup}
        title="Destination Reached"
        message="You have arrived at your destination!"
        onConfirm={onHandleDestinationReachedConfirm}
        showCancel={false}
      />
    </View>
  );
};

export default MapContent;
