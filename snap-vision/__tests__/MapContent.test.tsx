import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MapContent from '../src/components/organisms/MapContent';

// Mock all child components used in MapContent
jest.mock('../src/components/organisms/MapWebView', () => {
  const React = require('react');
  return React.forwardRef(() => null);
});
interface AdminPOIModalProps {
    visible: boolean;
    mode: string;
    onClose: () => void;
    onSubmit: () => void;
}

jest.mock('../src/components/molecules/AdminPOIModal', () => (props: AdminPOIModalProps) => {
    const React = require('react');
    const { Text, TouchableOpacity } = require('react-native');
    if (!props.visible) return null;
    return (
        <>
            <Text>{props.mode} AdminPOIModal</Text>
            <TouchableOpacity onPress={() => props.onClose()}>
                <Text>CloseAdminPOI</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => props.onSubmit()}>
                <Text>SubmitAdminPOI</Text>
            </TouchableOpacity>
        </>
    );
});
interface AdminActionsModalProps {
    visible: boolean;
    adminActionPOI: any;
    onEdit: (poi: any) => void;
    onDelete: (poi: any, callback?: () => void) => void;
    onClose: () => void;
}

jest.mock('../src/components/molecules/AdminActionsModal', () => (props: AdminActionsModalProps) => {
    const React = require('react');
    const { Text, TouchableOpacity } = require('react-native');
    if (!props.visible) return null;
    return (
        <>
            <Text>AdminActionsModal</Text>
            <TouchableOpacity onPress={() => props.onEdit(props.adminActionPOI)}>
                <Text>EditPOI</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => props.onDelete(props.adminActionPOI)}>
                <Text>DeletePOI</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => props.onClose()}>
                <Text>CloseAdminActions</Text>
            </TouchableOpacity>
        </>
    );
});
interface StatusOverlayProps {
    status?: string;
}

jest.mock('../src/components/atoms/StatusOverlay', () => (props: StatusOverlayProps) => {
    const React = require('react');
    const { Text } = require('react-native');
    return props.status ? <Text>{`StatusOverlay: ${props.status}`}</Text> : null;
});
interface StandardPopupProps {
    visible: boolean;
    title?: string;
    message?: string;
    onConfirm: () => void;
    onCancel?: () => void;
    showCancel?: boolean;
}

jest.mock('../src/components/atoms/StandardPopup', () => (props: StandardPopupProps) => {
    const React = require('react');
    const { Text, TouchableOpacity } = require('react-native');
    if (!props.visible) return null;
    return (
        <>
            {props.title && <Text>{props.title}</Text>}
            {props.message && <Text>{props.message}</Text>}
            <TouchableOpacity onPress={props.onConfirm}>
                <Text>Confirm</Text>
            </TouchableOpacity>
            {props.showCancel && (
                <TouchableOpacity onPress={props.onCancel}>
                    <Text>Cancel</Text>
                </TouchableOpacity>
            )}
        </>
    );
});
interface DestinationSearchProps {
    value: string;
    onChange: (value: string) => void;
    onSearch: () => void;
    onSelectSuggestion: (suggestion: { name: string }) => void;
}

jest.mock('../src/components/molecules/DestinationSearch', () => (props: DestinationSearchProps) => {
    const React = require('react');
    const { Text, TouchableOpacity } = require('react-native');
    return (
        <>
            <Text>{props.value} DestinationSearch</Text>
            <TouchableOpacity onPress={() => props.onChange('test destination')}>
                <Text>ChangeDestination</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => props.onSearch()}>
                <Text>SearchDestination</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => props.onSelectSuggestion({ name: 'test poi' })}>
                <Text>SelectSuggestion</Text>
            </TouchableOpacity>
        </>
    );
});
interface MapActionsPanelProps {
    isAdmin?: boolean;
    onShare: () => void;
    onReport: () => void;
    onAddPOI?: () => void;
    onShareIn: () => void;
    onShareOut: () => void;
    onReportIn: () => void;
    onReportOut: () => void;
}

