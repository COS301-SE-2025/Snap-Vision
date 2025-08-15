import React, { useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import WebView from 'react-native-webview';
import { useTheme } from '@react-navigation/native';

type RoomPOI = {
  id: string;
  name: string;
  coordinates: { x: number; y: number };
  type?: string;
  isEntrance?: boolean;
};

interface Props {
  rooms: RoomPOI[];
  startId?: string;
  endId?: string;
  routePolyline?: { x: number; y: number }[];
  completedPolyline?: { x: number; y: number }[];
  currentPos?: { x: number; y: number };
  onSelectRoom: (roomId: string) => void;
  themeColors: any;
  floorplanUrl?: string;
}

const CANVAS = 1000;
const FLOORPLAN_CONTAINER_WIDTH = 360;
const FLOORPLAN_CONTAINER_HEIGHT = 300;

export default function IndoorSchematicMap({
  rooms,
  startId,
  endId,
  routePolyline = [],
  completedPolyline = [],
  currentPos,
  onSelectRoom,
  themeColors,
  floorplanUrl,
}: Props) {
  const webViewRef = useRef<WebView>(null);
  const { dark: isDarkMode } = useTheme();

  // Generate HTML content for WebView
  const getHtmlContent = () => {
    if (!floorplanUrl) {
      return `<html><body style="display:flex;align-items:center;justify-content:center;height:100vh;background:${themeColors.background}"><p style="color:${themeColors.text}">No floorplan available</p></body></html>`;
    }

    return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <style>
        body {
          margin: 0;
          padding: 0;
          overflow: hidden;
          background-color: ${themeColors.background};
          touch-action: none;
          user-select: none;
        }
        #container {
          width: 100%;
          height: 100vh;
          overflow: hidden;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        #zoomable-area {
          position: relative;
          transform-origin: 0 0;
          will-change: transform;
        }
        #floorplan {
          width: 100%;
          height: auto;
          object-fit: contain;
          display: block;
        }
        .marker {
          width: 20px;
          height: 20px;
          background-color: ${themeColors.card};
          border: 2px solid ${themeColors.border};
          position: absolute;
          border-radius: 50%;
          transform: translate(-50%, -50%);
          box-shadow: 0 0 5px rgba(0,0,0,0.3);
          cursor: pointer;
          z-index: 10;
          transform-origin: center center;
        }
        .marker.start {
          background-color: ${themeColors.success || '#4CAF50'};
        }
        .marker.end {
          background-color: ${themeColors.primary};
        }
        .marker-label {
          position: absolute;
          top: 25px;
          left: 50%;
          transform: translateX(-50%);
          background: ${isDarkMode ? '#333333' : 'white'};
          color: ${themeColors.secondary};
          padding: 4px 8px;
          font-size: 12px;
          border-radius: 4px;
          white-space: nowrap;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          pointer-events: auto;
          transform-origin: center top;
        }
        .entrance-flag {
          position: absolute;
          width: 10px;
          height: 10px;
          background: ${themeColors.warning || '#FFB300'};
          transform: translate(-50%, -150%);
          z-index: 11;
        }
        .path-line {
          stroke: ${themeColors.primary};
          stroke-width: 3;
          fill: none;
          stroke-dasharray: none;
          opacity: 0.8;
          vector-effect: non-scaling-stroke;
        }
        .completed-line {
          stroke: ${themeColors.text};
          stroke-width: 4;
          opacity: 0.85;
        }
        .current-pos {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background-color: ${themeColors.primary};
          opacity: 0.25;
          position: absolute;
          transform: translate(-50%, -50%);
          z-index: 9;
        }
        .current-pos-center {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background-color: ${themeColors.primary};
          position: absolute;
          transform: translate(-50%, -50%);
          z-index: 9;
        }
      </style>
    </head>
    <body>
      <div id="container">
        <div id="zoomable-area">
          <img id="floorplan" src="${floorplanUrl}" />
          <svg id="path-svg" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 5;" viewBox="0 0 100 100" preserveAspectRatio="none"></svg>
        </div>
      </div>

      <script>
        const container = document.getElementById('container');
        const zoomableArea = document.getElementById('zoomable-area');
        const floorplan = document.getElementById('floorplan');
        const pathSvg = document.getElementById('path-svg');
        
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
        
        // Update marker scales when zoom changes
        function updateMarkerScales() {
          const markers = document.querySelectorAll('.marker');
          const labels = document.querySelectorAll('.marker-label');
          const entranceFlags = document.querySelectorAll('.entrance-flag');
          const currentPos = document.querySelectorAll('.current-pos');
          const currentPosCenter = document.querySelectorAll('.current-pos-center');
          
          const inverseScale = 1 / currentScale;
          
          markers.forEach(marker => {
            marker.style.transform = 'translate(-50%, -50%) scale(' + inverseScale + ')';
          });
          
          labels.forEach(label => {
            label.style.transform = 'translateX(-50%) scale(' + inverseScale + ')';
          });
          
          entranceFlags.forEach(flag => {
            flag.style.transform = 'translate(-50%, -150%) scale(' + inverseScale + ')';
          });
          
          currentPos.forEach(pos => {
            pos.style.transform = 'translate(-50%, -50%) scale(' + inverseScale + ')';
          });
          
          currentPosCenter.forEach(pos => {
            pos.style.transform = 'translate(-50%, -50%) scale(' + inverseScale + ')';
          });
        }
        
        // Handle pinch zoom
        document.addEventListener('touchstart', function(e) {
          if (e.touches.length === 2) {
            startDistance = getDistance(
              e.touches[0].clientX, e.touches[0].clientY,
              e.touches[1].clientX, e.touches[1].clientY
            );
            e.preventDefault();
          } else if (e.touches.length === 1) {
            lastX = e.touches[0].clientX;
            lastY = e.touches[0].clientY;
            isDragging = true;
            
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
          } else if (e.touches.length === 1 && isDragging) {
            const deltaX = e.touches[0].clientX - lastX;
            const deltaY = e.touches[0].clientY - lastY;
            
            currentOffsetX += deltaX;
            currentOffsetY += deltaY;
            
            applyTransform();
            
            lastX = e.touches[0].clientX;
            lastY = e.touches[0].clientY;
            
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
            
            // Handle tap
            if (clickDuration < 300 && clickStartTime > 0) {
              const element = document.elementFromPoint(clickStartX, clickStartY);
              if (element && element.classList.contains('marker')) {
                const roomId = element.dataset.id;
                if (roomId) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'room_selected',
                    id: roomId
                  }));
                }
              }
            }
            
            clickStartTime = 0;
          }
        });
        
        function applyTransform() {
          zoomableArea.style.transform = 'translate(' + currentOffsetX + 'px, ' + currentOffsetY + 'px) scale(' + currentScale + ')';
        }
        
        function getDistance(x1, y1, x2, y2) {
          const xDiff = x2 - x1;
          const yDiff = y2 - y1;
          return Math.sqrt(xDiff * xDiff + yDiff * yDiff);
        }
        
        // Initialize everything when the image loads
        floorplan.addEventListener('load', function() {
          // Add room markers
          ${rooms.map(room => {
            const isStart = room.id === startId;
            const isEnd = room.id === endId;
            const markerClass = isStart ? 'marker start' : isEnd ? 'marker end' : 'marker';
            
            return `
              // Add marker for ${room.name}
              const marker_${room.id.replace(/[^a-zA-Z0-9]/g, '_')} = document.createElement('div');
              marker_${room.id.replace(/[^a-zA-Z0-9]/g, '_')}.className = '${markerClass}';
              marker_${room.id.replace(/[^a-zA-Z0-9]/g, '_')}.dataset.id = '${room.id}';
              marker_${room.id.replace(/[^a-zA-Z0-9]/g, '_')}.style.left = '${room.coordinates.x * 100}%';
              marker_${room.id.replace(/[^a-zA-Z0-9]/g, '_')}.style.top = '${room.coordinates.y * 100}%';
              
              const label_${room.id.replace(/[^a-zA-Z0-9]/g, '_')} = document.createElement('div');
              label_${room.id.replace(/[^a-zA-Z0-9]/g, '_')}.className = 'marker-label';
              label_${room.id.replace(/[^a-zA-Z0-9]/g, '_')}.textContent = '${room.name.replace(/'/g, "\\'")}';
              marker_${room.id.replace(/[^a-zA-Z0-9]/g, '_')}.appendChild(label_${room.id.replace(/[^a-zA-Z0-9]/g, '_')});
              
              zoomableArea.appendChild(marker_${room.id.replace(/[^a-zA-Z0-9]/g, '_')});
              ${(room.isEntrance || room.type === 'entrance') ? `
                const flag_${room.id.replace(/[^a-zA-Z0-9]/g, '_')} = document.createElement('div');
                flag_${room.id.replace(/[^a-zA-Z0-9]/g, '_')}.className = 'entrance-flag';
                flag_${room.id.replace(/[^a-zA-Z0-9]/g, '_')}.style.left = '${room.coordinates.x * 100}%';
                flag_${room.id.replace(/[^a-zA-Z0-9]/g, '_')}.style.top = '${room.coordinates.y * 100}%';
                zoomableArea.appendChild(flag_${room.id.replace(/[^a-zA-Z0-9]/g, '_')});
              ` : ''}
            `;
          }).join('')}
          
          // Draw route polylines if they exist
          ${completedPolyline.length > 1 ? `
            // Draw completed path
            const completedPath = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
            completedPath.setAttribute('points', '${completedPolyline.map(pt => `${pt.x * 100},${pt.y * 100}`).join(' ')}');
            completedPath.setAttribute('class', 'completed-line');
            pathSvg.appendChild(completedPath);
          ` : ''}
          
          ${routePolyline.length > 1 ? `
            // Draw remaining route
            const routePath = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
            routePath.setAttribute('points', '${routePolyline.map(pt => `${pt.x * 100},${pt.y * 100}`).join(' ')}');
            routePath.setAttribute('class', 'path-line');
            pathSvg.appendChild(routePath);
          ` : ''}
          
          ${currentPos ? `
            // Add current position marker
            const outerPos = document.createElement('div');
            outerPos.className = 'current-pos';
            outerPos.style.left = '${currentPos.x * 100}%';
            outerPos.style.top = '${currentPos.y * 100}%';
            
            const innerPos = document.createElement('div');
            innerPos.className = 'current-pos-center';
            innerPos.style.left = '${currentPos.x * 100}%';
            innerPos.style.top = '${currentPos.y * 100}%';
            
            zoomableArea.appendChild(outerPos);
            zoomableArea.appendChild(innerPos);
          ` : ''}
          
          // Center and fit the image initially
          setTimeout(() => {
            currentScale = 1;
            currentOffsetX = 0;
            currentOffsetY = 0;
            applyTransform();
            updateMarkerScales();
          }, 100);
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
      if (data.type === 'room_selected' && data.id) {
        onSelectRoom(data.id);
      }
    } catch (e) {
      console.error('Error parsing WebView message:', e);
    }
  };

  return (
    <View style={styles.fixedContainer}>
      <WebView
        ref={webViewRef}
        source={{ html: getHtmlContent() }}
        style={styles.webView}
        onMessage={handleMessage}
        originWhitelist={['*']}
        scrollEnabled={false}
        bounces={false}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        onError={(e) => console.error('WebView error:', e.nativeEvent)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fixedContainer: {
    width: FLOORPLAN_CONTAINER_WIDTH,
    height: FLOORPLAN_CONTAINER_HEIGHT,
    alignSelf: 'center',
    backgroundColor: 'transparent',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    marginVertical: 16,
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
});