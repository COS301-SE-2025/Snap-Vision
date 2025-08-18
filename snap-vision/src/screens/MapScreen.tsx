import React, { useState, useRef, useEffect } from 'react';
import { View } from 'react-native';
import { WebView as WebViewType } from 'react-native-webview';
import { Share } from 'react-native';
import Tts from 'react-native-tts';
import { useRoute, useNavigation } from '@react-navigation/native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

//components
import MapContent from '../components/organisms/MapContent';

// hooks
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import { useBadges } from '../context/BadgeContext';
import { useAccessibility } from '../context/AccessibilityContext';
import { useCompass } from '../hooks/useCompass';
import { useMapLocation } from '../hooks/useMapLocation';
import { useMapNavigation } from '../hooks/useMapNavigation';
import { useMapPOI } from '../hooks/useMapPOI';
import { useMapAdmin } from '../hooks/useMapAdmin';
import { useCrowdReports } from '../hooks/useCrowdReports';
import { useMapIndoor } from '../hooks/useMapIndoor';
import { useWebViewCommunication } from '../hooks/useWebViewCommunication';

// utils
import { requestCameraPermission } from '../utils/cameraPermissions';

type MapScreenParams = {
  lat?: string;
  lng?: string;
};

const MapScreen = () => {
  // theme and context
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const { isHapticFeedbackEnabled } = useAccessibility();
  const { setNavigationStartTime, unlock, incrementRoutes } = useBadges();

  // navigation
  const route = useRoute();
  const navigation = useNavigation<any>();
  const params = route.params as MapScreenParams;

  // refs
  const webViewRef = useRef<WebViewType>(null);

  // basic state
  const [isMapReady, setIsMapReady] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showDirectionsSheet, setShowDirectionsSheet] = useState(false);
  const [showDestinationReachedPopup, setShowDestinationReachedPopup] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [hasHandledDeepLink, setHasHandledDeepLink] = useState(false);

  // popup states
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

  // AR navigation state
  const [showAR, setShowAR] = useState(false);
  const deviceHeading = useCompass();
  const [isNavigationMinimized, setIsNavigationMinimized] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [shouldStartTTS, setShouldStartTTS] = useState(false);
  const [showShareTooltip, setShowShareTooltip] = useState(false);

  //haptic feedback options
  const hapticOptions = {
    enableVibrateFallback: true,
    ignoreAndroidSystemSettings: false,
  };

  //initialize hooks
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
  } = useMapPOI(isMapReady, webViewRef, setError);

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

  //helper functions for admin hook
  const showErrorPopupHelper = (message: string) => {
    setErrorPopupMessage(message);
    setShowErrorPopup(true);
  };

  const showSuccessPopupHelper = (message: string) => {
    setSuccessPopupMessage(message);
    setShowSuccessPopup(true);
  };

  const showConfirmationPopupHelper = (data: {
    title: string;
    message: string;
    onConfirm: () => void;
  }) => {
    setConfirmationPopupData(data);
    setShowConfirmationPopup(true);
  };

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
  } = useCrowdReports(isMapReady, webViewRef, setStatus, setError);

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

  //event handlers
  const handleARToggle = async () => {
    if (!showAR) {
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

  const handleSelectPOI = (poi: any) => {
    setHasHandledDeepLink(true);

    if (isNavigating) {
      stopNavigation();
    }

    webViewRef.current?.injectJavaScript('window.clearRoute && window.clearRoute();');

    setDistanceWalked(0);
    setStartLocation(null);
    setOriginalRouteDistance(null);

    selectPOI(poi);
    setDestinationCoords([poi.centroid.longitude, poi.centroid.latitude]);

    if (currentLocation) {
      fetchRoute([poi.centroid.longitude, poi.centroid.latitude]);
    }
  };

  const handleDestinationChange = (text: string) => {
    setDestination(text);
    filterPOIs(text);
    if (!text.trim()) {
      if (isNavigating) {
        stopNavigation();
      }
      webViewRef.current?.injectJavaScript('window.clearRoute && window.clearRoute();');
      setDestinationCoords(null);
    }
  };

  const handleStartNavigation = () => {
    console.log('[DirectionsModal] Start pressed');
    console.log('Current destination:', destination);
    console.log('Current steps:', steps);
    console.log('CurrentStep:', currentStep);
    console.log('CurrentLocation:', currentLocation);
    setIsNavigating(true);
    setShouldStartTTS(true);
    setCurrentStep(0);
  };

  const handleDestinationReachedConfirm = () => {
    setShowDestinationReachedPopup(false);
    setHasReachedDestination(false);
    setDestination('');
    setDestinationCoords(null);
    setRouteProgress(0);
    setDistanceToDestination(null);
    setEstimatedTime(null);
    setSelectedFeature(null);
    setHookSelectedPOI(null);
    setSteps([]);
    setCurrentStep(0);
    setDistanceWalked(0);
    setStartLocation(null);
    setOriginalRouteDistance(null);

    if (isMapReady && webViewRef.current) {
      webViewRef.current.injectJavaScript('window.clearRoute && window.clearRoute();');
    }
    setStatus('Ready for navigation');
  };

  const handleOpenIndoorNavigation = () => {
    if (selectedBuildingForIndoor) {
      openIndoorNavigation(selectedBuildingForIndoor, setErrorPopupMessage, setShowErrorPopup);
    }
  };

  const handleStartIndoorNavigation = () => {
    startIndoorNavigation(navigation, setErrorPopupMessage, setShowErrorPopup);
  };

  const handleSubmitCrowdReport = () => {
    submitCrowdReport(hookSelectedPOI);
  };

  const handleOpenCrowdReportModal = () => {
    openCrowdReportModal(selectedFeature, destination, destinationCoords, pois, setHookSelectedPOI);
  };

  const handleOpenEditBuildingModal = (poi: any) => {
    openEditBuildingModal(poi);
  };

  const handleEnableAdminPOICreation = () => {
    enableAdminPOICreation(webViewRef, setTempMessage);
  };

  //effects
  useEffect(() => {
    if (tempMessage) {
      const timer = setTimeout(() => {
        setTempMessage('');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [tempMessage]);

  //tts and haptic feedback effect
  useEffect(() => {
    if (isNavigating && shouldStartTTS && steps.length > 0 && currentStep < steps.length) {
      const instruction = steps[currentStep]?.instruction;
      if (instruction) {
        if (isHapticFeedbackEnabled) {
          ReactNativeHapticFeedback.trigger('impactMedium', hapticOptions);
        }

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
  }, [isNavigating, steps, currentStep, shouldStartTTS, isHapticFeedbackEnabled, isVoiceEnabled]);

  // deep link handling
  useEffect(() => {
    if (!hasHandledDeepLink && params && params.lat && params.lng && currentLocation) {
      const lat = parseFloat(params.lat);
      const lng = parseFloat(params.lng);
      setDestination("Friend's Location");
      setDestinationCoords([lng, lat]);
      fetchRoute([lng, lat]);
      setHasHandledDeepLink(true);
    }
  }, [
    params,
    currentLocation,
    hasHandledDeepLink,
    fetchRoute,
    setDestination,
    setDestinationCoords,
  ]);

  // location availability check
  useEffect(() => {
    if (isMapReady && !currentLocation && !isRefreshingLocation) {
      const locationTimeout = setTimeout(() => {
        if (!currentLocation && !showLocationRefreshPopup) {
          setShowLocationRefreshPopup(true);
        }
      }, 5000);

      return () => clearTimeout(locationTimeout);
    }
  }, [isMapReady, currentLocation, isRefreshingLocation, showLocationRefreshPopup]);

  return (
    <MapContent
      //theme
      colors={colors}
      isDark={isDark}
      //webView
      webViewRef={webViewRef}
      onWebViewMessage={handleWebViewMessage}
      //location
      currentLocation={currentLocation}
      isRefreshingLocation={isRefreshingLocation}
      onRefreshLocation={refreshLocation}
      //navigation
      isNavigating={isNavigating}
      destination={destination}
      destinationCoords={destinationCoords}
      steps={steps}
      currentStep={currentStep}
      routeProgress={routeProgress}
      distanceToDestination={distanceToDestination}
      distanceWalked={distanceWalked}
      originalRouteDistance={originalRouteDistance}
      estimatedTime={estimatedTime !== null ? estimatedTime.toString() : null}
      isRouteLoading={isRouteLoading}
      routeCoordinates={routeCoordinates}
      showDirectionsSheet={showDirectionsSheet}
      onSetShowDirectionsSheet={setShowDirectionsSheet}
      onStartNavigation={handleStartNavigation}
      onStopNavigation={stopNavigation}
      onCancelRoute={cancelRoute}
      //voice and AR
      isVoiceEnabled={isVoiceEnabled}
      onToggleVoice={() => setIsVoiceEnabled(!isVoiceEnabled)}
      showAR={showAR}
      onToggleAR={handleARToggle}
      deviceHeading={deviceHeading}
      isNavigationMinimized={isNavigationMinimized}
      onToggleMinimize={handleNavigationMinimize}
      onSpeakingChange={setIsSpeaking}
      //poi and search
      poiSuggestions={poiSuggestions}
      pois={pois}
      selectedPOI={hookSelectedPOI}
      selectedFeature={selectedFeature}
      onDestinationChange={handleDestinationChange}
      onDestinationSearch={handleDestinationSearch}
      onSelectPOI={handleSelectPOI}
      //admin
      isAdmin={isAdmin}
      showAddPOIModal={showAddPOIModal}
      showEditPOIModal={showEditPOIModal}
      showAdminActions={showAdminActions}
      adminActionPOI={adminActionPOI}
      editingPOI={editingPOI}
      buildingName={buildingName}
      numberOfFloors={numberOfFloors}
      newName={newName}
      newFloors={newFloors}
      selectedLocation={selectedLocation}
      availableLocations={availableLocations}
      onSetShowAddPOIModal={setShowAddPOIModal}
      onSetShowEditPOIModal={setShowEditPOIModal}
      onSetShowAdminActions={setShowAdminActions}
      onSetBuildingName={setBuildingName}
      onSetNumberOfFloors={setNumberOfFloors}
      onSetNewName={setNewName}
      onSetNewFloors={setNewFloors}
      onSetSelectedLocation={setSelectedLocation}
      onSubmitNewBuilding={submitNewBuilding}
      onSubmitEditBuilding={submitEditBuilding}
      onOpenEditBuildingModal={openEditBuildingModal}
      onConfirmDeleteBuilding={confirmDeleteBuilding}
      onEnableAdminPOICreation={handleEnableAdminPOICreation}
      //crowd reports
      showCrowdPopup={showCrowdPopup}
      selectedDensity={selectedDensity}
      showReportTooltip={showReportTooltip}
      onSubmitCrowdReport={handleSubmitCrowdReport}
      onCloseCrowdReportModal={closeCrowdReportModal}
      onOpenCrowdReportModal={handleOpenCrowdReportModal}
      onSetSelectedDensity={setSelectedDensity}
      onHandleReportTooltipShow={handleReportTooltipShow}
      onHandleReportTooltipHide={handleReportTooltipHide}
      //indoor navigation
      showIndoorPicker={showIndoorPicker}
      indoorRooms={indoorRooms}
      selectedIndoorRoom={selectedIndoorRoom}
      selectedBuildingForIndoor={selectedBuildingForIndoor}
      selectedStartRoom={selectedStartRoom}
      onCloseIndoorPicker={closeIndoorPicker}
      onStartIndoorNavigation={handleStartIndoorNavigation}
      onSetSelectedStartRoom={setSelectedStartRoom}
      onSetSelectedIndoorRoom={setSelectedIndoorRoom}
      onOpenIndoorNavigation={handleOpenIndoorNavigation}
      // share
      showShareTooltip={showShareTooltip}
      onShareLocation={shareLocation}
      onSetShowShareTooltip={setShowShareTooltip}
      // status and popups
      error={error}
      showErrorPopup={showErrorPopup}
      errorPopupMessage={errorPopupMessage}
      showSuccessPopup={showSuccessPopup}
      successPopupMessage={successPopupMessage}
      showConfirmationPopup={showConfirmationPopup}
      confirmationPopupData={confirmationPopupData}
      showDestinationReachedPopup={showDestinationReachedPopup}
      showLocationRefreshPopup={showLocationRefreshPopup}
      tempMessage={tempMessage}
      onSetShowErrorPopup={setShowErrorPopup}
      onSetShowSuccessPopup={setShowSuccessPopup}
      onSetShowConfirmationPopup={setShowConfirmationPopup}
      onSetShowDestinationReachedPopup={setShowDestinationReachedPopup}
      onSetShowLocationRefreshPopup={setShowLocationRefreshPopup}
      onHandleDestinationReachedConfirm={handleDestinationReachedConfirm}
      onRefreshMap={refreshMap}
    />
  );
};

export default MapScreen;
