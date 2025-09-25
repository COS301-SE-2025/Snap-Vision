import React, { useRef, forwardRef, useImperativeHandle } from 'react';
import { StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';

interface FloorplanWebViewProps {
  imageUri: string;
  isDarkMode: boolean;
  colors: {
    background: string;
    text: string;
    border: string;
    primary: string;
  };
  onMessage: (event: { nativeEvent: { data: string } }) => void;
  containerWidth: number;
  containerHeight: number;
}

export interface FloorplanWebViewRef {
  injectJavaScript: (script: string) => void;
}

const FloorplanWebView = forwardRef<FloorplanWebViewRef, FloorplanWebViewProps>(
  ({ imageUri, isDarkMode, colors, onMessage, containerWidth, containerHeight }, ref) => {
    const webViewRef = useRef<WebView>(null);

    useImperativeHandle(ref, () => ({
      injectJavaScript: (script: string) => {
        webViewRef.current?.injectJavaScript(script);
      },
    }));

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
              width: 100vw; 
              height: 100vh; 
              object-fit: contain;
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
            .marker.room-selected {
              background-color: #ff9800 !important;
              box-shadow: 0 0 10px rgba(255,152,0,0.8) !important;
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
              pointer-events: auto;
              transform-origin: center top;
            }
            .path-line {
              stroke: ${colors.primary};
              stroke-width: 1;
              fill: none;
              stroke-dasharray: 3,3;
              opacity: 0.8;
              vector-effect: non-scaling-stroke;
            }
            .path-waypoint {
              width: 12px;
              height: 12px;
              background-color: ${colors.primary};
              border: 2px solid white;
              border-radius: 50%;
              position: absolute;
              transform: translate(-50%, -50%);
              cursor: pointer;
              z-index: 15;
              transform-origin: center center;
            }
            .path-waypoint:hover {
              background-color: #ff9800;
            }
              .path-line {
            stroke: ${colors.primary};
            stroke-width: 1;
            fill: none;
            stroke-dasharray: 3,3;
            opacity: 0.8;
            vector-effect: non-scaling-stroke;
            cursor: pointer;
            transition: stroke 0.2s, opacity 0.2s, stroke-width 0.2s;
          }
          </style>
        </head>
        <body>
          <div id="container">
            <div id="zoomable-area">
              <img id="floorplan" src="${imageUri}" />
              <svg id="path-svg" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: auto; z-index: 5;" viewBox="0 0 100 100" preserveAspectRatio="none"></svg>
            </div>
          </div>
          
          <script>

          
            const container = document.getElementById('container');
            const zoomableArea = document.getElementById('zoomable-area');
            const floorplan = document.getElementById('floorplan');
            const pathSvg = document.getElementById('path-svg');
            
            // Theme info from React Native
            const isDarkMode = ${isDarkMode};
            const themeColors = {
              background: "${colors.background}",
              text: "${colors.text}",
              border: "${colors.border}",
              primary: "${colors.primary}"
            };
            
            // Path creation variables
            let isPathMode = false;
            let selectedRooms = [];
            let currentPath = [];
            
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
            
            // Update marker and waypoint scales when zoom changes
            function updateMarkerScales() {
              const markers = document.querySelectorAll('.marker');
              const labels = document.querySelectorAll('.marker-label');
              const waypoints = document.querySelectorAll('.path-waypoint');
              
              const inverseScale = 1 / currentScale;
              
              markers.forEach(marker => {
                const isSelected = marker.classList.contains('selected');
                const baseScale = isSelected ? 1.2 : 1;
                marker.style.transform = \`translate(-50%, -50%) scale(\${baseScale * inverseScale})\`;
              });
              
              labels.forEach(label => {
                label.style.transform = \`translateX(-50%) scale(\${inverseScale})\`;
              });
              
              // Scale waypoints inversely to maintain consistent size
              waypoints.forEach(waypoint => {
                waypoint.style.transform = \`translate(-50%, -50%) scale(\${inverseScale})\`;
              });
            }
            
            // Toggle path creation mode
            window.togglePathMode = function(enabled) {
              isPathMode = enabled;
              selectedRooms = [];
              currentPath = [];
              
              // Clear any existing path selection
              document.querySelectorAll('.marker').forEach(marker => {
                marker.classList.remove('room-selected');
              });
              
              // Clear temporary waypoints
              document.querySelectorAll('.path-waypoint').forEach(waypoint => {
                waypoint.remove();
              });
              
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'path_mode_changed',
                enabled: enabled
              }));
            };
            
            // Handle room selection for path creation
            window.selectRoomForPath = function(roomId) {
              if (!isPathMode) return;
              
              const marker = document.getElementById('marker-' + roomId);
              if (!marker) return;
              
              if (selectedRooms.includes(roomId)) {
                // Deselect room
                selectedRooms = selectedRooms.filter(id => id !== roomId);
                marker.classList.remove('room-selected');
              } else if (selectedRooms.length < 2) {
                // Select room
                selectedRooms.push(roomId);
                marker.classList.add('room-selected');
              }
              
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'rooms_selected',
                selectedRooms: selectedRooms
              }));
            };
            
            // Draw paths on the floorplan
            window.drawPaths = function(pathData) {
              pathSvg.innerHTML = '';
              
              pathData.forEach(path => {
                const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                pathElement.setAttribute('class', 'path-line');
                pathElement.setAttribute('d', path.d);
                pathElement.setAttribute('data-path-id', path.id);
                 pathElement.onclick = function(e) {
                e.stopPropagation();
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'select_path',
                  pathId: path.id
                }));
              };
                pathSvg.appendChild(pathElement);
              });
            };
            
            // Draw a single path
            window.drawSinglePath = function(pathData) {
              const pathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
              pathElement.setAttribute('class', 'path-line');
              pathElement.setAttribute('d', pathData.d);
              pathElement.setAttribute('data-path-id', pathData.id);
              pathElement.onclick = function(e) {
              e.stopPropagation();
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'select_path',
                pathId: pathData.id
              }));
            };
              pathSvg.appendChild(pathElement);
            };
            
            // Add waypoint to current path
            window.addWaypoint = function(x, y) {
              if (!isPathMode || selectedRooms.length !== 2) return;
              
              currentPath.push({ x, y });
              
              // Create waypoint marker
              const waypoint = document.createElement('div');
              waypoint.className = 'path-waypoint';
              waypoint.style.left = (x * 100) + '%';
              waypoint.style.top = (y * 100) + '%';
              
              // Apply current scale to new waypoint
              const inverseScale = 1 / currentScale;
              waypoint.style.transform = \`translate(-50%, -50%) scale(\${inverseScale})\`;
              
              waypoint.onclick = function() {
                // Remove waypoint
                const index = currentPath.findIndex(p => p.x === x && p.y === y);
                if (index > -1) {
                  currentPath.splice(index, 1);
                  waypoint.remove();
                  
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'waypoint_removed',
                    waypoint: { x, y },
                    currentPath: currentPath
                  }));
                }
              };
              
              zoomableArea.appendChild(waypoint);
              
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'waypoint_added',
                waypoint: { x, y },
                currentPath: currentPath
              }));
            };
            
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
                if (isPathMode && selectedRooms.length === 2) {
                  // Add waypoint in path mode
                  window.addWaypoint(imageX, imageY);
                } else {
                  // Regular room marker creation
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'add_marker',
                    x: imageX,
                    y: imageY
                  }));
                }
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
                
                if (isPathMode) {
                  // Select room for path creation
                  window.selectRoomForPath(id);
                } else {
                  // Regular room editing
                  document.querySelectorAll('.marker.selected').forEach(m => {
                    m.classList.remove('selected');
                  });
                  
                  marker.classList.add('selected');
                  updateMarkerScales();
                  
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'edit_marker',
                    id: id
                  }));
                }
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

    return (
      <WebView
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: getHTML() }}
        onMessage={onMessage}
        style={[
          styles.webView,
          {
            width: containerWidth,
            height: containerHeight,
          },
        ]}
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
    );
  },
);

const styles = StyleSheet.create({
  webView: {
    backgroundColor: '#fff',
    borderRadius: 16,
  },
});

FloorplanWebView.displayName = 'FloorplanWebView';

export default FloorplanWebView;
