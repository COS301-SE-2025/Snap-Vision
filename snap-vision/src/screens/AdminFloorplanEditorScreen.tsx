import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '@react-navigation/native';
import { getThemeColors } from '../theme';
import AppButton from '../components/atoms/AppButton';
import firestore from '@react-native-firebase/firestore';
import type { StackNavigationProp } from '@react-navigation/stack';
import AdminFloorplanEditorContent from '../components/organisms/AdminFloorplanEditorContent';

type FloorplanEditorScreenRouteParams = {
  buildingId: string;
  floorLabel: string;
  imageUri: string;
};

type FloorplanEditorScreenProps = {
  navigation: StackNavigationProp<any>;
};

export default function FloorplanEditorScreen({ navigation }: FloorplanEditorScreenProps) {
  const route = useRoute<RouteProp<{ params: FloorplanEditorScreenRouteParams }, 'params'>>();
  const theme = useTheme();
  const colors = getThemeColors(theme.dark);
  const isDarkMode = theme.dark;
  
  // Add defensive check for route.params
  if (!route.params) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: colors.background }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20, color: colors.text }}>
          Missing floorplan information
        </Text>
        <Text style={{ textAlign: 'center', marginBottom: 20, color: colors.text }}>
          Please select a floorplan from the edit screen or make sure you've initialized the pre-bundled floorplans.
        </Text>
        <AppButton 
          title="Go Back" 
          onPress={() => navigation.goBack()}
          style={{ backgroundColor: colors.primary }}
        />
      </View>
    );
  }
  
  // Now we can safely access route.params
  const { buildingId, floorLabel, imageUri } = route.params;
  
  // Additional safety check for each parameter
  if (!buildingId || !floorLabel || !imageUri) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: colors.background }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20, color: colors.text }}>
          Incomplete floorplan data
        </Text>
        <Text style={{ textAlign: 'center', marginBottom: 20, color: colors.text }}>
          {!buildingId ? "Missing building ID. " : ""}
          {!floorLabel ? "Missing floor label. " : ""}
          {!imageUri ? "Missing image URI. " : ""}
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
  
  const webViewRef = useRef<WebView>(null);
  
  type RoomPOI = {
    id: string;
    name: string;
    buildingId: string;
    floorId: string;
    coordinates: { x: number; y: number };
    type: string;
    description: string | null;
  };
  
  const [roomMarkers, setRoomMarkers] = useState<RoomPOI[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  type Point = { x: number; y: number } | null;
  const [currentPoint, setCurrentPoint] = useState<Point>(null);
  const [roomData, setRoomData] = useState({
    name: '',
    type: 'classroom',
    description: ''
  });
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Generate HTML for WebView with dark mode support
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
            /* Add a subtle filter for dark mode to improve visibility */
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
          }
          .marker.selected {
            background-color: #ff9800;
            transform: translate(-50%, -50%) scale(1.2);
            box-shadow: 0 0 8px rgba(255,152,0,0.8);
          }
          .marker-label { 
            position: absolute; 
            top: 20px; 
            left: 0; 
            background: ${isDarkMode ? '#333333' : 'white'}; 
            color: ${isDarkMode ? '#ffffff' : '#000000'};
            padding: 4px; 
            font-size: 12px;
            border-radius: 4px;
            white-space: nowrap;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            pointer-events: none;
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
          let startDistance = 0;
          let originX = 0;
          let originY = 0;
          let lastX = 0;
          let lastY = 0;
          let isDragging = false;
          let clickStartTime = 0;
          let clickStartX = 0;
          let clickStartY = 0;
          
          // Handle pinch zoom
          document.addEventListener('touchstart', function(e) {
            if (e.touches.length === 2) {
              // Pinch zoom start
              startDistance = getDistance(
                e.touches[0].clientX, e.touches[0].clientY,
                e.touches[1].clientX, e.touches[1].clientY
              );
              
              e.preventDefault();
            } else if (e.touches.length === 1 && currentScale > 1) {
              // Pan start
              lastX = e.touches[0].clientX;
              lastY = e.touches[0].clientY;
              isDragging = true;
              e.preventDefault();
            }
            
            // For click detection
            if (e.touches.length === 1) {
              clickStartTime = Date.now();
              clickStartX = e.touches[0].clientX;
              clickStartY = e.touches[0].clientY;
            }
          }, { passive: false });
          
          document.addEventListener('touchmove', function(e) {
            if (e.touches.length === 2) {
              // Pinch zoom
              const distance = getDistance(
                e.touches[0].clientX, e.touches[0].clientY,
                e.touches[1].clientX, e.touches[1].clientY
              );
              
              const scale = Math.min(Math.max(currentScale * (distance / startDistance), 1), 5);
              const pinchCenter = {
                x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
                y: (e.touches[0].clientY + e.touches[1].clientY) / 2
              };
              
              // Set the origin based on pinch center
              zoomableArea.style.transformOrigin = '0 0';
              zoomableArea.style.transform = calculateTransform(scale, originX, originY);
              
              currentScale = scale;
              startDistance = distance;
              
              e.preventDefault();
            } else if (e.touches.length === 1 && isDragging) {
              // Panning
              const deltaX = e.touches[0].clientX - lastX;
              const deltaY = e.touches[0].clientY - lastY;
              
              originX += deltaX / currentScale;
              originY += deltaY / currentScale;
              
              zoomableArea.style.transform = calculateTransform(currentScale, originX, originY);
              
              lastX = e.touches[0].clientX;
              lastY = e.touches[0].clientY;
              
              // Check if we've moved too far (prevents click after pan)
              const moveDistance = Math.sqrt(
                Math.pow(e.touches[0].clientX - clickStartX, 2) +
                Math.pow(e.touches[0].clientY - clickStartY, 2)
              );
              
              if (moveDistance > 10) {
                clickStartTime = 0; // Cancel the click
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
              
              // Check if this was a tap/click
              const clickDuration = Date.now() - clickStartTime;
              if (clickDuration < 300 && clickStartTime > 0) {
                // This was a quick tap, process as click
                handleTap(clickStartX, clickStartY);
              }
              
              clickStartTime = 0;
            }
          });
          
          // Double tap to reset zoom
          let lastTap = 0;
          document.addEventListener('touchend', function(e) {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            
            if (tapLength < 300 && tapLength > 0 && e.touches.length === 0) {
              // Reset zoom
              currentScale = 1;
              originX = 0;
              originY = 0;
              zoomableArea.style.transform = calculateTransform(currentScale, originX, originY);
            }
            
            lastTap = currentTime;
          });
          
          // Function to handle taps on the container
          function handleTap(x, y) {
            // First check if we tapped on a marker (markers have their own event handlers)
            const element = document.elementFromPoint(x, y);
            if (element && element.classList.contains('marker')) {
              // Marker click handled by the marker's own click handler
              return;
            }
            
            // If we're not on a marker, this is a tap on the floorplan to add a new point
            if (currentScale === 1 || !isDragging) {
              const rect = floorplan.getBoundingClientRect();
              
              // Convert coordinates to match the unzoomed image
              const relX = (x - rect.left) / (rect.width * currentScale);
              const relY = (y - rect.top) / (rect.height * currentScale);
              
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'add_marker',
                x: relX,
                y: relY
              }));
            }
          }
          
          // Helper function to calculate distance between two points
          function getDistance(x1, y1, x2, y2) {
            const xDiff = x2 - x1;
            const yDiff = y2 - y1;
            return Math.sqrt(xDiff * xDiff + yDiff * yDiff);
          }
          
          // Calculate transform with current scale and origin
          function calculateTransform(scale, originX, originY) {
            return \`scale(\${scale}) translate(\${originX}px, \${originY}px)\`;
          }
          
          // Function to add marker to the floorplan
          window.addMarker = function(id, x, y, label) {
            // Remove any existing marker with the same ID (for updates)
            const existingMarker = document.getElementById('marker-' + id);
            if (existingMarker) {
              existingMarker.remove();
            }
            
            // Create the marker element
            const marker = document.createElement('div');
            marker.className = 'marker';
            marker.id = 'marker-' + id;
            marker.dataset.id = id;
            marker.style.left = (x * 100) + '%';
            marker.style.top = (y * 100) + '%';
            
            const labelEl = document.createElement('div');
            labelEl.className = 'marker-label';
            labelEl.textContent = label;
            marker.appendChild(labelEl);
            
            // Add click handler to the marker for editing
            marker.addEventListener('click', function(e) {
              e.preventDefault();
              e.stopPropagation();
              
              // Clear any selected state from other markers
              document.querySelectorAll('.marker.selected').forEach(m => {
                m.classList.remove('selected');
              });
              
              // Add selected state to this marker
              marker.classList.add('selected');
              
              // Send message to React Native to edit this marker
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'edit_marker',
                id: id
              }));
            });
            
            zoomableArea.appendChild(marker);
          };
          
          // Function to highlight a marker when it's being edited
          window.highlightMarker = function(id) {
            document.querySelectorAll('.marker.selected').forEach(m => {
              m.classList.remove('selected');
            });
            
            const marker = document.getElementById('marker-' + id);
            if (marker) {
              marker.classList.add('selected');
            }
          };
        </script>
      </body>
      </html>
    `;
  };
  
  // Handle messages from WebView
  const handleMessage = (event: { nativeEvent: { data: string; }; }) => {
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
          description: ''
        });
        setIsModalVisible(true);
      }
      else if (data.type === 'edit_marker') {
        // Editing an existing marker
        const roomToEdit = roomMarkers.find(room => room.id === data.id);
        if (roomToEdit) {
          setEditingRoomId(data.id);
          setIsEditing(true);
          setCurrentPoint(roomToEdit.coordinates);
          setRoomData({
            name: roomToEdit.name,
            type: roomToEdit.type,
            description: roomToEdit.description || ''
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
          y: currentPoint.y
        },
        type: roomData.type,
        description: roomData.description || null,
      };
      
      // Save to Firestore
      await firestore().collection('RoomPOIs').doc(roomId as string).set(roomPOI);
      
      // Update local state
      if (isEditing) {
        // Replace the edited room in the array
        setRoomMarkers(roomMarkers.map(room => 
          room.id === roomId ? roomPOI : room
        ));
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
      setRoomMarkers(roomMarkers.filter(room => room.id !== editingRoomId));
      
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
    Alert.alert(
      'Delete Room',
      `Are you sure you want to delete ${roomData.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', onPress: deleteRoomPOI, style: 'destructive' },
      ]
    );
  };
  
  // Load existing room POIs
  useEffect(() => {
    const loadRoomPOIs = async () => {
      try {
        const snapshot = await firestore()
          .collection('RoomPOIs')
          .where('buildingId', '==', buildingId)
          .where('floorId', '==', floorLabel)
          .get();
          
        const markers = snapshot.docs.map(doc => ({
          ...(doc.data() as RoomPOI)
        }));
        setRoomMarkers(markers as RoomPOI[]);
        
        // Add markers to WebView when it's ready
        if (markers.length > 0) {
          setTimeout(() => {
            markers.forEach(marker => {
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
  }, [buildingId, floorLabel]);
  
  return (
    <AdminFloorplanEditorContent
      colors={colors}
      buildingId={buildingId}
      floorLabel={floorLabel}
      webViewRef={webViewRef as React.RefObject<WebView>}
      getHTML={getHTML}
      handleMessage={handleMessage}
      roomMarkers={roomMarkers}
      isModalVisible={isModalVisible}
      setIsModalVisible={setIsModalVisible}
      roomData={roomData}
      setRoomData={setRoomData}
      saveRoomPOI={saveRoomPOI}
      goBack={() => navigation.goBack()}
      isDarkMode={isDarkMode}
      isEditing={isEditing}
      deleteRoom={confirmDelete}
    />
  );
}