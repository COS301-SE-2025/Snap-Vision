import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Dimensions, StyleSheet, ActivityIndicator, SafeAreaView, TouchableOpacity } from 'react-native';
import { WebView } from 'react-native-webview';
import IndoorPositionDot from '../components/atoms/IndoorPositionDot';
import { useIndoorPosition } from '../hooks/useIndoorPosition';
import { useAutoLocationDetection } from '../hooks/useAutoLocationDetection';
import firestore from '@react-native-firebase/firestore';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';

export default function LiveTrackingScreen() {
  const screenWidth = Dimensions.get('window').width;
  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);
  const webViewRef = useRef<WebView>(null);

  // Auto-detect location instead of hardcoding
  const { detectedLocation, isDetecting, detectionError } = useAutoLocationDetection();
  
  const { position, loading, error } = useIndoorPosition(
    detectedLocation?.locationId,
    detectedLocation?.buildingId,
    detectedLocation?.floorId,
    10000
  );

  // Add state for floorplan image and fingerprints
  const [floorplanImage, setFloorplanImage] = useState<string | null>(null);
  const [showFingerprints, setShowFingerprints] = useState(true);
  const [fingerprints, setFingerprints] = useState<any[]>([]);

  useEffect(() => {
    if (position) {
      console.log("Current indoor position:", position);
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

  // Load fingerprints for debugging
  const loadFingerprints = async () => {
    if (!detectedLocation) return;

    try {
      const snapshot = await firestore()
        .collection(`locations/${detectedLocation.locationId}/wifiFingerprints`)
        .where('buildingId', '==', detectedLocation.buildingId)
        .where('floorId', '==', detectedLocation.floorId)
        .get();

      const fingerprintData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          x: data.coordinates?.x || 0,
          y: data.coordinates?.y || 0,
          description: data.description || 'WiFi Point',
          timestamp: data.timestamp
        };
      });

      console.log('📍 Loaded fingerprints for debugging:');
      fingerprintData.forEach((fp, i) => {
        console.log(`  ${i + 1}. ${fp.description} at (${fp.x.toFixed(3)}, ${fp.y.toFixed(3)})`);
      });

      setFingerprints(fingerprintData);
    } catch (error) {
      console.error('Failed to load fingerprints:', error);
    }
  };

  // Load floorplan and fingerprints when location is detected
  useEffect(() => {
    const loadFloorplan = async () => {
      if (!detectedLocation) return;

      try {
        const snap = await firestore()
          .collection(`locations/${detectedLocation.locationId}/buildingPOIs/${detectedLocation.buildingId}/floorplans`)
          .get();

        const floorplanDoc = snap.docs.find(doc => {
          const data = doc.data();
          return data.floorLabel === detectedLocation.floorId;
        });

        if (floorplanDoc) {
          const data = floorplanDoc.data();
          setFloorplanImage(data.downloadURL || null);
          console.log('✅ Floorplan loaded:', data.downloadURL);
          
          // Load fingerprints after floorplan loads
          await loadFingerprints();
        } else {
          console.log('❌ No floorplan found for floor:', detectedLocation.floorId);
        }
      } catch (error) {
        console.error('Failed to load floorplan:', error);
      }
    };

    loadFloorplan();
  }, [detectedLocation]);

  // Use EXACT same HTML structure as AdminIndoorPositioningContent
  const getHTML = () => {
    if (!floorplanImage) return '<html><body>Loading...</body></html>';

    // Fingerprint markers (using same structure as admin page)
    const markers = fingerprints
      .map(
        (fp) => `<div onclick="onMarkerClick('${fp.id}')" data-id="${fp.id}" class="marker" style="position:absolute;left:${fp.x * 100}%;top:${fp.y * 100}%;
          transform:translate(-50%,-50%);width:12px;height:12px;border-radius:6px;
          background:blue;border:2px solid white;cursor:pointer;z-index:5;"></div>`
      )
      .join('');

    // Current position marker (green instead of blue) - NO INITIAL RENDER
    const currentMarker = '';

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
              background-color: blue; 
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
            #current-position {
              background-color: #4CAF50;
              width: 10px;
              height: 10px;
              border: 3px solid white;
              border-radius: 50%;
              z-index: 100;
              box-shadow: 0 0 15px rgba(76, 175, 80, 0.8);
              animation: pulse 2s infinite;
              pointer-events: none;
              transition: all 0.8s ease-out;
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
              ${showFingerprints ? markers : ''}
              ${currentMarker}
            </div>
          </div>

          <script>
            const container = document.getElementById('container');
            const zoomableArea = document.getElementById('zoomable-area');
            const floorplan = document.getElementById('floorplan');
            
            // EXACT SAME zoom and pan variables as AdminIndoorPositioningContent
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
              const currentPosMarker = document.getElementById('current-position');
              const markers = document.querySelectorAll('.marker');
              const inverseScale = 1 / currentScale;
              
              // Update current position marker
              if (currentPosMarker) {
                const originalTransform = currentPosMarker.style.transform;
                if (originalTransform.includes('translate')) {
                  currentPosMarker.style.transform = originalTransform.replace(/scale\\([^)]*\\)/, '') + \` scale(\${inverseScale})\`;
                } else {
                  currentPosMarker.style.transform = \`translate(-50%, -50%) scale(\${inverseScale})\`;
                }
              }

              // Update fingerprint markers
              markers.forEach(marker => {
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

            // Handle marker clicks (fingerprints)
            function onMarkerClick(markerId) {
              console.log('🔍 Clicked fingerprint:', markerId);
              const fingerprints = ${JSON.stringify(fingerprints)};
              const fp = fingerprints.find(f => f.id === markerId);
              if (fp) {
                console.log(\`📍 Fingerprint "\${fp.description}" at (\${fp.x.toFixed(3)}, \${fp.y.toFixed(3)})\`);
              }
            }

            // PREVIOUS VERSION: Smooth position updates with CSS transitions
            window.updatePosition = function(x, y) {
              let marker = document.getElementById('current-position');
              if (!marker) {
                // Create marker only once with previous styling
                marker = document.createElement('div');
                marker.id = 'current-position';
                marker.style.cssText = \`
                  position: absolute; 
                  width: 14px; 
                  height: 14px; 
                  background: #4CAF50; 
                  border: 2px solid white; 
                  border-radius: 50%; 
                  z-index: 100;
                  box-shadow: 0 0 15px rgba(76, 175, 80, 0.8);
                  animation: pulse 2s infinite;
                  pointer-events: none;
                  transition: all 0.8s ease-out;
                \`;
                zoomableArea.appendChild(marker);
              }
              
              // Smooth position updates using CSS transitions
              marker.style.left = (x * 100) + '%';
              marker.style.top = (y * 100) + '%';
              
              updateMarkerScales();
            };

            // EXACT SAME touch event handlers as AdminIndoorPositioningContent
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

            // Initialize marker scales when image loads
            floorplan.addEventListener('load', function() {
              console.log('🖼️ Floorplan image loaded with same scaling as admin page');
              updateMarkerScales();
            });
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
      
      {/* Fingerprint toggle button */}
      <TouchableOpacity 
        style={[styles.toggleButton, { backgroundColor: showFingerprints ? colors.primary : colors.card }]}
        onPress={() => setShowFingerprints(!showFingerprints)}
      >
        <Text style={[styles.toggleText, { color: showFingerprints ? '#FFF' : colors.text }]}>
          {showFingerprints ? '👁️ Hide Fingerprints' : '👁️ Show Fingerprints'} ({fingerprints.length})
        </Text>
      </TouchableOpacity>
      
      {/* Use same 300px height as admin page */}
      <View style={[styles.mapArea, { width: screenWidth, height: 300 }]}>
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
                containerHeight={300}
              />
            )}
          </View>
        )}
      </View>
      
      <Text style={styles.label}>
        Position: {position ? `x: ${position.x.toFixed(3)}, y: ${position.y.toFixed(3)}` : 'No position yet'}
      </Text>
      
      <Text style={styles.confidence}>
        Confidence: {(detectedLocation.confidence * 100).toFixed(1)}%
      </Text>
      
      {showFingerprints && fingerprints.length > 0 && (
        <View style={styles.debugContainer}>
          <Text style={styles.debugText}>
            🔍 Blue dots = WiFi fingerprints | Green dot = Your position
          </Text>
          <Text style={styles.debugText}>
            Using EXACT same scaling as admin positioning page
          </Text>
        </View>
      )}
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
  toggleButton: {
    marginTop: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#555',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: 'bold',
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
  debugContainer: {
    marginTop: 10,
    alignItems: 'center',
  },
  debugText: {
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
    marginTop: 2,
  },
});