jest.mock('../src/components/organisms/MapActionsPanel', () => (props: MapActionsPanelProps) => {
    const React = require('react');
    const { Text, TouchableOpacity } = require('react-native');
    return (
        <>
            <Text>{props.isAdmin ? 'AdminPanel' : 'UserPanel'}</Text>
            <TouchableOpacity onPress={() => props.onShare()}>
                <Text>ShareLocation</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => props.onReport()}>
                <Text>ReportCrowd</Text>
            </TouchableOpacity>
            {props.isAdmin && (
                <TouchableOpacity onPress={() => props.onAddPOI && props.onAddPOI()}>
                    <Text>AddPOI</Text>
                </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => props.onShareIn()}>
                <Text>ShareIn</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => props.onShareOut()}>
                <Text>ShareOut</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => props.onReportIn()}>
                <Text>ReportIn</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => props.onReportOut()}>
                <Text>ReportOut</Text>
            </TouchableOpacity>
        </>
    );
});
interface NavigationPanelProps {
    isNavigating?: boolean;
    onStartNavigation: () => void;
    onStopNavigation: () => void;
    onCancelRoute: () => void;
    onToggleVoice: () => void;
    onToggleAR: () => void;
    onToggleMinimize: () => void;
    onSpeakingChange: (speaking: boolean) => void;
}

jest.mock('../src/components/organisms/NavigationPanel', () => (props: NavigationPanelProps) => {
    const React = require('react');
    const { Text, TouchableOpacity } = require('react-native');
    return (
        <>
            <Text>{props.isNavigating ? 'NavOn' : 'NavOff'}</Text>
            <TouchableOpacity onPress={() => props.onStartNavigation()}>
                <Text>StartNav</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => props.onStopNavigation()}>
                <Text>StopNav</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => props.onCancelRoute()}>
                <Text>CancelRoute</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => props.onToggleVoice()}>
                <Text>ToggleVoice</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => props.onToggleAR()}>
                <Text>ToggleAR</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => props.onToggleMinimize()}>
                <Text>ToggleMinimize</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => props.onSpeakingChange(true)}>
                <Text>SpeakingChange</Text>
            </TouchableOpacity>
        </>
    );
});
interface DirectionsModalProps {
    visible: boolean;
    onClose: () => void;
    onStart: () => void;
}

jest.mock('../src/components/organisms/DirectionsModal', () => (props: DirectionsModalProps) => {
    const React = require('react');
    const { Text, TouchableOpacity } = require('react-native');
    if (!props.visible) return null;
    return (
        <>
            <Text>DirectionsModal</Text>
            <TouchableOpacity onPress={() => props.onClose()}>
                <Text>CloseDirections</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => props.onStart()}>
                <Text>StartDirections</Text>
            </TouchableOpacity>
        </>
    );
});
interface CrowdReportModalProps {
    visible: boolean;
    onChangeDensity: (density: string) => void;
    onChangePOI: (poi: { name: string }) => void;
    onSubmit: () => void;
    onCancel: () => void;
}

jest.mock('../src/components/molecules/CrowdReportModal', () => (props: CrowdReportModalProps) => {
    const React = require('react');
    const { Text, TouchableOpacity } = require('react-native');
    if (!props.visible) return null;
    return (
        <>
            <Text>CrowdReportModal</Text>
            <TouchableOpacity onPress={() => props.onChangeDensity('high')}>
                <Text>ChangeDensity</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => props.onChangePOI({ name: 'test poi' })}>
                <Text>ChangePOI</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => props.onSubmit()}>
                <Text>SubmitCrowd</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => props.onCancel()}>
                <Text>CancelCrowd</Text>
            </TouchableOpacity>
        </>
    );
});
interface IndoorPickerModalProps {
    visible: boolean;
    onSelectStartRoom: (room: { name: string }) => void;
    onSelectIndoorRoom: (room: { name: string }) => void;
    onCancel: () => void;
    onStart: () => void;
}

jest.mock('../src/components/molecules/IndoorPickerModal', () => (props: IndoorPickerModalProps) => {
    const React = require('react');
    const { Text, TouchableOpacity } = require('react-native');
    if (!props.visible) return null;
    return (
        <>
            <Text>IndoorPickerModal</Text>
            <TouchableOpacity onPress={() => props.onSelectStartRoom({ name: 'start room' })}>
                <Text>SelectStartRoom</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => props.onSelectIndoorRoom({ name: 'indoor room' })}>
                <Text>SelectIndoorRoom</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => props.onCancel()}>
                <Text>CancelIndoor</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => props.onStart()}>
                <Text>StartIndoor</Text>
            </TouchableOpacity>
        </>
    );
});
interface IndoorNavigationButtonProps {
    visible: boolean;
    onPress: () => void;
}

