import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import AppButton from '../atoms/AppButton';
import AppSecondaryButton from '../atoms/AppSecondaryButton';
import Modal from 'react-native-modal';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme/ThemeContext';
import { getThemeColors } from '../../theme';
import firestore from '@react-native-firebase/firestore';
import type { StackNavigationProp } from '@react-navigation/stack';

type FloorplanEditorScreenRouteParams = {
  buildingId: string;
  floorLabel: string;
  imageUri: string;
};

interface RoomPOI {
  id: string;
  name: string;
  buildingId: string;
  floorId: string;
  coordinates: { x: number; y: number };
  type: string;
  description: string | null;
}

type Point = { x: number; y: number } | null;

export default function AdminFloorplanEditorContent() {
  const route = useRoute<RouteProp<{ params: FloorplanEditorScreenRouteParams }, 'params'>>();
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const isDarkMode = isDark;

  // Define all hooks at the top level before any conditional returns
  const webViewRef = useRef<WebView>(null);
  const [roomMarkers, setRoomMarkers] = useState<RoomPOI[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentPoint, setCurrentPoint] = useState<Point>(null);
  const [roomData, setRoomData] = useState({
    name: '',
    type: 'classroom',
    description: '',
  });
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Get route params with a safe default
  const { buildingId, floorLabel, imageUri } = route.params || {
    buildingId: '',
    floorLabel: '',
    imageUri: '',
  };

  // IMPORTANT: Place all useEffect hooks before any conditional returns
  // Load existing room POIs
  useEffect(() => {
    // Only load POIs if we have valid parameters
    if (!route.params || !buildingId || !floorLabel) {
      return; // Skip loading if we don't have valid params
    }

    const loadRoomPOIs = async () => {
      try {
        const snapshot = await firestore()
          .collection('RoomPOIs')
          .where('buildingId', '==', buildingId)
          .where('floorId', '==', floorLabel)
          .get();

        const markers = snapshot.docs.map((doc) => ({
          ...(doc.data() as RoomPOI),
        }));
        setRoomMarkers(markers as RoomPOI[]);

        // Add markers to WebView when it's ready
        if (markers.length > 0) {
          setTimeout(() => {
            markers.forEach((marker) => {
              webViewRef.current?.injectJavaScript(`
                addMarker("${marker.id}", ${marker.coordinates.x}, ${marker.coordinates.y}, "${marker.name}");
                true;
              `);
            });
          }, 1000); // Wait for WebView to load
        }
      } catch (error) {
        console.error('Error loading room POIs:', error);
      }
    };

    loadRoomPOIs();
  }, [buildingId, floorLabel, route.params]);

  // After all hooks, we can have conditional returns
  // Add defensive check for route.params
  if (!route.params) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
          backgroundColor: colors.background,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20, color: colors.text }}>
          Missing floorplan information
        </Text>
        <Text style={{ textAlign: 'center', marginBottom: 20, color: colors.text }}>
          Please select a floorplan from the edit screen or make sure you&apos;ve initialized the
          pre-bundled floorplans.
        </Text>
        <AppButton
          title="Go Back"
          onPress={() => navigation.goBack()}
          style={{ backgroundColor: colors.primary }}
        />
      </View>
    );
  }

  // Additional safety check for each parameter
  if (!buildingId || !floorLabel || !imageUri) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 20,
          backgroundColor: colors.background,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20, color: colors.text }}>
          Incomplete floorplan data
        </Text>
        <Text style={{ textAlign: 'center', marginBottom: 20, color: colors.text }}>
          {!buildingId ? 'Missing building ID. ' : ''}
          {!floorLabel ? 'Missing floor label. ' : ''}
          {!imageUri ? 'Missing image URI. ' : ''}
          Please go back and try again.
        </Text>
        <AppButton
          title="Go Back"
          onPress={() => navigation.goBack()}
          style={{ backgroundColor: colors.primary }}
        />
      </View>
    );
  }

  // Generate HTML for WebView
  const getHTML = () => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes, maximum-scale=10.0">
        <style>
          body, html { 
            margin: 0; 
            padding: 0; 
            width: 100%; 
            height: 100%; 
            overflow: hidden; 
            touch-action: manipulation;
            background-color: ${isDarkMode ? '#121212' : '#ffffff'};
            color: ${isDarkMode ? '#ffffff' : '#000000'};
          }
          #container { 
            position: relative; 
            width: 100%; 
            height: 100%; 
            overflow: hidden;
          }
          #zoomable-area {
            position: absolute;
            transform-origin: 0 0;
            transition: transform 0.1s ease-out;
          }
          #floorplan { 
            width: 100%; 
            height: auto; 
            display: block;
            filter: ${isDarkMode ? 'brightness(0.9) contrast(1.1)' : 'none'};
          }
          .marker { 
            position: absolute; 
            width: 20px; 
            height: 20px; 
            background-color: ${colors.primary}; 
            border: 2px solid ${isDarkMode ? '#ffffff' : '#000000'};
            border-radius: 50%; 
            transform: translate(-50%, -50%);
            box-shadow: 0 0 5px rgba(0,0,0,0.5);
            cursor: pointer;
            z-index: 10;
            transform-origin: center center;
          }
          .marker.selected {
            background-color: #ff9800;
            box-shadow: 0 0 8px rgba(255,152,0,0.8);
          }
          .marker-label { 
            position: absolute; 
            top: 25px; 
            left: 50%;
            transform: translateX(-50%);
            background: ${isDarkMode ? '#333333' : 'white'}; 
            color: ${isDarkMode ? '#ffffff' : '#000000'};
            padding: 4px 8px; 
            font-size: 12px;
            border-radius: 4px;
            white-space: nowrap;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            pointer-events: none;
            transform-origin: center top;
          }
        </style>
      </head>
      <body>
        <div id="container">
          <div id="zoomable-area">
            <img id="floorplan" src="${imageUri}" onerror="console.error('Failed to load image: ' + this.src);" />
          </div>
        </div>
        
        <script>
          const container = document.getElementById('container');
          const zoomableArea = document.getElementById('zoomable-area');
          const floorplan = document.getElementById('floorplan');
          
          // Theme info from React Native
          const isDarkMode = ${isDarkMode};
          const themeColors = {
            background: "${colors.background}",
            text: "${colors.text}",
            border: "${colors.border}",
            primary: "${colors.primary}"
          };
          
          // Zoom variables
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
          
          // Update marker scales when zoom changes
          function updateMarkerScales() {
            const markers = document.querySelectorAll('.marker');
            const labels = document.querySelectorAll('.marker-label');
            
            const inverseScale = 1 / currentScale;
            
            markers.forEach(marker => {
              const isSelected = marker.classList.contains('selected');
              const baseScale = isSelected ? 1.2 : 1;
              marker.style.transform = \`translate(-50%, -50%) scale(\${baseScale * inverseScale})\`;
            });
            
            labels.forEach(label => {
              label.style.transform = \`translateX(-50%) scale(\${inverseScale})\`;
            });
          }
          
          // Handle pinch zoom
          document.addEventListener('touchstart', function(e) {
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
              
              // Handle single tap
              if (clickDuration < 300 && clickStartTime > 0) {
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
          
          function applyTransform() {
            zoomableArea.style.transform = \`translate(\${currentOffsetX}px, \${currentOffsetY}px) scale(\${currentScale})\`;
          }
          
          function handleTap(x, y) {
            const element = document.elementFromPoint(x, y);
            if (element && element.classList.contains('marker')) {
              return;
            }
            
            // Convert screen coordinates to image coordinates accounting for zoom and pan
            const rect = container.getBoundingClientRect();
            const imageRect = floorplan.getBoundingClientRect();
            
            // Calculate the position relative to the image
            const imageX = (x - imageRect.left) / imageRect.width;
            const imageY = (y - imageRect.top) / imageRect.height;
            
            // Ensure coordinates are within bounds
            if (imageX >= 0 && imageX <= 1 && imageY >= 0 && imageY <= 1) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'add_marker',
                x: imageX,
                y: imageY
              }));
            }
          }
          
          function getDistance(x1, y1, x2, y2) {
            const xDiff = x2 - x1;
            const yDiff = y2 - y1;
            return Math.sqrt(xDiff * xDiff + yDiff * yDiff);
          }
          
          // Function to add marker to the floorplan
          window.addMarker = function(id, x, y, label) {
            const existingMarker = document.getElementById('marker-' + id);
            if (existingMarker) {
              existingMarker.remove();
            }
            
            const marker = document.createElement('div');
            marker.className = 'marker';
            marker.id = 'marker-' + id;
            marker.dataset.id = id;
            
            // Position markers using absolute positioning relative to the image
            marker.style.left = (x * 100) + '%';
            marker.style.top = (y * 100) + '%';
            
            const labelEl = document.createElement('div');
            labelEl.className = 'marker-label';
            labelEl.textContent = label;
            marker.appendChild(labelEl);
            
            marker.addEventListener('click', function(e) {
              e.preventDefault();
              e.stopPropagation();
              
              document.querySelectorAll('.marker.selected').forEach(m => {
                m.classList.remove('selected');
              });
              
              marker.classList.add('selected');
              updateMarkerScales();
              
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'edit_marker',
                id: id
              }));
            });
            
            zoomableArea.appendChild(marker);
            updateMarkerScales();
          };
          
          window.highlightMarker = function(id) {
            document.querySelectorAll('.marker.selected').forEach(m => {
              m.classList.remove('selected');
            });
            
            const marker = document.getElementById('marker-' + id);
            if (marker) {
              marker.classList.add('selected');
              updateMarkerScales();
            }
          };
          
          // Initialize marker scales when image loads
          floorplan.addEventListener('load', function() {
            updateMarkerScales();
          });
        </script>
      </body>
      </html>
    `;
  };


  // Handle messages from WebView
  const handleMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'add_marker') {
        // Adding a new marker
        setCurrentPoint({ x: data.x, y: data.y });
        setIsEditing(false);
        setEditingRoomId(null);
        setRoomData({
          name: '',
          type: 'classroom',
          description: '',
        });
        setIsModalVisible(true);
      } else if (data.type === 'edit_marker') {
        // Editing an existing marker
        const roomToEdit = roomMarkers.find((room) => room.id === data.id);
        if (roomToEdit) {
          setEditingRoomId(data.id);
          setIsEditing(true);
          setCurrentPoint(roomToEdit.coordinates);
          setRoomData({
            name: roomToEdit.name,
            type: roomToEdit.type,
            description: roomToEdit.description || '',
          });
          setIsModalVisible(true);
        }
      }
    } catch (e) {
      console.error('Error parsing WebView message:', e);
    }
  };

  // Save or update room POI
  const saveRoomPOI = async () => {
    if (!roomData.name.trim()) {
      Alert.alert('Error', 'Room name is required');
      return;
    }
    if (!currentPoint) {
      Alert.alert('Error', 'No location selected for the room.');
      return;
    }

    try {
      let roomId = editingRoomId;

      if (!isEditing) {
        // Create a new room POI
        roomId = `room_${buildingId.replace(/\//g, '_')}_${floorLabel.replace(/\s/g, '_')}_${Date.now()}`;
      }

      // Create/update room POI object
      const roomPOI = {
        id: roomId as string,
        name: roomData.name,
        buildingId: buildingId,
        floorId: floorLabel,
        coordinates: {
          x: currentPoint.x,
          y: currentPoint.y,
        },
        type: roomData.type,
        description: roomData.description || null,
      };

      // Save to Firestore
      await firestore()
        .collection('RoomPOIs')
        .doc(roomId as string)
        .set(roomPOI);

      // Update local state
      if (isEditing) {
        // Replace the edited room in the array
        setRoomMarkers(roomMarkers.map((room) => (room.id === roomId ? roomPOI : room)));
      } else {
        // Add the new room to the array
        setRoomMarkers([...roomMarkers, roomPOI]);
      }

      // Add/update marker on WebView
      webViewRef.current?.injectJavaScript(`
        addMarker("${roomId}", ${currentPoint.x}, ${currentPoint.y}, "${roomData.name}");
        true;
      `);

      // Reset form
      setRoomData({ name: '', type: 'classroom', description: '' });
      setIsEditing(false);
      setEditingRoomId(null);
      setIsModalVisible(false);
    } catch (error) {
      console.error('Error saving room POI:', error);
      Alert.alert('Error', 'Failed to save room POI');
    }
  };

  // Delete room POI
  const deleteRoomPOI = async () => {
    if (!editingRoomId) {
      console.error('No room selected for deletion');
      return;
    }

    try {
      await firestore().collection('RoomPOIs').doc(editingRoomId).delete();

      // Remove from local state
      setRoomMarkers(roomMarkers.filter((room) => room.id !== editingRoomId));

      // Remove marker from WebView
      webViewRef.current?.injectJavaScript(`
        const markerToRemove = document.getElementById('marker-${editingRoomId}');
        if (markerToRemove) {
          markerToRemove.remove();
        }
        true;
      `);

      // Reset form and close modal
      setRoomData({ name: '', type: 'classroom', description: '' });
      setIsEditing(false);
      setEditingRoomId(null);
      setIsModalVisible(false);
    } catch (error) {
      console.error('Error deleting room POI:', error);
      Alert.alert('Error', 'Failed to delete room POI');
    }
  };

  // Show delete confirmation
  const confirmDelete = () => {
    Alert.alert('Delete Room', `Are you sure you want to delete ${roomData.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', onPress: deleteRoomPOI, style: 'destructive' },
    ]);
  };
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Add Room POIs - {floorLabel}
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.text }]}>
          Tap on the floorplan to add rooms or tap existing markers to edit
        </Text>
      </View>

      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: getHTML() }}
        onMessage={handleMessage}
        style={styles.webview}
        injectedJavaScriptBeforeContentLoaded={`
          window.isDarkMode = ${isDarkMode};
          window.themeColors = {
            background: "${colors.background}",
            text: "${colors.text}",
            border: "${colors.border}",
            primary: "${colors.primary}"
          };
          true;
        `}
      />

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Text style={[styles.footerText, { color: colors.text }]}>
          {roomMarkers.length} rooms added
        </Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.doneButton, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>

      {/* Modal for room details */}
      <Modal
        isVisible={isModalVisible}
        onBackdropPress={() => setIsModalVisible(false)}
        avoidKeyboard
      >
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            {isEditing ? 'Edit Room Details' : 'Add Room Details'}
          </Text>

          <TextInput
            placeholder="Room Name/Number"
            value={roomData.name}
            onChangeText={(text) => setRoomData({ ...roomData, name: text })}
            style={[
              styles.input,
              {
                borderColor: colors.border,
                color: colors.text,
                backgroundColor: colors.background,
              },
            ]}
            placeholderTextColor={colors.secondary}
          />

          <View style={styles.typeSelector}>
            <Text style={{ color: colors.text, marginBottom: 8 }}>Room Type:</Text>
            <View style={styles.typeOptions}>
              {['classroom', 'office', 'lab', 'restroom', 'stairs', 'elevator'].map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setRoomData({ ...roomData, type })}
                  style={[
                    styles.typeOption,
                    {
                      backgroundColor: roomData.type === type ? colors.primary : colors.card,
                      borderColor: colors.border,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: roomData.type === type ? '#FFFFFF' : colors.text,
                      fontSize: 14,
                    }}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TextInput
            placeholder="Description (optional)"
            value={roomData.description}
            onChangeText={(text) => setRoomData({ ...roomData, description: text })}
            style={[
              styles.input,
              {
                borderColor: colors.border,
                color: colors.text,
                backgroundColor: colors.background,
                minHeight: 80,
              },
            ]}
            placeholderTextColor={colors.secondary}
            multiline
          />

          <View style={styles.modalButtons}>
            {/* Show delete button when editing */}
            {isEditing && (
              <TouchableOpacity onPress={confirmDelete} style={[styles.deleteButton]}>
                <Text style={{ color: '#FFFFFF' }}>Delete</Text>
              </TouchableOpacity>
            )}

            {/* Use TouchableOpacity for Cancel button */}
            <TouchableOpacity
              onPress={() => setIsModalVisible(false)}
              style={[
                styles.cancelButton,
                {
                  borderColor: colors.border,
                  flex: isEditing ? 0.4 : 1, // Adjust flex based on whether there's a delete button
                },
              ]}
            >
              <Text style={{ color: colors.text }}>Cancel</Text>
            </TouchableOpacity>

            {/* Use TouchableOpacity for Save button */}
            <TouchableOpacity
              onPress={saveRoomPOI}
              style={[
                styles.saveButton,
                {
                  backgroundColor: colors.primary,
                  flex: isEditing ? 0.4 : 1, // Adjust flex based on whether there's a delete button
                },
              ]}
            >
              <Text style={{ color: '#FFFFFF' }}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  webview: {
    flex: 1,
  },
  footer: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: 16,
  },
  doneButton: {
    paddingHorizontal: 40,
    paddingVertical: 15,
    minWidth: 140,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  doneButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalContent: {
    padding: 20,
    borderRadius: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    padding: 10,
    borderWidth: 1,
    borderRadius: 4,
    marginBottom: 12,
  },
  typeSelector: {
    marginBottom: 12,
  },
  typeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  typeOption: {
    padding: 8,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 16,
    justifyContent: 'space-between',
  },
  cancelButton: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderRadius: 4,
  },
  saveButton: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  deleteButton: {
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    backgroundColor: '#D32F2F',
    marginRight: 8,
    flex: 0.4,
  },
});
