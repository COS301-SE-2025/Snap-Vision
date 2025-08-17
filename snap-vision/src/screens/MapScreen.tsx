import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  PermissionsAndroid,
  Pressable,
  ScrollView,
} from 'react-native';
import { WebView as WebViewType } from 'react-native-webview';
import firestore from '@react-native-firebase/firestore';
import Tts from 'react-native-tts';
import MapWebView from '../components/organisms/MapWebView';
import AdminPOIModal from '../components/molecules/AdminPOIModal';
import AdminActionsModal from '../components/molecules/AdminActionsModal';
import StatusOverlay from '../components/atoms/StatusOverlay';
import StandardPopup from '../components/atoms/StandardPopup';
import DestinationSearch from '../components/molecules/DestinationSearch';
import MapActionsPanel from '../components/organisms/MapActionsPanel';
import NavigationPanel from '../components/organisms/NavigationPanel';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import DirectionsModal from '../components/organisms/DirectionsModal';
import { useRoute, useNavigation } from '@react-navigation/native';
import { addRecentlyVisitedPOI, Visit } from '../services/firebase/recentlyVService';

import { useBadges } from '../context/BadgeContext';
import { useAccessibility } from '../context/AccessibilityContext';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import ARNavigationOverlay from '../components/organisms/ARNavigationOverlay';
import { useCompass } from '../hooks/useCompass'; // Needed for AR navigation functionality
import { useMapLocation } from '../hooks/useMapLocation';
import { useMapNavigation } from '../hooks/useMapNavigation';
import { useMapPOI } from '../hooks/useMapPOI';
import { useMapAdmin } from '../hooks/useMapAdmin';
import { useCrowdReports } from '../hooks/useCrowdReports';
import CrowdReportModal from '../components/molecules/CrowdReportModal';
import { useMapIndoor } from '../hooks/useMapIndoor';
import IndoorPickerModal from '../components/molecules/IndoorPickerModal';
import { useWebViewCommunication } from '../hooks/useWebViewCommunication';
import IndoorNavigationButton from '../components/atoms/IndoorNavigationButton';
import { requestCameraPermission } from '../utils/cameraPermissions';
import { Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
// import { ROUTING_API } from '@env';

type MapScreenParams = {
  lat?: string;
  lng?: string;
};

const ROUTING_API_BASE = 'http://192.168.0.197:3000'; // <-- Use your correct backend IP here

// emulator: 10.0.2.2
// B home:  192.168.56.1
// L wifi: 192.168.0.127
// T home: 192.168.0.133
// T data: 192.168.43.155
// Th home: 10.0.0.9
// T Durban: 192.168.1.93
// S home:  192.168.0.197
// L harties: 192.168.101.238

const MapScreen = () => {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const { isHapticFeedbackEnabled } = useAccessibility();
  const { setNavigationStartTime } = useBadges();
  const { unlock, incrementRoutes } = useBadges();
  

  const webViewRef = useRef<WebViewType>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showDirectionsSheet, setShowDirectionsSheet] = useState(false);
  const [showDestinationReachedPopup, setShowDestinationReachedPopup] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  
  // share location
  const route = useRoute();
  const params = route.params as MapScreenParams;
  const [hasHandledDeepLink, setHasHandledDeepLink] = useState(false);

  // Use the location hook
  const {
    currentLocation,
    status,
    error,
    isRefreshingLocation,
    shouldCenterMap,
    requestLocation,
    refreshLocation,
    sendLocationToWebView,
    setShouldCenterMap,
    setCurrentLocation,
    setStatus,
    setError,
  } = useMapLocation(isMapReady, webViewRef, isNavigating);

  // Use the POI hook first (needed by navigation hook)
  const {
    pois,
    poiSuggestions,
    selectedPOI: hookSelectedPOI,
    selectedFeature,
    destination,
    fetchPOIs,
    filterPOIs,
    selectPOI,
    setSelectedPOI: setHookSelectedPOI,
    setSelectedFeature,
    setDestination,
    clearPOISuggestions,
  } = useMapPOI(
    isMapReady,
    webViewRef,
    setError,
  );

  // Use the navigation hook
  const {
    steps,
    currentStep,
    routeProgress,
    distanceToDestination,
    estimatedTime,
    hasReachedDestination,
    distanceWalked,
    originalRouteDistance,
    startLocation,
    isRouteLoading,
    destinationCoords,
    routeCoordinates,
    fetchRoute,
    startNavigation,
    stopNavigation,
    destinationReached,
    rerouteFromCurrentLocation,
    updateNavigationProgress,
    startNavigationTracking,
    stopNavigationTracking,
    setSteps,
    setCurrentStep,
    setRouteProgress,
    setDistanceToDestination,
    setEstimatedTime,
    setHasReachedDestination,
    setDistanceWalked,
    setOriginalRouteDistance,
    setStartLocation,
    setDestinationCoords,
  } = useMapNavigation(
    currentLocation,
    isMapReady,
    webViewRef,
    setStatus,
    setError,
    isHapticFeedbackEnabled,
    isVoiceEnabled,
    hookSelectedPOI,
    (badgeId: string) => unlock(badgeId as any),
    incrementRoutes,
    setNavigationStartTime,
    setShowDestinationReachedPopup,
    setShowDirectionsSheet,
    isNavigating,
    setIsNavigating,
  );

  // Popup states (TODO: Move to UI Context)
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorPopupMessage, setErrorPopupMessage] = useState('');
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successPopupMessage, setSuccessPopupMessage] = useState('');
  const [showConfirmationPopup, setShowConfirmationPopup] = useState(false);
  const [confirmationPopupData, setConfirmationPopupData] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [showLocationRefreshPopup, setShowLocationRefreshPopup] = useState(false);
  const [tempMessage, setTempMessage] = useState<string>('');

  const navigation = useNavigation<any>();

  // Helper functions for admin hook
  const showErrorPopupHelper = (message: string) => {
    setErrorPopupMessage(message);
    setShowErrorPopup(true);
  };
  
  const showSuccessPopupHelper = (message: string) => {
    setSuccessPopupMessage(message);
    setShowSuccessPopup(true);
  };
  
  const showConfirmationPopupHelper = (data: { title: string; message: string; onConfirm: () => void }) => {
    setConfirmationPopupData(data);
    setShowConfirmationPopup(true);
  };

  // Use the admin hook
  const {
    isAdmin,
    userRole,
    adminLocations,
    availableLocations,
    selectedLocation,
    showAddPOIModal,
    showEditPOIModal,
    showAdminActions,
    addPOICoords,
    buildingName,
    numberOfFloors,
    editingPOI,
    newName,
    newFloors,
    adminActionPOI,
    openAddBuildingModal,
    openEditBuildingModal,
    confirmDeleteBuilding,
    submitNewBuilding,
    submitEditBuilding,
    deleteBuilding,
    enableAdminPOICreation,
    handleAdminWebViewMessage,
    validateAdminPermission,
    setShowAddPOIModal,
    setShowEditPOIModal,
    setShowAdminActions,
    setBuildingName,
    setNumberOfFloors,
    setNewName,
    setNewFloors,
    setSelectedLocation,
    setAdminActionPOI,
    injectAdminHandlers,
  } = useMapAdmin(
    fetchPOIs,
    setStatus,
    setError,
    showErrorPopupHelper,
    showSuccessPopupHelper,
    showConfirmationPopupHelper,
  );

  // Use the crowd reports hook
  const {
    showCrowdPopup,
    selectedDensity,
    showReportTooltip,
    crowdReports,
    submitCrowdReport,
    fetchRecentCrowdReports,
    openCrowdReportModal,
    closeCrowdReportModal,
    handleReportTooltipShow,
    handleReportTooltipHide,
    setSelectedDensity,
    setShowReportTooltip,
  } = useCrowdReports(
    isMapReady,
    webViewRef,
    setStatus,
    setError,
  );

  // Use the indoor navigation hook
  const {
    showIndoorPicker,
    indoorRooms,
    selectedIndoorRoom,
    selectedBuildingForIndoor,
    selectedStartRoom,
    handleIndoorNavFromMap,
    openIndoorNavigation,
    areRoomsConnected,
    closeIndoorPicker,
    startIndoorNavigation,
    setShowIndoorPicker,
    setIndoorRooms,
    setSelectedIndoorRoom,
    setSelectedBuildingForIndoor,
    setSelectedStartRoom,
  } = useMapIndoor();

  // Use the WebView communication hook
  const {
    handleWebViewMessage,
    refreshMap,
    cancelRoute,
    toggleMapRotation,
    injectJavaScript,
    clearRoute,
    showAllPOIMarkers,
    drawRoute,
    displayPOIs,
  } = useWebViewCommunication(
    webViewRef,
    isMapReady,
    setIsMapReady,
    currentLocation,
    sendLocationToWebView,
    requestLocation,
    setCurrentLocation,
    isNavigating,
    routeCoordinates,
    stopNavigation,
    fetchRoute,
    pois,
    hookSelectedPOI,
    selectPOI,
    setHookSelectedPOI,
    setSelectedFeature,
    setDestination,
    setDestinationCoords,
    setRouteProgress,
    setDistanceToDestination,
    setEstimatedTime,
    setSteps,
    setCurrentStep,
    setDistanceWalked,
    setStartLocation,
    setOriginalRouteDistance,
    setHasReachedDestination,
    handleAdminWebViewMessage,
    injectAdminHandlers,
    handleIndoorNavFromMap,
    navigation,
    setStatus,
    setError,
    setTempMessage,
    setShowLocationRefreshPopup,
    setErrorPopupMessage,
    setShowErrorPopup,
  );

  const [showShareTooltip, setShowShareTooltip] = useState(false);

  // Turn-by-turn state (non-navigation related)
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [shouldStartTTS, setShouldStartTTS] = useState(false);

  // AR Navigation state
  const [showAR, setShowAR] = useState(false);
  const deviceHeading = useCompass(); // This is needed for AR navigation functionality
  const [isNavigationMinimized, setIsNavigationMinimized] = useState(false);

  //haptic feedback options
  const hapticOptions = {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
  };

  // AR Navigation functions
  const handleARToggle = async () => {
    if (!showAR) {
      // Request camera permission before enabling AR
      const hasPermission = await requestCameraPermission();
      if (hasPermission) {
        setShowAR(true);
        setStatus('AR Navigation enabled');
      }
    } else {
      setShowAR(false);
      setStatus('AR Navigation disabled');
    }
  };

  const handleNavigationMinimize = () => {
    setIsNavigationMinimized(!isNavigationMinimized);
  };

  const shareLocation = async () => {
    if (!currentLocation) {
      setErrorPopupMessage('Your location is not available yet.');
      setShowErrorPopup(true);
      return;
    }
    try {
      const url = `https://snap-vision-f6954.web.app/location?lat=${currentLocation.latitude}&lng=${currentLocation.longitude}`;
      const message = `Check out my location: ${url}`;
      await Share.share({ message, url, title: 'Share Location' });
      setStatus('Location shared successfully');
      unlock('share-location');
    } catch {
      setError('Failed to share location');
    }
  };

  const handleDestinationSearch = () => {
    if (!currentLocation || !destinationCoords) {
      setError('Please select a valid destination');
      return;
    }
    fetchRoute(destinationCoords);
  };

  useEffect(() => {
    if (tempMessage) {
      const timer = setTimeout(() => {
        setTempMessage('');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [tempMessage]);

  //step changes with haptic feedback and TTS
  useEffect(() => {
    if (isNavigating && shouldStartTTS && steps.length > 0 && currentStep < steps.length) {
      const instruction = steps[currentStep]?.instruction;
      if (instruction) {
        // Trigger haptic feedback for new direction
        if (isHapticFeedbackEnabled) {
          ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
        }

        // console.log('TTS should speak:', instruction);
        if (isVoiceEnabled) {
          try {
            Tts.stop();
            setTimeout(() => {
              Tts.speak(instruction);
            }, 500);
          } catch (e) {
            console.error('TTS Error:', e);
            setError('Voice guidance is not available.');
          }
        }
      }
    }
  }, [isNavigating, steps, currentStep]);

  // Handle POI selection with navigation integration
  const handleSelectPOI = (poi: any) => {
    setHasHandledDeepLink(true); // Prevent deep link from overriding
    
    // Stop navigation if currently navigating
    if (isNavigating) {
      stopNavigation();
    }

    // Clear any existing route
    webViewRef.current?.injectJavaScript('window.clearRoute && window.clearRoute();');

    // Reset enhanced progress tracking for new destination
    setDistanceWalked(0);
    setStartLocation(null);
    setOriginalRouteDistance(null);

    // Use POI hook for basic selection
    selectPOI(poi);
    
    // Set navigation destination
    setDestinationCoords([poi.centroid.longitude, poi.centroid.latitude]);

    // Automatically fetch route when POI is selected from search
    if (currentLocation) {
      fetchRoute([poi.centroid.longitude, poi.centroid.latitude]);
    }
  };

  // Handle deep link params if they exist
  useEffect(() => {
    // Only process params once and if they exist
    if (!hasHandledDeepLink && params && params.lat && params.lng && currentLocation) {
      const lat = parseFloat(params.lat);
      const lng = parseFloat(params.lng);
      setDestination("Friend's Location");
      setDestinationCoords([lng, lat]);
      fetchRoute([lng, lat]);
      setHasHandledDeepLink(true);
    }
  }, [params, currentLocation, hasHandledDeepLink]);

  // Check for location availability after map loads
  useEffect(() => {
    if (isMapReady && !currentLocation && !isRefreshingLocation) {
      // Wait 5 seconds after map is ready, then show location prompt if still no location
      const locationTimeout = setTimeout(() => {
        if (!currentLocation && !showLocationRefreshPopup) {
          setShowLocationRefreshPopup(true);
        }
      }, 5000);

      return () => clearTimeout(locationTimeout);
    }
  }, [isMapReady, currentLocation, isRefreshingLocation, showLocationRefreshPopup]);
  
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <CrowdReportModal
        visible={showCrowdPopup}
        selectedDensity={selectedDensity}
        selectedPOI={hookSelectedPOI}
        availablePOIs={pois}
        onChangeDensity={setSelectedDensity}
        onChangePOI={setHookSelectedPOI}
        onSubmit={() => submitCrowdReport(hookSelectedPOI)}
        onCancel={closeCrowdReportModal}
      />

      <AdminPOIModal
        visible={showAddPOIModal}
        mode="add"
        onClose={() => setShowAddPOIModal(false)}
        onSubmit={submitNewBuilding}
        buildingName={buildingName}
        setBuildingName={setBuildingName}
        numberOfFloors={numberOfFloors}
        setNumberOfFloors={setNumberOfFloors}
        selectedLocation={selectedLocation}
        setSelectedLocation={setSelectedLocation}
        availableLocations={availableLocations}
      />

      <AdminPOIModal
        visible={showEditPOIModal}
        mode="edit"
        onClose={() => setShowEditPOIModal(false)}
        onSubmit={submitEditBuilding}
        newName={newName}
        setNewName={setNewName}
        newFloors={newFloors}
        setNewFloors={setNewFloors}
        editingPOI={editingPOI}
      />

      <AdminActionsModal
        visible={showAdminActions}
        adminActionPOI={adminActionPOI}
        onEdit={openEditBuildingModal}
        onDelete={(poi) => confirmDeleteBuilding(poi, () => setShowAdminActions(false))}
        onClose={() => setShowAdminActions(false)}
      />



      <DirectionsModal
        visible={showDirectionsSheet}
        onClose={() => {
          console.log('[DirectionsModal] onClose pressed');
          setShowDirectionsSheet(false);
        }}
        onStart={() => {
          console.log('[DirectionsModal] Start pressed');
          console.log('Current destination:', destination);
          console.log('Current steps:', steps);
          console.log('CurrentStep:', currentStep);
          console.log('CurrentLocation:', currentLocation);
          setIsNavigating(true);
          setShouldStartTTS(true);
          setCurrentStep(0);
          setShowDirectionsSheet(false);
        }}
        destination={destination}
        steps={steps}
        currentStep={currentStep}
        isNavigating={isNavigating}
      />
      {!isNavigating && (
        <DestinationSearch
          value={destination}
          onChange={(text) => {
            setDestination(text);
            filterPOIs(text);
            if (!text.trim()) {
              if (isNavigating) {
                stopNavigation();
              }
              webViewRef.current?.injectJavaScript('window.clearRoute && window.clearRoute();');
              setDestinationCoords(null);
            }
          }}
          onSearch={handleDestinationSearch}
          suggestions={poiSuggestions}
          onSelectSuggestion={handleSelectPOI}
        />
      )}

      <View style={{ flex: 1 }}>
        <MapWebView ref={webViewRef} onMessage={handleWebViewMessage} />
      </View>

      {destination && destinationCoords && (
        <NavigationPanel
          isNavigating={isNavigating}
          isLoading={isRouteLoading}
          onStartNavigation={startNavigation}
          onStopNavigation={stopNavigation}
          onCancelRoute={cancelRoute}
          progress={routeProgress}
          distance={distanceToDestination}
          distanceWalked={distanceWalked}
          originalRouteDistance={originalRouteDistance}
          time={estimatedTime}
          destination={destination}
          isVoiceEnabled={isVoiceEnabled}
          onToggleVoice={() => setIsVoiceEnabled(!isVoiceEnabled)}
          currentInstruction={steps[currentStep]?.instruction}
          onSpeakingChange={setIsSpeaking}
          showAR={showAR}
          onToggleAR={handleARToggle}
          destinationCoords={destinationCoords}
          isMinimized={isNavigationMinimized}
          onToggleMinimize={handleNavigationMinimize}
        />
      )}

      <IndoorNavigationButton
        visible={!!selectedBuildingForIndoor}
        colors={colors}
        onPress={() => selectedBuildingForIndoor && openIndoorNavigation(selectedBuildingForIndoor, setErrorPopupMessage, setShowErrorPopup)}
      />

      <IndoorPickerModal
        visible={showIndoorPicker}
        indoorRooms={indoorRooms}
        selectedStartRoom={selectedStartRoom}
        selectedIndoorRoom={selectedIndoorRoom}
        colors={colors}
        onSelectStartRoom={setSelectedStartRoom}
        onSelectIndoorRoom={setSelectedIndoorRoom}
        onCancel={closeIndoorPicker}
        onStart={() => startIndoorNavigation(navigation, setErrorPopupMessage, setShowErrorPopup)}
      />

      <MapActionsPanel
        currentLocation={!!currentLocation}
        onShare={shareLocation}
        onReport={() => openCrowdReportModal(selectedFeature, destination, destinationCoords, pois, setHookSelectedPOI)}
        isAdmin={isAdmin}
        onAddPOI={() => enableAdminPOICreation(webViewRef, setTempMessage)}
        shareTooltip={showShareTooltip}
        reportTooltip={showReportTooltip}
        onShareIn={() => setShowShareTooltip(true)}
        onShareOut={() => setShowShareTooltip(false)}
        onReportIn={handleReportTooltipShow}
        onReportOut={handleReportTooltipHide}
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
          onPress={refreshLocation}
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
          routeCoordinates={routeCoordinates} // Pass the actual route
          currentRouteIndex={Math.floor((routeProgress / 100) * (routeCoordinates.length - 1))} // Current position on route
          showMiniMap={true} // Enable mini map overlay
        />
      )}

      {isNavigating && steps.length > 0 && (
        <Pressable
          onPress={() => setShowDirectionsSheet(true)}
          style={{
            position: 'absolute',
            top: 20, // Moved back up to original position
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

      {error && <StatusOverlay status={error} />}

      {/* {isAdmin && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            bottom: 100,
            right: 20,
            backgroundColor: '#007bff',
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderRadius: 8,
            elevation: 4,
          }}
          onPress={() => {
            webViewRef.current?.injectJavaScript(`window.enableAdminPOICreation();`);
          }}
        >
          <Text style={{ color: 'white', fontWeight: 'bold' }}>+ Add POI</Text>
        </TouchableOpacity>
      )} */}

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

      {/* Error Popup */}
      <StandardPopup
        visible={showErrorPopup}
        title="Error"
        message={errorPopupMessage}
        onConfirm={() => setShowErrorPopup(false)}
        showCancel={false}
      />

      {/* Success Popup */}
      <StandardPopup
        visible={showSuccessPopup}
        title="Success"
        message={successPopupMessage}
        onConfirm={() => setShowSuccessPopup(false)}
        showCancel={false}
      />

      {/* Confirmation Popup */}
      <StandardPopup
        visible={showConfirmationPopup}
        title={confirmationPopupData?.title || ''}
        message={confirmationPopupData?.message || ''}
        onConfirm={confirmationPopupData?.onConfirm}
        onCancel={() => setShowConfirmationPopup(false)}
        confirmText="Delete"
        cancelText="Cancel"
        showCancel={true}
      />

      {/* Destination Reached Popup */}
      <StandardPopup
        visible={showDestinationReachedPopup}
        title="Destination Reached"
        message="You have arrived at your destination!"
        onConfirm={() => {
          setShowDestinationReachedPopup(false);
          setHasReachedDestination(false);
          // Clear destination and navigation state to hide the progress bar
          setDestination('');
          setDestinationCoords(null);
          setRouteProgress(0);
          setDistanceToDestination(null);
          setEstimatedTime(null);
          setSelectedFeature(null);
          setHookSelectedPOI(null);
          setSteps([]);
          setCurrentStep(0);
          // Reset enhanced progress tracking
          setDistanceWalked(0);
          setStartLocation(null);
          setOriginalRouteDistance(null);

          // Clear the route from the map
          if (isMapReady && webViewRef.current) {
            webViewRef.current.injectJavaScript('window.clearRoute && window.clearRoute();');
          }
          setStatus('Ready for navigation');
        }}
        showCancel={false}
      />

      {/* Location Error Banner - Non-modal but centered like a popup */}
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
            pointerEvents: 'box-none', // Allow touches through the transparent area
          }}
        >
          <View
            style={{
              backgroundColor: isDark ? '#2c2c2c' : 'white',
              borderRadius: 16,
              padding: 24,
              marginHorizontal: 48, // Increased from 32 to add more space from edges
              maxWidth: 360, // Reduced from 400 to make it narrower
              width: '100%',
              elevation: 8,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              pointerEvents: 'auto', // Block touches on the popup itself
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
              onPress={() => setShowLocationRefreshPopup(false)}
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
                paddingRight: 32, // Space for close button
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

            {/* Action buttons in vertical layout */}
            <View style={{ flexDirection: 'column', gap: 12 }}>
              <TouchableOpacity
                style={{
                  backgroundColor: colors.primary,
                  paddingVertical: 14,
                  paddingHorizontal: 24,
                  borderRadius: 8,
                }}
                onPress={refreshLocation}
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
                onPress={refreshMap}
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

      {/* Location Refresh Popup */}
      <StandardPopup
        visible={false} // Disabled - using custom non-modal popup instead
        title="Location Not Found"
        message="Unable to find your location. This can happen indoors or in areas with poor GPS signal. Try 'Retry Location' or 'Refresh Map' for a complete reset."
        onConfirm={refreshLocation}
        onCancel={refreshMap}
        confirmText="Retry Location"
        cancelText="Refresh Map"
        showCancel={true}
        verticalButtons={true}
      />
    </View>
  );
};

export default MapScreen;