jest.mock('../src/components/atoms/IndoorNavigationButton', () => (props: IndoorNavigationButtonProps) => {
    const React = require('react');
    const { Text, TouchableOpacity } = require('react-native');
    if (!props.visible) return null;
    return (
        <TouchableOpacity onPress={() => props.onPress()}>
            <Text>IndoorNavBtn</Text>
        </TouchableOpacity>
    );
});
jest.mock('../src/components/organisms/ARNavigationOverlay', () => () => {
  const React = require('react');
  const { Text } = require('react-native');
  return <Text>AROverlay</Text>;
});

const baseProps = {
  colors: { background: '#fff', primary: '#000', card: '#eee', text: '#111' },
  isDark: false,
  webViewRef: { current: null },
  onWebViewMessage: jest.fn(),
  currentLocation: { latitude: 1, longitude: 2 },
  isRefreshingLocation: false,
  onRefreshLocation: jest.fn(),
  isNavigating: false,
  destination: '',
  destinationCoords: null,
  steps: [],
  currentStep: 0,
  routeProgress: 0,
  distanceToDestination: null,
  distanceWalked: 0,
  originalRouteDistance: null,
  estimatedTime: null,
  isRouteLoading: false,
  routeCoordinates: [],
  showDirectionsSheet: false,
  onSetShowDirectionsSheet: jest.fn(),
  onStartNavigation: jest.fn(),
  onStopNavigation: jest.fn(),
  onCancelRoute: jest.fn(),
  isVoiceEnabled: false,
  onToggleVoice: jest.fn(),
  showAR: false,
  onToggleAR: jest.fn(),
  deviceHeading: 0,
  isNavigationMinimized: false,
  onToggleMinimize: jest.fn(),
  onSpeakingChange: jest.fn(),
  poiSuggestions: [],
  pois: [],
  selectedPOI: null,
  selectedFeature: null,
  onDestinationChange: jest.fn(),
  onDestinationSearch: jest.fn(),
  onSelectPOI: jest.fn(),
  isAdmin: false,
  showAddPOIModal: false,
  showEditPOIModal: false,
  showAdminActions: false,
  adminActionPOI: null,
  editingPOI: null,
  buildingName: '',
  numberOfFloors: '',
  newName: '',
  newFloors: '',
  selectedLocation: '',
  availableLocations: [],
  onSetShowAddPOIModal: jest.fn(),
  onSetShowEditPOIModal: jest.fn(),
  onSetShowAdminActions: jest.fn(),
  onSetBuildingName: jest.fn(),
  onSetNumberOfFloors: jest.fn(),
  onSetNewName: jest.fn(),
  onSetNewFloors: jest.fn(),
  onSetSelectedLocation: jest.fn(),
  onSubmitNewBuilding: jest.fn(),
  onSubmitEditBuilding: jest.fn(),
  onOpenEditBuildingModal: jest.fn(),
  onConfirmDeleteBuilding: jest.fn(),
  onEnableAdminPOICreation: jest.fn(),
  showCrowdPopup: false,
  selectedDensity: '',
  showReportTooltip: false,
  onSubmitCrowdReport: jest.fn(),
  onCloseCrowdReportModal: jest.fn(),
  onOpenCrowdReportModal: jest.fn(),
  onSetSelectedDensity: jest.fn(),
  onHandleReportTooltipShow: jest.fn(),
  onHandleReportTooltipHide: jest.fn(),
  showIndoorPicker: false,
  indoorRooms: [],
  selectedIndoorRoom: null,
  selectedBuildingForIndoor: null,
  selectedStartRoom: null,
  onCloseIndoorPicker: jest.fn(),
  onStartIndoorNavigation: jest.fn(),
  onSetSelectedStartRoom: jest.fn(),
  onSetSelectedIndoorRoom: jest.fn(),
  onOpenIndoorNavigation: jest.fn(),
  showShareTooltip: false,
  onShareLocation: jest.fn(),
  onSetShowShareTooltip: jest.fn(),
  error: null,
  showErrorPopup: false,
  errorPopupMessage: '',
  showSuccessPopup: false,
  successPopupMessage: '',
  showConfirmationPopup: false,
  confirmationPopupData: {},
  showDestinationReachedPopup: false,
  showLocationRefreshPopup: false,
  tempMessage: '',
  onSetShowErrorPopup: jest.fn(),
  onSetShowSuccessPopup: jest.fn(),
  onSetShowConfirmationPopup: jest.fn(),
  onSetShowDestinationReachedPopup: jest.fn(),
  onSetShowLocationRefreshPopup: jest.fn(),
  onHandleDestinationReachedConfirm: jest.fn(),
  onRefreshMap: jest.fn(),
};

