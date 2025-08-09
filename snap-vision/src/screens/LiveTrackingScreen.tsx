import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Dimensions, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';
import IndoorPositionDot from '../components/atoms/IndoorPositionDot';
import { useIndoorPosition } from '../hooks/useIndoorPosition';
import { useAutoLocationDetection } from '../hooks/useAutoLocationDetection';
import firestore from '@react-native-firebase/firestore';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';

export default function LiveTrackingScreen() {
  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height * 0.8;
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const webViewRef = useRef<WebView>(null);

  // Auto-detect location instead of hardcoding
  const { detectedLocation, isDetecting, detectionError } = useAutoLocationDetection();
  
  const { position, loading, error } = useIndoorPosition(
    detectedLocation?.locationId,
    detectedLocation?.buildingId,
    detectedLocation?.floorId,
    10000 // Increase polling interval to 10 seconds for more stability
  );

  // Add state for floorplan image
  const [floorplanImage, setFloorplanImage] = useState<string | null>(null);

  useEffect(() => {
    if (position) {
      console.log("Current indoor position:", position);
      // Update position in WebView
      updatePositionInWebView(position.x, position.y);
    }
  }, [position]);

  // Update position marker in WebView
  const updatePositionInWebView = (x: number, y: number) => {
    webViewRef.current?.injectJavaScript(`
      if (window.updatePosition) {
        window.updatePosition(${x}, ${y});
      }
      true;
    `);
  };

  // Load floorplan when location is detected - EXACTLY matching AdminIndoorPositioningContent
  useEffect(() => {
    const loadFloorplan = async () => {
      if (!detectedLocation) return;

      try {
        // Match the EXACT path used in AdminIndoorPositioningContent
        const snap = await firestore()
          .collection(`locations/${detectedLocation.locationId}/buildingPOIs/${detectedLocation.buildingId}/floorplans`)
          .get();

        // Find the matching floorplan by floorLabel
        const floorplanDoc = snap.docs.find(doc => {
          const data = doc.data();
          return data.floorLabel === detectedLocation.floorId;
        });

        if (floorplanDoc) {
          const data = floorplanDoc.data();
          setFloorplanImage(data.downloadURL || null);
          console.log('✅ Floorplan loaded:', data.downloadURL);
        } else {
          console.log('❌ No floorplan found for floor:', detectedLocation.floorId);
        }
      } catch (error) {
        console.error('Failed to load floorplan:', error);
      }
    };

    loadFloorplan();
  }, [detectedLocation]);

  // Generate HTML that EXACTLY matches AdminIndoorPositioningContent
  const getHTML = () => {
    if (!floorplanImage) return '<html><body>Loading...</body></html>';

    // Position marker - using PERCENTAGE positioning like AdminIndoorPositioningContent
    const currentMarker = position ? `
      <div id="current-position" 
           style="position: absolute; 
                  left: ${position.x * 100}%; 
                  top: ${position.y * 100}%; 
                  width: 20px; 
                  height: 20px; 
                  background: #4CAF50; 
                  border: 3px solid white; 
                  border-radius: 50%; 
                  transform: translate(-50%, -50%); 
                  z-index: 100;
                  box-shadow: 0 0 15px rgba(76, 175, 80, 0.8);
                  animation: pulse 2s infinite;">
      </div>
    ` : '';

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
            transition: transform 0.1s ease-out;
          }
          #floorplan { 
            width: 100vw; 
            height: 100vh; 
            object-fit: contain;
            display: block;
            filter: ${isDark ? 'brightness(0.9) contrast(1.1)' : 'none'};
          }
          #current-position {
            pointer-events: none;
          }
          @keyframes pulse {
            0% { 
              box-shadow: 0 0 15px rgba(76, 175, 80, 0.8);
              transform: translate(-50%, -50%) scale(1);
            }
            50% { 
              box-shadow: 0 0 25px rgba(76, 175, 80, 1);
              transform: translate(-50%, -50%) scale(1.1);
            }
            100% { 
              box-shadow: 0 0 15px rgba(76, 175, 80, 0.8);
              transform: translate(-50%, -50%) scale(1);
            }
          }
        </style>
      </head>
      <body>
        <div id="container">
          <div id="zoomable-area">
            <img id="floorplan" src="${floorplanImage}" alt="Floorplan" />
            ${currentMarker}
          </div>
        </div>
        
        <script>
          const container = document.getElementById('container');
          const zoomableArea = document.getElementById('zoomable-area');
          const floorplan = document.getElementById('floorplan');
          
          // Zoom and pan variables (exactly matching AdminIndoorPositioningContent)
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
            const markers = document.querySelectorAll('#current-position');
            const inverseScale = 1 / currentScale;
            
            markers.forEach(marker => {
              // Keep markers at consistent visual size regardless of zoom
              marker.style.transform = \`translate(-50%, -50%) scale(\${inverseScale})\`;
            });
          }

          function getDistance(x1, y1, x2, y2) {
            const xDiff = x2 - x1;
            const yDiff = y2 - y1;
            return Math.sqrt(xDiff * xDiff + yDiff * yDiff);
          }

          // SIMPLIFIED: Use percentage positioning like AdminIndoorPositioningContent
          window.updatePosition = function(x, y) {
            let marker = document.getElementById('current-position');
            if (!marker) {
              marker = document.createElement('div');
              marker.id = 'current-position';
              marker.style.cssText = \`
                position: absolute; 
                width: 20px; 
                height: 20px; 
                background: #4CAF50; 
                border: 3px solid white; 
                border-radius: 50%; 
                z-index: 100;
                box-shadow: 0 0 15px rgba(76, 175, 80, 0.8);
                animation: pulse 2s infinite;
                pointer-events: none;
              \`;
              zoomableArea.appendChild(marker);
            }
            
            // Use PERCENTAGE positioning - exactly like AdminIndoorPositioningContent
            marker.style.left = (x * 100) + '%';
            marker.style.top = (y * 100) + '%';
            marker.style.transform = 'translate(-50%, -50%)';
            
            updateMarkerScales();
          };

          // Touch event handlers for zoom and pan (same as AdminIndoorPositioningContent)
          document.addEventListener('touchstart', function(e) {
            touchHandled = false;
            
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
                
                const pinchCenterX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                const pinchCenterY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                
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
              
              if (clickDuration < 300 && clickStartTime > 0 && !touchHandled) {
                if (currentTime - lastTapTime < 300) {
                  // Double tap - reset zoom
                  currentScale = 1;
                  currentOffsetX = 0;
                  currentOffsetY = 0;
                  applyTransform();
                  updateMarkerScales();
                  lastTapTime = 0;
                } else {
                  lastTapTime = currentTime;
                }
              }
              
              clickStartTime = 0;
            }
          });

          // Initialize when image loads
          floorplan.addEventListener('load', function() {
            updateMarkerScales();
            if (window.lastPosition) {
              window.updatePosition(window.lastPosition.x, window.lastPosition.y);
            }
          });

          // Store last position
          const originalUpdatePosition = window.updatePosition;
          window.updatePosition = function(x, y) {
            window.lastPosition = { x, y };
            if (originalUpdatePosition) {
              originalUpdatePosition(x, y);
            }
          };
        </script>
      </body>
      </html>
    `;
  };

  if (isDetecting) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.title}>Detecting Location...</Text>
        <ActivityIndicator size="large" color="gray" />
        <Text style={styles.label}>Scanning WiFi networks...</Text>
      </SafeAreaView>
    );
  }

  if (detectionError) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.title}>Location Detection Failed</Text>
        <Text style={styles.error}>{detectionError}</Text>
      </SafeAreaView>
    );
  }

  if (!detectedLocation) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.title}>Unknown Location</Text>
        <Text style={styles.label}>No matching WiFi fingerprints found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Text style={styles.title}>Live Indoor Tracking</Text>
      <Text style={styles.subtitle}>
        {detectedLocation.buildingName} - Floor {detectedLocation.floorId}
      </Text>
      
      <View style={[styles.mapArea, { width: screenWidth, height: screenHeight }]}>
        {loading && <ActivityIndicator size="large" color="gray" />}
        {error && <Text style={styles.error}>{error}</Text>}

        {floorplanImage ? (
          <WebView
            ref={webViewRef}
            originWhitelist={['*']}
            source={{ html: getHTML() }}
            style={styles.webview}
            scrollEnabled={false}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.fallbackBackground}>
            <Text style={styles.noFloorplan}>No floorplan available</Text>
            {position && (
              <IndoorPositionDot
                x={position.x}
                y={position.y}
                containerWidth={screenWidth}
                containerHeight={screenHeight}
              />
            )}
          </View>
        )}
      </View>
      
      <Text style={styles.label}>
        {position ? `x: ${position.x.toFixed(3)}, y: ${position.y.toFixed(3)}` : 'No position yet'}
      </Text>
      
      <Text style={styles.confidence}>
        Confidence: {(detectedLocation.confidence * 100).toFixed(1)}%
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 5,
    color: '#aaa',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 20,
    color: '#fff',
  },
  mapArea: {
    backgroundColor: '#222',
    borderRadius: 12,
    marginTop: 20,
    overflow: 'hidden',
  },
  webview: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  fallbackBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noFloorplan: {
    color: '#888',
    fontSize: 14,
    position: 'absolute',
    top: 20,
  },
  label: {
    marginTop: 10,
    fontSize: 16,
    color: '#ccc',
  },
  confidence: {
    fontSize: 14,
    color: '#4CAF50',
    marginTop: 5,
  },
  error: {
    color: 'red',
    marginTop: 10,
  },
});