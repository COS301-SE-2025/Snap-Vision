import React, { useState, useRef, useEffect, useCallback } from 'react';
import { WebView as WebViewType } from 'react-native-webview';
import { Share } from 'react-native';
import Tts from 'react-native-tts';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
import { POI } from '../hooks/useMapPOI';
import { useTimetableNavigation } from '../hooks/useTimetableNavigation';

// utils
import { requestCameraPermission } from '../utils/cameraPermissions';

type MapScreenParams = {
  lat?: string;
  lng?: string;
  fromNotification?: boolean;
  course?: string;
  venue?: string;
  startTime?: string;
  poiId?: string;
  selectedPOI?: POI;
};

const MapScreen = () => {
  // theme and context
  const { theme, isDark } = useTheme();
  const colors = getThemeColors(theme);
  const { isHapticFeedbackEnabled } = useAccessibility();
  const { setNavigationStartTime, unlock, incrementRoutes, state } = useBadges();

  // navigation
  const route = useRoute();
  const navigation = useNavigation<any>();
  const params = route.params as MapScreenParams & { selectedPOI?: POI };

  // refs
  const webViewRef = useRef<WebViewType>(null);

  // basic state
  const [isMapReady, setIsMapReady] = useState(false);
  const [isNavigating, setIsNavigatingInternal] = useState(false);

  const setIsNavigating = (value: boolean) => {
    setIsNavigatingInternal(value);
  };

  React.useEffect(() => {}, [isNavigating]);

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

  // auto navigation popup state
  const [autoNavigationPopup, setAutoNavigationPopup] = useState<{
    visible: boolean;
    entry: any;
    building: any;
  }>({ visible: false, entry: null, building: null });

  // timetable navigation hook
  const { checkForUpcomingClasses, findBuildingForEntry } = useTimetableNavigation({
    currentLocation,
    isMapReady,
    webViewRef,
    fetchRoute,
    setDestination,
    setDestinationCoords,
    selectPOI: setHookSelectedPOI,
    setStatus,
    onAutoNavigationTriggered: (entry, building) => {
      setAutoNavigationPopup({
        visible: true,
        entry,
        building,
      });
    },
  });

  //  auto navigation handlers
  const handleAutoNavigationConfirm = () => {
    const { entry, building } = autoNavigationPopup;

    if (building && building.centroid) {
      //console.log('[MapScreen] User confirmed auto-navigation, setting up route...');

      // Clear any existing route first
      webViewRef.current?.injectJavaScript('window.clearRoute && window.clearRoute();');

      // Now set up the navigation
      setDestination(building.name || building.title || entry.venue);
      setDestinationCoords([building.centroid.longitude, building.centroid.latitude]);
      setHookSelectedPOI(building);

      // Generate route
      fetchRoute([building.centroid.longitude, building.centroid.latitude]);

      // Update status
      setStatus(`Auto-route to ${entry.course} at ${entry.venue}`);

      // Show directions sheet
      setShowDirectionsSheet(true);
    }

    // Close the popup
    setAutoNavigationPopup({ visible: false, entry: null, building: null });
  };

  const handleAutoNavigationDismiss = () => {
    //console.log('[MapScreen] User dismissed auto-navigation');

    // Just close the popup - no navigation setup was done
    setAutoNavigationPopup({ visible: false, entry: null, building: null });
  };

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
    setShowDirectionsSheet,
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
    ////consolelog('[DirectionsModal] Start pressed');
    ////consolelog('Current destination:', destination);
    ////consolelog('Current steps:', steps);
    ////consolelog('CurrentStep:', currentStep);
    ////consolelog('CurrentLocation:', currentLocation);

    // call the actual startNavigation function from useMapNavigation hook
    // this handles location tracking, distance calculation, and destination detection
    startNavigation();

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
      openIndoorNavigation(
        selectedBuildingForIndoor,
        navigation,
        setErrorPopupMessage,
        setShowErrorPopup,
      );
    } else if (hookSelectedPOI) {
      setSelectedBuildingForIndoor(hookSelectedPOI);
      openIndoorNavigation(hookSelectedPOI, navigation, setErrorPopupMessage, setShowErrorPopup);
    } else {
      setErrorPopupMessage('Please select a building first');
      setShowErrorPopup(true);
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

  const handleSelectCrowdReportPOI = (poi: any) => {
    // Only update the selected POI for crowd reporting, don't trigger navigation
    setHookSelectedPOI(poi);
  };

  const handleOpenEditBuildingModal = (poi: any) => {
    openEditBuildingModal(poi);
  };

  const handleEnableAdminPOICreation = () => {
    enableAdminPOICreation(webViewRef, setTempMessage);
  };

  const handleOpenBluetoothNavigation = () => {
    navigation.navigate('BluetoothBuildings');
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

  // Check for notification-triggered popup when screen focuses
  useFocusEffect(
    useCallback(() => {
      const checkForNotificationPopup = async () => {
        try {
          //console.log('[MapScreen] Checking for pending class popup...');

          const popupData = await AsyncStorage.getItem('pendingClassPopup');
          if (popupData) {
            const classData = JSON.parse(popupData);

            // Check if the popup has expired (class start time has passed)
            const now = Date.now();
            if (classData.expiresAt && now > classData.expiresAt) {
              //console.log('[MapScreen] Class popup expired, removing from storage');
              await AsyncStorage.removeItem('pendingClassPopup');
              return;
            }

            await AsyncStorage.removeItem('pendingClassPopup');

            //console.log('[MapScreen] Found pending class popup:', classData);

            // Wait a bit for POIs to load if they haven't yet
            let retries = 0;
            const maxRetries = 10;

            const waitForPOIs = () => {
              if (pois && pois.length > 0) {
                //console.log('[MapScreen] POIs loaded, processing popup');
                processClassPopup(classData);
              } else if (retries < maxRetries) {
                retries++;
                //console.log('[MapScreen] Waiting for POIs to load, retry', retries);
                setTimeout(waitForPOIs, 500);
              } else {
                //console.log('[MapScreen] POIs not loaded, using coordinates fallback');
                processClassPopup(classData);
              }
            };

            waitForPOIs();
          }
        } catch (error) {
          //console.error('[MapScreen] Error checking notification popup:', error);
        }
      };

      const processClassPopup = (classData: any) => {
        // Check if class time has passed before showing popup
        if (classData.startTime) {
          const now = new Date();
          const classStartTime = new Date();
          const [hours, minutes] = classData.startTime.split(':').map(Number);
          classStartTime.setHours(hours, minutes, 0, 0);
          
          if (now > classStartTime) {
            //console.log('[MapScreen] Class time has passed, not showing popup');
            return;
          }
        }
        
        // Find the building for this class
        let building = null;

        // First try by buildingId
        if (classData.buildingId && pois) {
          building = pois.find((poi) => poi.id === classData.buildingId);
        }

        // Then try by building name
        if (!building && classData.buildingName && pois) {
          building = pois.find(
            (poi) =>
              poi.name?.toLowerCase().includes(classData.buildingName.toLowerCase()) ||
              poi.title?.toLowerCase().includes(classData.buildingName.toLowerCase()),
          );
        }

        // Use coordinates as fallback
        if (!building && classData.lat && classData.lng) {
          building = {
            id: 'notification-building',
            name: classData.buildingName || classData.venue,
            title: classData.buildingName || classData.venue,
            centroid: {
              latitude: parseFloat(classData.lat),
              longitude: parseFloat(classData.lng),
            },
          };
        }

        if (building && building.centroid) {
          //console.log('[MapScreen] Triggering auto navigation popup for:', classData.course);

          // Create a mock entry for the popup
          const mockEntry = {
            id: classData.entryKey,
            course: classData.course,
            venue: classData.venue,
            startTime: classData.startTime,
            buildingId: classData.buildingId,
            buildingName: classData.buildingName,
          };

          // Trigger the auto navigation popup
          setAutoNavigationPopup({
            visible: true,
            entry: mockEntry,
            building: building,
          });
        } else {
          //console.log('[MapScreen] Could not find building for notification popup');
        }
      };

      // Only check when map is ready
      if (isMapReady) {
        checkForNotificationPopup();
      }
    }, [isMapReady, pois, setAutoNavigationPopup]),
  );

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
            ////consoleerror('TTS Error:', e);
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

      // Check if this is from a notification
      const isFromNotification = params.fromNotification || params.course || params.venue;

      if (isFromNotification) {
        setDestination(`${params.course || 'Class'} at ${params.venue || 'Venue'}`);
        setStatus('Auto-navigating to your class location');

        // Trigger the popup if we have the course info
        if (params.course) {
          setTimeout(() => {
            setAutoNavigationPopup({
              visible: true,
              entry: {
                course: params.course,
                venue: params.venue,
                startTime: params.startTime,
              },
              building: {
                name: params.venue,
                centroid: { latitude: lat, longitude: lng },
              },
            });
          }, 1000); // Small delay to ensure map is ready
        }
      } else {
        setDestination("Friend's Location");
      }

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
    setStatus,
    setAutoNavigationPopup,
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

  // Handle user icon updates when purchases change
  useEffect(() => {
    if (isMapReady && webViewRef.current) {
      // Find the latest user icon purchase
      const userIconPurchases =
        state.purchases?.filter((purchase: any) => purchase.id?.startsWith('user-icon-')) || [];

      if (userIconPurchases.length > 0) {
        // Get the most recent user icon purchase
        const latestIconPurchase = userIconPurchases[userIconPurchases.length - 1];
        const iconName =
          latestIconPurchase.icon || latestIconPurchase.id?.replace('user-icon-', '');

        // Update the WebView with the new icon
        const iconUpdateScript = `window.setUserIcon && window.setUserIcon('${iconName}');`;
        webViewRef.current.injectJavaScript(iconUpdateScript);
      }
    }
  }, [state.purchases, isMapReady]);

  useEffect(() => {
    if (params?.selectedPOI && isMapReady && currentLocation) {
      if (!selectedFeature || selectedFeature.id !== params.selectedPOI.id) {
        const selectedPOI = params.selectedPOI;

        selectPOI(selectedPOI);
        setHookSelectedPOI(selectedPOI);
        setSelectedFeature(selectedPOI);
        setDestination(selectedPOI.name);

        if (selectedPOI.centroid) {
          setDestinationCoords([selectedPOI.centroid.longitude, selectedPOI.centroid.latitude]);
          fetchRoute([selectedPOI.centroid.longitude, selectedPOI.centroid.latitude]);
          setShowDirectionsSheet(true);
        }
      }
    }
  }, [params?.selectedPOI, isMapReady, currentLocation]);
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
      onSelectCrowdReportPOI={handleSelectCrowdReportPOI}
      // Bluetooth navigation
      onOpenBluetoothNavigation={handleOpenBluetoothNavigation}
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
      // auto nav props
      autoNavigationPopup={autoNavigationPopup}
      onAutoNavigationConfirm={handleAutoNavigationConfirm}
      onAutoNavigationDismiss={handleAutoNavigationDismiss}
    />
  );
};

export default MapScreen;
