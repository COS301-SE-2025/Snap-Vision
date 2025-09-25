import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { WebView } from 'react-native-webview';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
// Removed: WiFiFingerprintCollector
import SettingsHeader from '../molecules/SettingsHeader';
import StandardPopup from '../atoms/StandardPopup';
import { BeaconPositioningFlow } from './BeaconPositioningFlow';

type Props = {
  buildingId?: string | null;
  floorId?: string | null;
  onBack?: () => void;
};

type Floorplan = {
  locationId: string;
  buildingId: string;
  floorLabel: string;
  downloadURL: string;
  id: string;
};

type BeaconDoc = {
  id: string;
  uuid: string;
  major: number;
  minor: number;
  x: number; // 0..1 normalized
  y: number; // 0..1 normalized
  txPowerAt1m: number; // e.g. -59
  label?: string;
};

export default function AdminIndoorPositioningContent(props: Props) {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const webViewRef = useRef<WebView>(null);

  const [role, setRole] = useState<string | null>(null);
  const [adminLocations, setAdminLocations] = useState<string[]>([]);
  const [selectedFloorplan, setSelectedFloorplan] = useState<Floorplan | null>(null);
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Beacon state (replaces WiFi fingerprints)
  const [existingBeacons, setExistingBeacons] = useState<BeaconDoc[]>([]);
  const [beaconLabel, setBeaconLabel] = useState('');
  const [beaconUUID, setBeaconUUID] = useState('');
  const [beaconMajor, setBeaconMajor] = useState('');
  const [beaconMinor, setBeaconMinor] = useState('');
  const [txPowerAt1m, setTxPowerAt1m] = useState('-59'); // sensible default

  // Popups
  const [showBeaconInfoPopup, setShowBeaconInfoPopup] = useState(false);
  const [selectedBeaconInfo, setSelectedBeaconInfo] = useState<BeaconDoc | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [beaconToDelete, setBeaconToDelete] = useState<BeaconDoc | null>(null);
  const [showCoordinatesPopup, setShowCoordinatesPopup] = useState(false);
  const [selectedCoordinates, setSelectedCoordinates] = useState<{ x: number; y: number } | null>(
    null,
  );

  // Error and success popups
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorTitle, setErrorTitle] = useState('');
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Auth & RBAC
  useEffect(() => {
    const fetchUserInfo = async () => {
      const uid = auth().currentUser?.uid;
      if (!uid) return;
      const doc = await firestore().doc(`userInformation/${uid}`).get();
      const data = doc.data();
      setRole(data?.role || 'user');
      setAdminLocations(data?.adminLocations || []);
    };
    fetchUserInfo();
  }, []);

  // Fetch placed beacons for the selected floor
  const fetchBeacons = async () => {
    if (!selectedFloorplan) return;
    const col = firestore().collection(
      `locations/${selectedFloorplan.locationId}/buildingPOIs/${selectedFloorplan.buildingId}/floorplans/${selectedFloorplan.floorLabel}/beacons`,
    );
    const snap = await col.get();

    const list: BeaconDoc[] = snap.docs.map((doc) => {
      const data = doc.data() as any;
      return {
        id: doc.id,
        uuid: data.uuid,
        major: Number(data.major),
        minor: Number(data.minor),
        x: Number(data.x),
        y: Number(data.y),
        txPowerAt1m: Number(data.txPowerAt1m ?? -59),
        label: data.label || '',
      };
    });

    console.log('🔷 Stored Beacons:');
    list.forEach((b, i) => {
      console.log(
        `  ${i + 1}. ${b.label || 'Beacon'} @ (${b.x.toFixed(3)}, ${b.y.toFixed(3)})  ${b.uuid}/${b.major}/${b.minor}`,
      );
    });

    setExistingBeacons(list);
  };

  useEffect(() => {
    fetchBeacons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFloorplan]);

  // Handler for floorplan selection from BeaconPositioningFlow
  const handleFloorplanSelect = (floorplan: Floorplan | null) => {
    setSelectedFloorplan(floorplan);
    setCoords(null);
  };

  // 6) Handle messages from WebView (tap to place or select existing beacon)
  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'tap') {
        setCoords({ x: data.x, y: data.y });
        setSelectedCoordinates({ x: data.x, y: data.y });
        setShowCoordinatesPopup(true);
      } else if (data.type === 'marker_click' && data.id) {
        const beacon = existingBeacons.find((p) => p.id === data.id);
        if (beacon) {
          setSelectedBeaconInfo(beacon);
          setShowBeaconInfoPopup(true);
        }
      }
    } catch (err) {
      //consoleerror('Invalid message from WebView', err);
    }
  };

  // Delete a beacon document
  const handleDeleteBeacon = async () => {
    if (!beaconToDelete || !selectedFloorplan) return;
    try {
      await firestore()
        .collection(
          `locations/${selectedFloorplan.locationId}/buildingPOIs/${selectedFloorplan.buildingId}/floorplans/${selectedFloorplan.floorLabel}/beacons`,
        )
        .doc(beaconToDelete.id)
        .delete();

      await fetchBeacons();
      setShowDeleteConfirmation(false);
      setBeaconToDelete(null);
    } catch (error) {
      console.error('Error deleting beacon:', error);
      setErrorTitle('Error');
      setErrorMessage('Failed to delete beacon. Please try again.');
      setShowErrorPopup(true);
    }
  };

  // 8) Floorplan HTML with existing beacon markers
  const getHTML = () => {
    const markers = existingBeacons
      .map((b) => {
        const left = b.x * 100;
        const top = b.y * 100;
        return `<div onclick="onMarkerClick('${b.id}')" data-id="${b.id}" class="marker"
          style="left:${left}%;top:${top}%;"></div>`;
      })
      .join('');

    const currentMarker = coords
      ? `<div id="marker" style="left:${coords.x * 100}%;top:${coords.y * 100}%"></div>`
      : '';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
          <style>
            body { margin:0; padding:0; overflow:hidden; background:${colors.background}; touch-action: manipulation; }
            #container { position:relative; width:100vw; height:100vh; overflow:hidden; }
            #zoomable-area { position:absolute; transform-origin:0 0; transition:none; width:100%; height:100%; }
            #floorplan { width:100%; height:100%; object-fit:contain; display:block; filter:${isDark ? 'brightness(0.9) contrast(1.1)' : 'none'}; }
            .marker {
              position:absolute; width:14px; height:14px; background-color:#7C3AED; /* purple */
              border:2px solid white; border-radius:50%;
              transform:translate(-50%, -50%);
              box-shadow:0 0 3px rgba(0,0,0,0.5);
              cursor:pointer; z-index:5; transition: transform 0.2s ease; pointer-events:auto;
            }
            .marker:hover { transform: translate(-50%, -50%) scale(1.2); }
            #marker {
              position:absolute; width:18px; height:18px; background-color:#0EA5E9; /* sky */
              border:2px solid white; border-radius:50%;
              transform:translate(-50%, -50%);
              z-index:10; pointer-events:auto;
            }
          </style>
        </head>
        <body>
          <div id="container">
            <div id="zoomable-area">
              <img id="floorplan" src="${selectedFloorplan?.downloadURL}" alt="Floorplan" />
              ${markers}
              ${currentMarker}
            </div>
          </div>

          <script>
            const container = document.getElementById('container');
            const zoomableArea = document.getElementById('zoomable-area');
            const floorplan = document.getElementById('floorplan');

            let currentScale = 1;
            let currentOffsetX = 0;
            let currentOffsetY = 0;
            let startDistance = 0;
            let lastX = 0;
            let lastY = 0;
            let isDragging = false;
            let clickStartTime = 0;
            let clickStartX = 0;
            let clickStartY = 0;
            let lastTapTime = 0;
            let tapTimeout = null;
            let touchHandled = false;

            function applyTransform() {
              zoomableArea.style.transform = \`translate(\${currentOffsetX}px, \${currentOffsetY}px) scale(\${currentScale})\`;
            }
            function updateMarkerScales() {
              const markers = document.querySelectorAll('.marker, #marker');
              const inverseScale = 1 / currentScale;
              markers.forEach(marker => {
                const originalTransform = marker.style.transform;
                if (originalTransform.includes('translate')) {
                  marker.style.transform = originalTransform.replace(/scale\\([^)]*\\)/, '') + \` scale(\${inverseScale})\`;
                } else {
                  marker.style.transform = \`translate(-50%, -50%) scale(\${inverseScale})\`;
                }
              });
            }
            function getDistance(x1,y1,x2,y2){ const dx=x2-x1, dy=y2-y1; return Math.sqrt(dx*dx+dy*dy); }
            function handleTap(x,y){
              const element = document.elementFromPoint(x,y);
              if (element && (element.classList.contains('marker') || element.id === 'marker')) return;

              const rect = container.getBoundingClientRect();
              const containerX = x - rect.left;
              const containerY = y - rect.top;

              const adjustedX = (containerX - currentOffsetX) / currentScale;
              const adjustedY = (containerY - currentOffsetY) / currentScale;

              const imageX = adjustedX / rect.width;
              const imageY = adjustedY / rect.height;

              if (imageX >= 0 && imageX <= 1 && imageY >= 0 && imageY <= 1) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type:'tap', x:imageX, y:imageY }));
              }
            }
            function onMarkerClick(markerId){
              window.ReactNativeWebView.postMessage(JSON.stringify({ type:'marker_click', id:markerId }));
            }

            document.addEventListener('touchstart', function(e){
              touchHandled = false;
              if (tapTimeout) { clearTimeout(tapTimeout); tapTimeout = null; }
              if (e.touches.length === 2) {
                startDistance = getDistance(
                  e.touches[0].clientX, e.touches[0].clientY,
                  e.touches[1].clientX, e.touches[1].clientY
                );
                e.preventDefault();
                touchHandled = true;
              } else if (e.touches.length === 1) {
                if (currentScale > 1) {
                  lastX = e.touches[0].clientX; lastY = e.touches[0].clientY; isDragging = true;
                }
                clickStartTime = Date.now(); clickStartX = e.touches[0].clientX; clickStartY = e.touches[0].clientY;
              }
            }, { passive:false });

            document.addEventListener('touchmove', function(e){
              if (e.touches.length === 2) {
                const distance = getDistance(
                  e.touches[0].clientX, e.touches[0].clientY,
                  e.touches[1].clientX, e.touches[1].clientY
                );
                if (startDistance > 0) {
                  const newScale = Math.min(Math.max(currentScale * (distance / startDistance), 0.5), 5);
                  const pinchCenterX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                  const pinchCenterY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                  const rect = container.getBoundingClientRect();
                  const scaleDiff = newScale - currentScale;
                  currentOffsetX -= (pinchCenterX - rect.left - currentOffsetX) * scaleDiff / currentScale;
                  currentOffsetY -= (pinchCenterY - rect.top - currentOffsetY) * scaleDiff / currentScale;
                  currentScale = newScale; startDistance = distance;
                  applyTransform(); updateMarkerScales();
                }
                e.preventDefault(); touchHandled = true;
              } else if (e.touches.length === 1 && isDragging && currentScale > 1) {
                const deltaX = e.touches[0].clientX - lastX;
                const deltaY = e.touches[0].clientY - lastY;
                currentOffsetX += deltaX; currentOffsetY += deltaY;
                applyTransform();
                lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;

                const moveDistance = Math.sqrt(Math.pow(e.touches[0].clientX - clickStartX,2) + Math.pow(e.touches[0].clientY - clickStartY,2));
                if (moveDistance > 10) { clickStartTime = 0; touchHandled = true; }
                e.preventDefault();
              }
            }, { passive:false });

            document.addEventListener('touchend', function(e){
              if (e.touches.length < 2) startDistance = 0;
              if (e.touches.length === 0) {
                isDragging = false;
                const clickDuration = Date.now() - clickStartTime;
                const currentTime = Date.now();
                if (clickDuration < 300 && clickStartTime > 0 && !touchHandled) {
                  if (currentTime - lastTapTime < 300) {
                    currentScale = 1; currentOffsetX = 0; currentOffsetY = 0; applyTransform(); updateMarkerScales(); lastTapTime = 0;
                  } else {
                    tapTimeout = setTimeout(() => { handleTap(clickStartX, clickStartY); tapTimeout = null; }, 300);
                    lastTapTime = currentTime;
                  }
                }
                clickStartTime = 0;
              }
            });

            if (!('ontouchstart' in window)) {
              floorplan.addEventListener('click', function(e) {
                const rect = floorplan.getBoundingClientRect();
                const x = (e.offsetX / rect.width);
                const y = (e.offsetY / rect.height);
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'tap', x, y }));
              });
            }

            floorplan.addEventListener('load', function(){ updateMarkerScales(); });
          </script>
        </body>
      </html>
    `;
  };

  // Save new beacon at selected coords
  const saveBeacon = async () => {
    if (!selectedFloorplan || !coords) {
      setErrorTitle('Missing selection');
      setErrorMessage('Please select Location, Building, Floor, and tap a spot on the floorplan.');
      setShowErrorPopup(true);
      return;
    }
    if (!beaconUUID || !beaconMajor || !beaconMinor) {
      setErrorTitle('Missing beacon details');
      setErrorMessage('Please fill UUID, Major, and Minor.');
      setShowErrorPopup(true);
      return;
    }
    const numMajor = Number(beaconMajor);
    const numMinor = Number(beaconMinor);
    const tx = Number(txPowerAt1m || '-59');

    try {
      setIsLoading(true);
      const col = firestore().collection(
        `locations/${selectedFloorplan.locationId}/buildingPOIs/${selectedFloorplan.buildingId}/floorplans/${selectedFloorplan.floorLabel}/beacons`,
      );
      await col.add({
        uuid: beaconUUID.trim(),
        major: numMajor,
        minor: numMinor,
        x: coords.x,
        y: coords.y,
        txPowerAt1m: tx,
        label: beaconLabel.trim(),
        buildingId: selectedFloorplan.buildingId,
        floorId: selectedFloorplan.floorLabel,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      // Reset form
      setBeaconLabel('');
      setBeaconUUID('');
      setBeaconMajor('');
      setBeaconMinor('');
      setTxPowerAt1m('-59');
      setCoords(null);

      await fetchBeacons();
      setSuccessMessage('Beacon placed on this floor.');
      setShowSuccessPopup(true);
    } catch (e) {
      console.error(e);
      setErrorTitle('Error');
      setErrorMessage('Failed to save beacon.');
      setShowErrorPopup(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title="Indoor Positioning – Bluetooth Beacons" />

      <ScrollView style={styles.scroll}>
        {/* Location, Building, and Floor Selection Flow */}
        <BeaconPositioningFlow
          role={role}
          adminLocations={adminLocations}
          buildingId={props.buildingId}
          floorId={props.floorId}
          onFloorplanSelect={handleFloorplanSelect}
        />

        {/* Floorplan View */}
        {selectedFloorplan && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.primary }]}>
              Step 4: Tap existing beacons to view/delete, or tap empty space to place a new beacon
            </Text>

            <View style={{ height: 300, marginVertical: 12 }}>
              <WebView
                ref={webViewRef}
                source={{ html: getHTML() }}
                onMessage={handleMessage}
                originWhitelist={['*']}
              />
            </View>

            {/* Add beacon form when a map coordinate is selected */}
            {coords && (
              <>
                <Text style={{ color: colors.text, marginBottom: 8 }}>
                  Selected Coordinates: ({coords.x.toFixed(3)}, {coords.y.toFixed(3)})
                </Text>

                <TextInput
                  style={[styles.input, { borderColor: colors.primary, color: colors.text }]}
                  placeholder="Label (e.g., Door NE)"
                  placeholderTextColor={colors.text}
                  value={beaconLabel}
                  onChangeText={setBeaconLabel}
                />
                <TextInput
                  style={[styles.input, { borderColor: colors.primary, color: colors.text }]}
                  placeholder="UUID (from Minew app)"
                  placeholderTextColor={colors.text}
                  autoCapitalize="none"
                  value={beaconUUID}
                  onChangeText={setBeaconUUID}
                />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TextInput
                    style={[styles.inputHalf, { borderColor: colors.primary, color: colors.text }]}
                    placeholder="Major"
                    placeholderTextColor={colors.text}
                    keyboardType="numeric"
                    value={beaconMajor}
                    onChangeText={setBeaconMajor}
                  />
                  <TextInput
                    style={[styles.inputHalf, { borderColor: colors.primary, color: colors.text }]}
                    placeholder="Minor"
                    placeholderTextColor={colors.text}
                    keyboardType="numeric"
                    value={beaconMinor}
                    onChangeText={setBeaconMinor}
                  />
                </View>
                <TextInput
                  style={[styles.input, { borderColor: colors.primary, color: colors.text }]}
                  placeholder="txPowerAt1m (default: -59)"
                  placeholderTextColor={colors.text}
                  keyboardType="numeric"
                  value={txPowerAt1m}
                  onChangeText={setTxPowerAt1m}
                />

                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <TouchableOpacity
                    onPress={saveBeacon}
                    style={[styles.btn, { backgroundColor: colors.primary }]}
                  >
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Save Beacon</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setCoords(null);
                      setBeaconLabel('');
                      setBeaconUUID('');
                      setBeaconMajor('');
                      setBeaconMinor('');
                      setTxPowerAt1m('-59');
                    }}
                    style={[styles.btn, { backgroundColor: colors.card }]}
                  >
                    <Text style={{ color: colors.text }}>Cancel</Text>
                  </TouchableOpacity>
                </View>

                <Text style={{ color: colors.text, marginTop: 8, opacity: 0.8 }}>
                  Tip: You can start with txPowerAt1m = -59 and refine later using a 1 m calibration
                  (stand 1 m away, average RSSI for ~15 s).
                </Text>
              </>
            )}
          </View>
        )}
      </ScrollView>

      {isLoading && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {/* Coordinates Selected Popup */}
      <StandardPopup
        visible={showCoordinatesPopup}
        title="Coordinates Selected"
        message={
          selectedCoordinates
            ? `Location Selected\n\nX: ${selectedCoordinates.x.toFixed(3)}\nY: ${selectedCoordinates.y.toFixed(3)}\n\nFill in the beacon details (UUID/Major/Minor) and Save.`
            : ''
        }
        onConfirm={() => {
          setShowCoordinatesPopup(false);
          setSelectedCoordinates(null);
        }}
        onCancel={() => {
          setShowCoordinatesPopup(false);
          setSelectedCoordinates(null);
          setCoords(null);
        }}
        confirmText="Continue"
        cancelText="Cancel"
        showCancel={true}
      />

      {/* Beacon Info Popup */}
      <StandardPopup
        visible={showBeaconInfoPopup}
        title="Beacon Information"
        message={
          selectedBeaconInfo
            ? ` ${selectedBeaconInfo.label || 'Beacon'}\n\nUUID: ${selectedBeaconInfo.uuid}\nMajor/Minor: ${selectedBeaconInfo.major}/${selectedBeaconInfo.minor}\nCoords: (${selectedBeaconInfo.x.toFixed(3)}, ${selectedBeaconInfo.y.toFixed(3)})\nTx@1m: ${selectedBeaconInfo.txPowerAt1m} dBm`
            : ''
        }
        onConfirm={() => {
          setShowBeaconInfoPopup(false);
          setBeaconToDelete(selectedBeaconInfo || null);
          setShowDeleteConfirmation(true);
        }}
        onCancel={() => {
          setShowBeaconInfoPopup(false);
          setSelectedBeaconInfo(null);
        }}
        confirmText="Delete"
        cancelText="Close"
        showCancel={true}
      />

      {/* Delete Confirmation */}
      <StandardPopup
        visible={showDeleteConfirmation}
        title="Delete Beacon"
        message={`Are you sure you want to delete "${beaconToDelete?.label || 'this beacon'}"?\n\nThis action cannot be undone.`}
        onConfirm={handleDeleteBeacon}
        onCancel={() => {
          setShowDeleteConfirmation(false);
          setBeaconToDelete(null);
        }}
        confirmText="Delete"
        cancelText="Cancel"
        showCancel={true}
      />

      {/* Error Popup */}
      <StandardPopup
        visible={showErrorPopup}
        title={errorTitle}
        message={errorMessage}
        onConfirm={() => setShowErrorPopup(false)}
        confirmText="OK"
        showCancel={false}
      />

      {/* Success Popup */}
      <StandardPopup
        visible={showSuccessPopup}
        title="Success"
        message={successMessage}
        onConfirm={() => setShowSuccessPopup(false)}
        confirmText="OK"
        showCancel={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1, paddingHorizontal: 16 },
  section: { marginVertical: 16 },
  label: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  item: {
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  inputHalf: {
    flex: 1,
    borderWidth: 1,
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  btn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
