import React from 'react';
import { View, Text, TouchableOpacity, Pressable, ActivityIndicator } from 'react-native';
import { WebView as WebViewType } from 'react-native-webview';
import MapWebView from './MapWebView';
import AdminPOIModal from '../molecules/AdminPOIModal';
import AdminActionsModal from '../molecules/AdminActionsModal';
import StatusOverlay from '../atoms/StatusOverlay';
import StandardPopup from '../atoms/StandardPopup';
import DestinationReachedPopup from '../molecules/DestinationReachedPopup';
import DestinationSearch from '../molecules/DestinationSearch';
import MapActionsPanel from './MapActionsPanel';
import NavigationPanel from './NavigationPanel';
import DirectionsModal from './DirectionsModal';
import CrowdReportModal from '../molecules/CrowdReportModal';
import IndoorPickerModal from '../molecules/IndoorPickerModal';
import IndoorNavigationButton from '../atoms/IndoorNavigationButton';
import ARNavigationOverlay from './ARNavigationOverlay';
import { useNotificationInstruction } from '../../hooks/useNotificationInstruction';

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
  onSelectCrowdReportPOI: (poi: any) => void; // Add this new prop

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
  onSelectCrowdReportPOI,

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
        onChangePOI={onSelectCrowdReportPOI}
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
        </>
      )}

      {/* Main Map View */}
      <View style={{ flex: 1 }}>
        <MapWebView ref={webViewRef} onMessage={onWebViewMessage} />
        
        {/* Initial loading overlay - shown when first loading and no location attempt made yet */}
        {!currentLocation && !isRefreshingLocation && (
          <View
            style={{
              position: 'absolute',
              top: '50%',
              left: 20,
              right: 20,
              transform: [{ translateY: -50 }],
              alignItems: 'center',
            }}
          >
            <View
              style={{
                backgroundColor: colors.card,
                paddingVertical: 20,
                paddingHorizontal: 28,
                borderRadius: 16,
                elevation: 6,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 6,
                alignItems: 'center',
                minWidth: 200,
              }}
            >
              <ActivityIndicator
                size="large"
                color={colors.primary}
                style={{ marginBottom: 16 }}
              />
              <Text style={{ 
                color: colors.text, 
                fontWeight: '600', 
                fontSize: 18,
                textAlign: 'center',
                marginBottom: 8 
              }}>
                Loading Map
              </Text>
              <Text style={{ 
                color: colors.subtleText, 
                fontSize: 14,
                textAlign: 'center',
                lineHeight: 20 
              }}>
                Initializing location services...
              </Text>
            </View>
          </View>
        )}
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

      {/* Map Actions Panel */}
      <MapActionsPanel
        currentLocation={!!currentLocation}
        onShare={onShareLocation}
        onReport={onOpenCrowdReportModal}
        onOpenBluetoothNavigation={onOpenBluetoothNavigation}
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

      {/* Location Status - loading indicator or refresh button */}
      {!currentLocation && (
        <View
          style={{
            position: 'absolute',
            bottom: 30,
            left: 20,
            right: 20,
            alignItems: 'center',
          }}
        >
          {isRefreshingLocation ? (
            // Loading indicator when actively searching for location
            <View
              style={{
                backgroundColor: colors.card,
                paddingVertical: 16,
                paddingHorizontal: 24,
                borderRadius: 12,
                elevation: 4,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <ActivityIndicator
                size="small"
                color={colors.primary}
                style={{ marginRight: 12 }}
              />
              <Text style={{ color: colors.text, fontWeight: '600', fontSize: 16 }}>
                Finding your location...
              </Text>
            </View>
          ) : (
            // Manual refresh button when location search failed or not started
            <TouchableOpacity
              style={{
                backgroundColor: colors.primary,
                paddingVertical: 12,
                paddingHorizontal: 20,
                borderRadius: 8,
                elevation: 4,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 4,
                flexDirection: 'row',
                alignItems: 'center',
              }}
              onPress={onRefreshLocation}
            >
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
                Find My Location
              </Text>
            </TouchableOpacity>
          )}
        </View>
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
        confirmText="Navigate"
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
      <StandardPopup
        visible={showLocationRefreshPopup}
        title="Location Not Found"
        message="Unable to find your location. This can happen indoors or in areas with poor GPS signal."
        onConfirm={() => {
          onRefreshLocation();
          onSetShowLocationRefreshPopup(false);
        }}
        onCancel={() => onSetShowLocationRefreshPopup(false)}
        confirmText="Retry Location"
        cancelText="Close"
        showCancel={true}
        verticalButtons={true}
      />

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

      <DestinationReachedPopup
        visible={showDestinationReachedPopup}
        destination={destination}
        onClose={onHandleDestinationReachedConfirm}
        themeColors={colors}
      />
    </View>
  );
};

export default MapContent;
