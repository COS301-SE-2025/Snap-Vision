import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '@react-navigation/native';
import { getThemeColors } from '../theme';
import AppButton from '../components/atoms/AppButton';
import AppSecondaryButton from '../components/atoms/AppSecondaryButton';
import firestore from '@react-native-firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Modal from 'react-native-modal';

import type { StackNavigationProp } from '@react-navigation/stack';

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
  
  // Add defensive check for route.params
  if (!route.params) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>
          Missing floorplan information
        </Text>
        <Text style={{ textAlign: 'center', marginBottom: 20 }}>
          Please select a floorplan from the edit screen or make sure you've initialized the pre-bundled floorplans.
        </Text>
        <AppButton 
          title="Go Back" 
          onPress={() => navigation.goBack()} 
        />
      </View>
    );
  }
  
  // Now we can safely access route.params
  const { buildingId, floorLabel, imageUri } = route.params;
  
  // Additional safety check for each parameter
  if (!buildingId || !floorLabel || !imageUri) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20 }}>
          Incomplete floorplan data
        </Text>
        <Text style={{ textAlign: 'center', marginBottom: 20 }}>
          {!buildingId ? "Missing building ID. " : ""}
          {!floorLabel ? "Missing floor label. " : ""}
          {!imageUri ? "Missing image URI. " : ""}
          Please go back and try again.
        </Text>
        <AppButton 
          title="Go Back" 
          onPress={() => navigation.goBack()} 
        />
      </View>
    );
  }
  
  const theme = useTheme();
  const colors = getThemeColors(theme.dark);
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
  
  // Rest of your component remains unchanged
  // ...

  // Generate HTML for WebView
  const getHTML = () => {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
        <style>
          body, html { margin: 0; padding: 0; width: 100%; height: 100%; }
          #container { position: relative; width: 100%; height: 100%; }
          #floorplan { width: 100%; height: auto; display: block; }
          .marker { position: absolute; width: 20px; height: 20px; background-color: red; border-radius: 50%; transform: translate(-50%, -50%); }
          .marker-label { position: absolute; top: 20px; left: 0; background: white; padding: 2px; font-size: 12px; white-space: nowrap; }
        </style>
      </head>
      <body>
        <div id="container">
          <img id="floorplan" src="${imageUri}" onerror="console.error('Failed to load image: ' + this.src);" />
        </div>
        
        <script>
          const container = document.getElementById('container');
          const floorplan = document.getElementById('floorplan');
          
          // Handle tap on floorplan
          container.addEventListener('click', function(event) {
            const rect = container.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width;
            const y = (event.clientY - rect.top) / floorplan.offsetHeight * (rect.height / floorplan.offsetHeight);
            
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'add_marker',
              x: x,
              y: y
            }));
          });
          
          // Function to add marker to the floorplan
          window.addMarker = function(id, x, y, label) {
            const marker = document.createElement('div');
            marker.className = 'marker';
            marker.id = 'marker-' + id;
            marker.style.left = (x * 100) + '%';
            marker.style.top = (y * 100) + '%';
            
            const labelEl = document.createElement('div');
            labelEl.className = 'marker-label';
            labelEl.textContent = label;
            marker.appendChild(labelEl);
            
            container.appendChild(marker);
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
        setCurrentPoint({ x: data.x, y: data.y });
        setIsModalVisible(true);
      }
    } catch (e) {
      console.error('Error parsing WebView message:', e);
    }
  };
  
  // Save room POI
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
      // Create unique ID
      const roomId = `room_${buildingId.replace(/\//g, '_')}_${floorLabel.replace(/\s/g, '_')}_${Date.now()}`;
      
      // Create room POI object
      const roomPOI = {
        id: roomId,
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
      await firestore().collection('RoomPOIs').doc(roomId).set(roomPOI);
      
      // Add to local state
      setRoomMarkers([...roomMarkers, roomPOI]);
      
      // Add marker to WebView
      webViewRef.current?.injectJavaScript(`
        addMarker("${roomId}", ${currentPoint.x}, ${currentPoint.y}, "${roomData.name}");
        true;
      `);
      
      // Reset form
      setRoomData({ name: '', type: 'classroom', description: '' });
      setIsModalVisible(false);
      
    } catch (error) {
      console.error('Error saving room POI:', error);
      Alert.alert('Error', 'Failed to save room POI');
    }
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Add Room POIs - {floorLabel}
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.text }]}>
          Tap on the floorplan to add rooms
        </Text>
      </View>
      
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: getHTML() }}
        onMessage={handleMessage}
        style={styles.webview}
      />
      
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.text }]}>
          {roomMarkers.length} rooms added
        </Text>
        <AppButton 
          title="Done" 
          onPress={() => navigation.goBack()}
        />
      </View>
      
      {/* Modal for room details */}
      <Modal 
        isVisible={isModalVisible}
        onBackdropPress={() => setIsModalVisible(false)}
        avoidKeyboard
      >
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Add Room Details</Text>
          
          <TextInput
            placeholder="Room Name/Number"
            value={roomData.name}
            onChangeText={(text) => setRoomData({...roomData, name: text})}
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            placeholderTextColor={colors.secondary}
          />
          
          <View style={styles.typeSelector}>
            <Text style={[{ color: colors.text }]}>Room Type:</Text>
            <View style={styles.typeOptions}>
              {['classroom', 'office', 'lab', 'restroom', 'stairs', 'elevator'].map(type => (
                <TouchableOpacity 
                  key={type}
                  style={[
                    styles.typeOption,
                    roomData.type === type && { backgroundColor: colors.primary }
                  ]}
                  onPress={() => setRoomData({...roomData, type})}
                >
                  <Text style={{ 
                    color: roomData.type === type ? colors.text : colors.text 
                  }}>
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <TextInput
            placeholder="Description (optional)"
            value={roomData.description}
            onChangeText={(text) => setRoomData({...roomData, description: text})}
            style={[styles.input, { borderColor: colors.border, color: colors.text }]}
            placeholderTextColor={colors.secondary}
            multiline
          />
          
          <View style={styles.modalButtons}>
            <AppSecondaryButton 
              title="Cancel"
              onPress={() => setIsModalVisible(false)}
              style={{ flex: 1, marginRight: 8 }}
            />
            <AppButton 
              title="Save"
              onPress={saveRoomPOI}
              style={{ flex: 1 }}
            />
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
    borderBottomColor: '#ddd',
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
    borderTopColor: '#ddd',
  },
  footerText: {
    fontSize: 16,
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
    backgroundColor: '#f0f0f0',
  },
  modalButtons: {
    flexDirection: 'row',
    marginTop: 16,
  }
});