describe('MapContent', () => {
  it('handles AdminPOIModal (edit) close action', () => {
    const onSetShowEditPOIModal = jest.fn();
    const { getByText } = render(
      <MapContent {...baseProps} showEditPOIModal onSetShowEditPOIModal={onSetShowEditPOIModal} />
    );
    fireEvent.press(getByText('CloseAdminPOI'));
    expect(onSetShowEditPOIModal).toHaveBeenCalledWith(false);
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Basic rendering tests
  it('renders MapWebView and MapActionsPanel', () => {
    const { getByText } = render(<MapContent {...baseProps} />);
    expect(getByText('UserPanel')).toBeTruthy();
  });

  it('shows AdminActionsPanel if isAdmin is true', () => {
    const { getByText } = render(<MapContent {...baseProps} isAdmin />);
    expect(getByText('AdminPanel')).toBeTruthy();
  });

  // Modal rendering tests
  it('shows AdminPOIModal when showAddPOIModal is true', () => {
    const { getByText } = render(<MapContent {...baseProps} showAddPOIModal />);
    expect(getByText('add AdminPOIModal')).toBeTruthy();
  });

  it('shows AdminPOIModal (edit) when showEditPOIModal is true', () => {
    const { getByText } = render(<MapContent {...baseProps} showEditPOIModal />);
    expect(getByText('edit AdminPOIModal')).toBeTruthy();
  });

  it('shows AdminActionsModal when showAdminActions is true', () => {
    const { getByText } = render(<MapContent {...baseProps} showAdminActions />);
    expect(getByText('AdminActionsModal')).toBeTruthy();
  });

  it('shows DirectionsModal when showDirectionsSheet is true', () => {
    const { getByText } = render(<MapContent {...baseProps} showDirectionsSheet />);
    expect(getByText('DirectionsModal')).toBeTruthy();
  });

  it('shows CrowdReportModal when showCrowdPopup is true', () => {
    const { getByText } = render(<MapContent {...baseProps} showCrowdPopup />);
    expect(getByText('CrowdReportModal')).toBeTruthy();
  });

  it('shows IndoorPickerModal when showIndoorPicker is true', () => {
    const { getByText } = render(<MapContent {...baseProps} showIndoorPicker />);
    expect(getByText('IndoorPickerModal')).toBeTruthy();
  });

  it('shows IndoorNavigationButton if selectedBuildingForIndoor is set', () => {
    const { getByText } = render(<MapContent {...baseProps} selectedBuildingForIndoor={{}} />);
    expect(getByText('IndoorNavBtn')).toBeTruthy();
  });

  // Navigation tests
  it('shows NavigationPanel if destination and destinationCoords are set', () => {
    const { getByText } = render(
      <MapContent {...baseProps} destination="Test" destinationCoords={[1, 2]} />,
    );
    expect(getByText('NavOff')).toBeTruthy();
  });

  it('shows NavigationPanel with NavOn if isNavigating is true', () => {
    const { getByText } = render(
      <MapContent
        {...baseProps}
        destination="Test"
        destinationCoords={[1, 2]}
        isNavigating
      />,
    );
    expect(getByText('NavOn')).toBeTruthy();
  });

  // Error and status tests
  it('shows error overlay if error is set', () => {
    const { getByText } = render(<MapContent {...baseProps} error="Oops" />);
    expect(getByText('StatusOverlay: Oops')).toBeTruthy();
  });

  it('shows tempMessage banner if tempMessage is set', () => {
    const { getByText } = render(<MapContent {...baseProps} tempMessage="Hello" />);
    expect(getByText('Hello')).toBeTruthy();
  });

  // Location refresh tests
  it('renders Find My Location button when currentLocation is falsy and triggers onRefreshLocation', () => {
    const onRefreshLocation = jest.fn();
    const { getByText } = render(
      <MapContent {...baseProps} currentLocation={null} onRefreshLocation={onRefreshLocation} />
    );
    expect(getByText('📍 Find My Location')).toBeTruthy();
    fireEvent.press(getByText('📍 Find My Location'));
    expect(onRefreshLocation).toHaveBeenCalled();
  });

  it('renders Find My Location button as disabled when isRefreshingLocation is true', () => {
    const { getByText } = render(
      <MapContent {...baseProps} currentLocation={null} isRefreshingLocation={true} />
    );
    expect(getByText('Finding Location...')).toBeTruthy();
  });

  it('does not render Find My Location button when currentLocation is available', () => {
    const { queryByText } = render(
      <MapContent {...baseProps} currentLocation={{ latitude: 1, longitude: 2 }} />
    );
    expect(queryByText('📍 Find My Location')).toBeNull();
  });

  // AR Navigation tests
  describe('AR Navigation', () => {
    it('renders ARNavigationOverlay when showAR, isNavigating, destinationCoords, and currentLocation are set', () => {
      const { getByText } = render(
        <MapContent
          {...baseProps}
          showAR
          isNavigating
          destinationCoords={[1, 2]}
          currentLocation={{ latitude: 1, longitude: 2 }}
        />
      );
      expect(getByText('AROverlay')).toBeTruthy();
    });

    it('does not render ARNavigationOverlay if any required prop is missing', () => {
      const { queryByText } = render(
        <MapContent {...baseProps} showAR isNavigating destinationCoords={null} currentLocation={null} />
      );
      expect(queryByText('AROverlay')).toBeNull();
    });
  });

  // Navigation instruction overlay tests
  it('shows current navigation instruction overlay when navigating', () => {
    const { getByText } = render(
      <MapContent
        {...baseProps}
        isNavigating
        steps={[{ instruction: 'Turn left' }]}
        currentStep={0}
      />,
    );
    expect(getByText('Turn left')).toBeTruthy();
  });

  it('calls onSetShowDirectionsSheet(true) when navigation instruction overlay is pressed', () => {
    const onSetShowDirectionsSheet = jest.fn();
    const { getByText } = render(
      <MapContent
        {...baseProps}
        isNavigating
        steps={[{ instruction: 'Go straight' }]}
        currentStep={0}
        onSetShowDirectionsSheet={onSetShowDirectionsSheet}
      />
    );
    fireEvent.press(getByText('Go straight'));
    expect(onSetShowDirectionsSheet).toHaveBeenCalledWith(true);
  });

  it('does not render navigation instruction overlay when not navigating', () => {
    const { queryByText } = render(
      <MapContent
        {...baseProps}
        isNavigating={false}
        steps={[{ instruction: 'Turn left' }]}
        currentStep={0}
      />
    );
    expect(queryByText('Turn left')).toBeNull();
  });

  it('does not render navigation instruction overlay when no steps available', () => {
    const { queryByText } = render(
      <MapContent
        {...baseProps}
        isNavigating={true}
        steps={[]}
        currentStep={0}
      />
    );
    expect(queryByText('Turn left')).toBeNull();
  });

  // Search visibility tests
  it('shows DestinationSearch when not navigating', () => {
    const { getByText } = render(
      <MapContent {...baseProps} isNavigating={false} destination="test" />
    );
    expect(getByText('test DestinationSearch')).toBeTruthy();
  });

  it('hides DestinationSearch when navigating', () => {
    const { queryByText } = render(
      <MapContent {...baseProps} isNavigating={true} destination="test" />
    );
    expect(queryByText('test DestinationSearch')).toBeNull();
  });

  // Popup tests
  it('shows custom location error popup when showLocationRefreshPopup is true', () => {
    const { getByText } = render(
      <MapContent {...baseProps} showLocationRefreshPopup isDark={false} />
    );
    expect(getByText('Location Not Found')).toBeTruthy();
    expect(getByText('Unable to find your location. This can happen indoors or in areas with poor GPS signal.')).toBeTruthy();
    expect(getByText('Retry Location')).toBeTruthy();
    expect(getByText('Refresh Map')).toBeTruthy();
  });

  it('renders custom location error popup in dark mode', () => {
    const { getByText } = render(
      <MapContent {...baseProps} showLocationRefreshPopup isDark={true} />
    );
    expect(getByText('Location Not Found')).toBeTruthy();
    expect(getByText('Retry Location')).toBeTruthy();
    expect(getByText('Refresh Map')).toBeTruthy();
  });

  it('closes custom location error popup when close button is pressed', () => {
    const onSetShowLocationRefreshPopup = jest.fn();
    const { getByText } = render(
      <MapContent {...baseProps} showLocationRefreshPopup isDark={false} onSetShowLocationRefreshPopup={onSetShowLocationRefreshPopup} />
    );
    fireEvent.press(getByText('×'));
    expect(onSetShowLocationRefreshPopup).toHaveBeenCalledWith(false);
  });

  it('calls onRefreshLocation and onRefreshMap from custom location error popup', () => {
    const onRefreshLocation = jest.fn();
    const onRefreshMap = jest.fn();
    const { getByText } = render(
      <MapContent {...baseProps} showLocationRefreshPopup isDark={false} onRefreshLocation={onRefreshLocation} onRefreshMap={onRefreshMap} />
    );
    fireEvent.press(getByText('Retry Location'));
    expect(onRefreshLocation).toHaveBeenCalled();
    fireEvent.press(getByText('Refresh Map'));
    expect(onRefreshMap).toHaveBeenCalled();
  });

  it('does not render custom location error popup when showLocationRefreshPopup is false', () => {
    const { queryByText } = render(
      <MapContent {...baseProps} showLocationRefreshPopup={false} />
    );
    expect(queryByText('Location Not Found')).toBeNull();
  });

  // Standard popup tests
  it('calls onSetShowErrorPopup(false) when error popup confirm is pressed', () => {
    const onSetShowErrorPopup = jest.fn();
    const { getByText } = render(
      <MapContent {...baseProps} showErrorPopup errorPopupMessage="err" onSetShowErrorPopup={onSetShowErrorPopup} />
    );
    fireEvent.press(getByText('Confirm'));
    expect(onSetShowErrorPopup).toHaveBeenCalledWith(false);
  });

  it('calls onSetShowSuccessPopup(false) when success popup confirm is pressed', () => {
    const onSetShowSuccessPopup = jest.fn();
    const { getByText } = render(
      <MapContent {...baseProps} showSuccessPopup successPopupMessage="succ" onSetShowSuccessPopup={onSetShowSuccessPopup} />
    );
    fireEvent.press(getByText('Confirm'));
    expect(onSetShowSuccessPopup).toHaveBeenCalledWith(false);
  });

  it('calls confirmationPopupData.onConfirm when confirmation popup confirm is pressed', () => {
    const onConfirm = jest.fn();
    const confirmationPopupData = { title: 'Confirm', message: 'Proceed?', onConfirm };
    const { getAllByText } = render(
      <MapContent {...baseProps} showConfirmationPopup confirmationPopupData={confirmationPopupData} />
    );
    const confirmButtons = getAllByText('Confirm');
    fireEvent.press(confirmButtons[confirmButtons.length - 1]);
    expect(onConfirm).toHaveBeenCalled();
  });

  it('calls onSetShowConfirmationPopup(false) when confirmation popup cancel is pressed', () => {
    const onSetShowConfirmationPopup = jest.fn();
    const { getByText } = render(
      <MapContent {...baseProps} showConfirmationPopup confirmationPopupData={{ title: 'Confirm', message: 'Proceed?' }} onSetShowConfirmationPopup={onSetShowConfirmationPopup} />
    );
    fireEvent.press(getByText('Cancel'));
    expect(onSetShowConfirmationPopup).toHaveBeenCalledWith(false);
  });

  it('calls onHandleDestinationReachedConfirm when destination reached popup confirm is pressed', () => {
    const onHandleDestinationReachedConfirm = jest.fn();
    const { getByText } = render(
      <MapContent {...baseProps} showDestinationReachedPopup onHandleDestinationReachedConfirm={onHandleDestinationReachedConfirm} />
    );
    fireEvent.press(getByText('Confirm'));
    expect(onHandleDestinationReachedConfirm).toHaveBeenCalled();
  });

  // TempMessage tests
  it('renders tempMessage banner when tempMessage is set', () => {
    const { getByText } = render(
      <MapContent {...baseProps} tempMessage="Test message" />
    );
    expect(getByText('Test message')).toBeTruthy();
  });

  it('does not render tempMessage banner when tempMessage is falsy', () => {
    const { queryByText } = render(
      <MapContent {...baseProps} tempMessage={''} />
    );
    expect(queryByText('')).toBeNull();
  });

  it('does not render tempMessage banner when tempMessage is empty', () => {
    const { queryByText } = render(
      <MapContent {...baseProps} tempMessage="" />
    );
    expect(queryByText('')).toBeNull();
  });


});