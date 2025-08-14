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
import DropDownPicker from 'react-native-dropdown-picker';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { WebView } from 'react-native-webview';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import WiFiFingerprintCollector from '../molecules/WiFiFingerprintCollector';
import SettingsHeader from '../molecules/SettingsHeader';
import StandardPopup from '../atoms/StandardPopup';

export default function AdminIndoorPositioningContent() {
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const webViewRef = useRef<WebView>(null);

  const [role, setRole] = useState<string | null>(null);
  const [adminLocations, setAdminLocations] = useState<string[]>([]);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [buildings, setBuildings] = useState<{ id: string; name: string }[]>([]);
  const [floorplans, setFloorplans] = useState<any[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [selectedFloorplan, setSelectedFloorplan] = useState<any | null>(null);
  const [selectedBuildingName, setSelectedBuildingName] = useState<string | null>(null);
  const [buildingDropdownItems, setBuildingDropdownItems] = useState<{ label: string; value: string }[]>([]);
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pointName, setPointName] = useState('');
  const [existingPoints, setExistingPoints] = useState<{ id: string; x: number; y: number; description?: string }[]>([]);
  const [buildingDropdownOpen, setBuildingDropdownOpen] = useState(false);
  const [floorDropdownOpen, setFloorDropdownOpen] = useState(false);

  // Popup states
  const [showPointInfoPopup, setShowPointInfoPopup] = useState(false);
  const [selectedPointInfo, setSelectedPointInfo] = useState<{ id: string; x: number; y: number; description?: string } | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [pointToDelete, setPointToDelete] = useState<{ id: string; description?: string } | null>(null);
  const [showCoordinatesPopup, setShowCoordinatesPopup] = useState(false);
  const [selectedCoordinates, setSelectedCoordinates] = useState<{ x: number; y: number } | null>(null);

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

  useEffect(() => {
    const fetchLocations = async () => {
      const locSnap = await firestore().collection('locations').get();
      const all = locSnap.docs.map(doc => ({ id: doc.id, name: doc.data().name || doc.id }));
      const filtered = role === 'editor' ? all.filter(loc => adminLocations.includes(loc.id)) : all;
      setLocations(filtered);
    };
    if (role) fetchLocations();
  }, [role, adminLocations]);

  useEffect(() => {
    const fetchBuildings = async () => {
      if (!selectedLocation) return;
      const snap = await firestore().collection(`locations/${selectedLocation}/buildingPOIs`).get();
      const list = snap.docs.map(doc => ({ id: doc.id, name: doc.data().name || doc.id }));
      setBuildings(list);
      setBuildingDropdownItems(list.map((b) => ({ label: b.name, value: b.id })));
      setSelectedBuildingId(null);
      setSelectedFloorplan(null);
    };
    if (selectedLocation) fetchBuildings();
  }, [selectedLocation]);

  useEffect(() => {
    const fetchFloorplans = async () => {
      if (!selectedLocation || !selectedBuildingId) return;
      const snap = await firestore()
        .collection(`locations/${selectedLocation}/buildingPOIs/${selectedBuildingId}/floorplans`)
        .get();
      const list = snap.docs.map(doc => {
        const d = doc.data();
        return {
          locationId: selectedLocation,
          buildingId: selectedBuildingId,
          floorLabel: d.floorLabel || doc.id,
          downloadURL: d.downloadURL,
          id: `${selectedBuildingId}_${d.floorLabel || doc.id}`,
        };
      });
      setFloorplans(list);
    };
    if (selectedBuildingId) fetchFloorplans();
  }, [selectedBuildingId]);

  const fetchPoints = async () => {
    if (!selectedLocation || !selectedBuildingId || !selectedFloorplan) return;
    const snap = await firestore()
      .collection(`locations/${selectedLocation}/wifiFingerprints`)
      .where('buildingId', '==', selectedBuildingId)
      .where('floorId', '==', selectedFloorplan.floorLabel)
      .get();

    const list = snap.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        x: data.coordinates?.x,
        y: data.coordinates?.y,
        description: data.description || 'WiFi Point',
      };
    });

    console.log('📌 Stored WiFi fingerprint locations:');
    list.forEach((point, i) => {
      console.log(`  ${i + 1}. ${point.description} at (${point.x?.toFixed(3)}, ${point.y?.toFixed(3)})`);
    });

    setExistingPoints(list);
  };

  useEffect(() => {
    fetchPoints();
  }, [selectedFloorplan, coords, pointName]);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'tap') {
        setCoords({ x: data.x, y: data.y });
        setSelectedCoordinates({ x: data.x, y: data.y });
        setShowCoordinatesPopup(true);
      } else if (data.type === 'marker_click' && data.id) {
        // Find the point info and show popup
        const point = existingPoints.find(p => p.id === data.id);
        if (point) {
          setSelectedPointInfo(point);
          setShowPointInfoPopup(true);
        }
      }
    } catch (err) {
      console.error('Invalid message from WebView', err);
    }
  };

  const handleDeletePoint = async () => {
    if (!pointToDelete) return;
    
    try {
      await firestore()
        .collection(`locations/${selectedLocation}/wifiFingerprints`)
        .doc(pointToDelete.id)
        .delete();
      
      await fetchPoints();
      setShowDeleteConfirmation(false);
      setPointToDelete(null);
    } catch (error) {
      console.error('Error deleting WiFi point:', error);
    }
  };

  const getHTML = () => {
    const markers = existingPoints
      .map(
        (p) => `<div onclick="onMarkerClick('${p.id}')" data-id="${p.id}" class="marker" style="position:absolute;left:${p.x * 100}%;top:${p.y * 100}%;
          transform:translate(-50%,-50%);width:12px;height:12px;border-radius:6px;
          background:red;border:2px solid white;cursor:pointer;z-index:5;"></div>`
      )
      .join('');

    const currentMarker = coords
      ? `<div id="marker"
            style="position:absolute;left:${coords.x * 100}%;top:${coords.y * 100}%;
            transform:translate(-50%,-50%);
            width:16px;height:16px;border-radius:8px;
            background:blue;border:2px solid white;
            cursor:pointer;z-index:10;"></div>`
      : '';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
          <style>
            body {
              margin: 0;
              padding: 0;
              overflow: hidden;
              background: ${colors.background};
              touch-action: manipulation;
            }
            #container {
              position: relative;
              width: 100vw;
              height: 100vh;
              overflow: hidden;
            }
            #zoomable-area {
              position: absolute;
              transform-origin: 0 0;
              transition: none;
              width: 100%;
              height: 100%;
            }
            #floorplan { 
              width: 100%; 
              height: 100%; 
              object-fit: contain;
              display: block;
              filter: ${isDark ? 'brightness(0.9) contrast(1.1)' : 'none'};
            }
            .marker { 
              position: absolute; 
              width: 12px; 
              height: 12px; 
              background-color: red; 
              border: 2px solid white;
              border-radius: 50%; 
              transform: translate(-50%, -50%);
              box-shadow: 0 0 3px rgba(0,0,0,0.5);
              cursor: pointer;
              z-index: 5;
              transition: transform 0.2s ease;
              pointer-events: auto;
            }
            .marker:hover {
              transform: translate(-50%, -50%) scale(1.2);
            }
            #marker {
              background-color: blue;
              width: 16px;
              height: 16px;
              z-index: 10;
              pointer-events: auto;
            }
          </style>
        </head>
        <body>
          <div id="container">
            <div id="zoomable-area">
              <img id="floorplan" src="${selectedFloorplan.downloadURL}" alt="Floorplan" />
              ${markers}
              ${currentMarker}
            </div>
          </div>

          <script>
            const container = document.getElementById('container');
            const zoomableArea = document.getElementById('zoomable-area');
            const floorplan = document.getElementById('floorplan');
            
            // EXACT SAME zoom and pan variables as AdminFloorplanEditorContent
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
                // Keep markers at consistent visual size regardless of zoom
                const originalTransform = marker.style.transform;
                if (originalTransform.includes('translate')) {
                  marker.style.transform = originalTransform.replace(/scale\\([^)]*\\)/, '') + \` scale(\${inverseScale})\`;
                } else {
                  marker.style.transform = \`translate(-50%, -50%) scale(\${inverseScale})\`;
                }
              });
            }

            function getDistance(x1, y1, x2, y2) {
              const xDiff = x2 - x1;
              const yDiff = y2 - y1;
              return Math.sqrt(xDiff * xDiff + yDiff * yDiff);
            }

            function handleTap(x, y) {
              const element = document.elementFromPoint(x, y);
              
              // Don't place marker if clicking on existing marker
              if (element && (element.classList.contains('marker') || element.id === 'marker')) {
                return;
              }
              
              // FIXED: Use exact same coordinate calculation as AdminFloorplanEditorContent
              const rect = container.getBoundingClientRect();
              const containerX = x - rect.left;
              const containerY = y - rect.top;
              
              // Account for current zoom and pan
              const adjustedX = (containerX - currentOffsetX) / currentScale;
              const adjustedY = (containerY - currentOffsetY) / currentScale;
              
              // Convert to image coordinates (0-1 range)
              const imageX = adjustedX / rect.width;
              const imageY = adjustedY / rect.height;
              
              // Ensure coordinates are within bounds
              if (imageX >= 0 && imageX <= 1 && imageY >= 0 && imageY <= 1) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'tap',
                  x: imageX,
                  y: imageY
                }));
              }
            }

            // Handle marker clicks
            function onMarkerClick(markerId) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'marker_click',
                id: markerId
              }));
            }

            // EXACT SAME touch event handlers as AdminFloorplanEditorContent
            document.addEventListener('touchstart', function(e) {
              touchHandled = false;
              
              // Clear any pending tap timeout
              if (tapTimeout) {
                clearTimeout(tapTimeout);
                tapTimeout = null;
              }
              
              if (e.touches.length === 2) {
                startDistance = getDistance(
                  e.touches[0].clientX, e.touches[0].clientY,
                  e.touches[1].clientX, e.touches[1].clientY
                );
                e.preventDefault();
                touchHandled = true;
              } else if (e.touches.length === 1) {
                if (currentScale > 1) {
                  lastX = e.touches[0].clientX;
                  lastY = e.touches[0].clientY;
                  isDragging = true;
                }
                
                clickStartTime = Date.now();
                clickStartX = e.touches[0].clientX;
                clickStartY = e.touches[0].clientY;
              }
            }, { passive: false });

            document.addEventListener('touchmove', function(e) {
              if (e.touches.length === 2) {
                const distance = getDistance(
                  e.touches[0].clientX, e.touches[0].clientY,
                  e.touches[1].clientX, e.touches[1].clientY
                );
                
                if (startDistance > 0) {
                  const newScale = Math.min(Math.max(currentScale * (distance / startDistance), 0.5), 5);
                  
                  // Get pinch center
                  const pinchCenterX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                  const pinchCenterY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                  
                  // Calculate new offset to zoom around pinch center
                  const scaleDiff = newScale - currentScale;
                  const rect = container.getBoundingClientRect();
                  
                  currentOffsetX -= (pinchCenterX - rect.left - currentOffsetX) * scaleDiff / currentScale;
                  currentOffsetY -= (pinchCenterY - rect.top - currentOffsetY) * scaleDiff / currentScale;
                  
                  currentScale = newScale;
                  startDistance = distance;
                  
                  applyTransform();
                  updateMarkerScales();
                }
                
                e.preventDefault();
                touchHandled = true;
              } else if (e.touches.length === 1 && isDragging && currentScale > 1) {
                const deltaX = e.touches[0].clientX - lastX;
                const deltaY = e.touches[0].clientY - lastY;
                
                currentOffsetX += deltaX;
                currentOffsetY += deltaY;
                
                applyTransform();
                
                lastX = e.touches[0].clientX;
                lastY = e.touches[0].clientY;
                
                const moveDistance = Math.sqrt(
                  Math.pow(e.touches[0].clientX - clickStartX, 2) +
                  Math.pow(e.touches[0].clientY - clickStartY, 2)
                );
                
                if (moveDistance > 10) {
                  clickStartTime = 0;
                  touchHandled = true;
                }
                
                e.preventDefault();
              }
            }, { passive: false });

            document.addEventListener('touchend', function(e) {
              if (e.touches.length < 2) {
                startDistance = 0;
              }
              
              if (e.touches.length === 0) {
                isDragging = false;
                
                const clickDuration = Date.now() - clickStartTime;
                const currentTime = Date.now();
                
                // Handle single tap - only if not handled by other touch events
                if (clickDuration < 300 && clickStartTime > 0 && !touchHandled) {
                  // Check for double tap
                  if (currentTime - lastTapTime < 300) {
                    // Double tap detected - reset zoom
                    currentScale = 1;
                    currentOffsetX = 0;
                    currentOffsetY = 0;
                    applyTransform();
                    updateMarkerScales();
                    lastTapTime = 0;
                  } else {
                    // Single tap - set a timeout to handle it if no second tap comes
                    tapTimeout = setTimeout(() => {
                      handleTap(clickStartX, clickStartY);
                      tapTimeout = null;
                    }, 300);
                    lastTapTime = currentTime;
                  }
                }
                
                clickStartTime = 0;
              }
            });

            // Remove mouse/click events to prevent double firing on mobile
            // Only add mouse events if not on a touch device
            if (!('ontouchstart' in window)) {
              floorplan.addEventListener('click', function(e) {
                const rect = floorplan.getBoundingClientRect();
                const x = (e.offsetX / rect.width);
                const y = (e.offsetY / rect.height);
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'tap', x, y }));
              });
            }

            // Initialize marker scales when image loads
            floorplan.addEventListener('load', function() {
              updateMarkerScales();
            });
          </script>
        </body>
      </html>
    `;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title="Indoor Positioning" />
      <ScrollView style={styles.scroll}>
        {/* Location Select */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.primary }]}>Step 1: Select Location</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {locations.map((loc) => (
              <TouchableOpacity
                key={loc.id}
                style={[
                  styles.item,
                  { backgroundColor: selectedLocation === loc.id ? colors.primary : colors.card },
                ]}
                onPress={() => {
                  setSelectedLocation(loc.id);
                  setSelectedBuildingId(null);
                  setSelectedFloorplan(null);
                  setCoords(null);
                }}
              >
                <Text style={{ color: selectedLocation === loc.id ? '#FFF' : colors.text }}>
                  {loc.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Building Select */}
        {selectedLocation && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.primary }]}>Step 2: Select Building</Text>
            <DropDownPicker
              open={buildingDropdownOpen}
              setOpen={setBuildingDropdownOpen}
              items={buildingDropdownItems}
              setItems={setBuildingDropdownItems}
              value={selectedBuildingId}
              setValue={(val) => {
                const id = val();
                setSelectedBuildingId(id);
                setSelectedBuildingName(buildings.find((b) => b.id === id)?.name || '');
              }}
              searchable
              placeholder="Select a building"
              zIndex={3000}
              zIndexInverse={1000}
              style={{ backgroundColor: colors.card, borderColor: colors.primary }}
              dropDownContainerStyle={{ backgroundColor: colors.card }}
              textStyle={{ color: colors.text }}
              searchTextInputStyle={{ color: colors.text }}
            />
          </View>
        )}

        {/* Floor Select */}
        {selectedBuildingId && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.primary }]}>Step 3: Select Floor</Text>
            <DropDownPicker
              open={floorDropdownOpen}
              setOpen={setFloorDropdownOpen}
              items={floorplans.map((fp) => ({ label: `Floor ${fp.floorLabel}`, value: fp.id }))}
              value={selectedFloorplan?.id || null}
              setValue={(val) => {
                const match = floorplans.find((fp) => fp.id === val());
                setSelectedFloorplan(match || null);
                setCoords(null);
              }}
              placeholder="Select a floor"
              style={{ backgroundColor: colors.card, borderColor: colors.primary }}
              dropDownContainerStyle={{ backgroundColor: colors.card }}
              textStyle={{ color: colors.text }}
              searchTextInputStyle={{ color: colors.text }}
            />
          </View>
        )}

        {/* Floorplan View */}
        {selectedFloorplan && (
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.primary }]}>
              Step 4: Tap WiFi Points to View Info, or Tap Empty Space to Add New Point
            </Text>
            <View style={{ height: 300, marginVertical: 12 }}>
              <WebView ref={webViewRef} source={{ html: getHTML() }} onMessage={handleMessage} originWhitelist={['*']} />
            </View>

            {coords && (
              <>
                <TextInput
                  style={{
                    borderColor: colors.primary,
                    borderWidth: 1,
                    padding: 8,
                    color: colors.text,
                    marginBottom: 8,
                  }}
                  placeholder="Enter point name (e.g. lab)"
                  placeholderTextColor={colors.text}
                  value={pointName}
                  onChangeText={setPointName}
                />
                <Text style={{ color: colors.text }}>
                  Selected Coordinates: ({coords.x.toFixed(3)}, {coords.y.toFixed(3)})
                </Text>
                <WiFiFingerprintCollector
                  locationId={selectedLocation}
                  buildingId={selectedFloorplan.buildingId}
                  buildingName={selectedBuildingName || ''}
                  floorId={selectedFloorplan.floorLabel}
                  coordinates={coords}
                  description={pointName}
                  type="user_point"
                  onFingerprintCollected={() => {
                    setCoords(null);
                    setPointName('');
                    fetchPoints();
                  }}
                />
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

      {/* Coordinates Selection Popup */}
      <StandardPopup
        visible={showCoordinatesPopup}
        title="Coordinates Selected"
        message={selectedCoordinates ? 
          ` Location Selected\n\nCoordinates:\nX: ${selectedCoordinates.x.toFixed(3)}\nY: ${selectedCoordinates.y.toFixed(3)}\n\nYou can now add a WiFi fingerprint at this location.` 
          : ''
        }
        onConfirm={() => {
          setShowCoordinatesPopup(false);
          setSelectedCoordinates(null);
        }}
        onCancel={() => {
          setShowCoordinatesPopup(false);
          setSelectedCoordinates(null);
          setCoords(null); // Clear coordinates if cancelled
        }}
        confirmText="Continue"
        cancelText="Cancel"
        showCancel={true}
      />

      {/* WiFi Point Info Popup */}
      <StandardPopup
        visible={showPointInfoPopup}
        title="WiFi Point Information"
        message={selectedPointInfo ? 
          ` ${selectedPointInfo.description || 'WiFi Point'}\n\nCoordinates:\nX: ${selectedPointInfo.x.toFixed(3)}\nY: ${selectedPointInfo.y.toFixed(3)}` 
          : ''
        }
        onConfirm={() => {
          setShowPointInfoPopup(false);
          // Show delete confirmation
          setPointToDelete({
            id: selectedPointInfo?.id || '',
            description: selectedPointInfo?.description || 'WiFi Point'
          });
          setShowDeleteConfirmation(true);
        }}
        onCancel={() => {
          setShowPointInfoPopup(false);
          setSelectedPointInfo(null);
        }}
        confirmText="Delete Point"
        cancelText="Close"
        showCancel={true}
      />

      {/* Delete Confirmation Popup */}
      <StandardPopup
        visible={showDeleteConfirmation}
        title="Delete WiFi Point"
        message={`Are you sure you want to delete "${pointToDelete?.description || 'this WiFi point'}"?\n\nThis action cannot be undone.`}
        onConfirm={handleDeletePoint}
        onCancel={() => {
          setShowDeleteConfirmation(false);
          setPointToDelete(null);
        }}
        confirmText="Delete"
        cancelText="Cancel"
        showCancel={true}
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
});