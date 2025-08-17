import React, { useRef, useEffect, useMemo, useCallback } from 'react';
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
  nextInstructionEnd?: { x: number; y: number };
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
  nextInstructionEnd,
}: Props) {
  const webViewRef = useRef<WebView>(null);
  const { dark: isDarkMode } = useTheme();
  const prevCurrentPosRef = useRef<{ x: number; y: number } | undefined>(undefined);

  // Update position without full refresh
  useEffect(() => {
    if (webViewRef.current && currentPos && 
        (!prevCurrentPosRef.current || 
         prevCurrentPosRef.current.x !== currentPos.x || 
         prevCurrentPosRef.current.y !== currentPos.y)) {
      
      prevCurrentPosRef.current = currentPos;
      
      const updatePositionJS = `
        (function() {
          try {
            const pathSvg = document.getElementById('path-svg');
            if (!pathSvg) return;
            
            // Remove previous position indicators
            const prevOuter = document.getElementById('current-pos-outer-circle');
            const prevInner = document.getElementById('current-pos-inner-circle');
            if (prevOuter) prevOuter.remove();
            if (prevInner) prevInner.remove();
            
            // Create SVG groups for position indicator with animation
            const markerGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            markerGroup.setAttribute('id', 'current-position-group');
            
            // Create pulsing outer circle
            const outerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            outerCircle.setAttribute('id', 'current-pos-outer-circle');
            outerCircle.setAttribute('cx', '${currentPos.x * 100}');
            outerCircle.setAttribute('cy', '${currentPos.y * 100}');
            outerCircle.setAttribute('r', '3');
            outerCircle.setAttribute('fill', '#FF0000');
            outerCircle.setAttribute('fill-opacity', '0.7');
            outerCircle.setAttribute('stroke', '#000000');
            outerCircle.setAttribute('stroke-width', '0.3');
            
            // Create inner circle
            const innerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            innerCircle.setAttribute('id', 'current-pos-inner-circle');
            innerCircle.setAttribute('cx', '${currentPos.x * 100}');
            innerCircle.setAttribute('cy', '${currentPos.y * 100}');
            innerCircle.setAttribute('r', '1.5');
            innerCircle.setAttribute('fill', '#00FF00');
            innerCircle.setAttribute('stroke', '#000000');
            innerCircle.setAttribute('stroke-width', '0.2');
            
            // Add animation to make it pulse
            const pulseAnimation = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
            pulseAnimation.setAttribute('attributeName', 'r');
            pulseAnimation.setAttribute('from', '2');
            pulseAnimation.setAttribute('to', '4');
            pulseAnimation.setAttribute('dur', '1.5s');
            pulseAnimation.setAttribute('begin', '0s');
            pulseAnimation.setAttribute('repeatCount', 'indefinite');
            outerCircle.appendChild(pulseAnimation);
            
            // Add animation to change opacity
            const opacityAnimation = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
            opacityAnimation.setAttribute('attributeName', 'fill-opacity');
            opacityAnimation.setAttribute('from', '0.7');
            opacityAnimation.setAttribute('to', '0.2');
            opacityAnimation.setAttribute('dur', '1.5s');
            opacityAnimation.setAttribute('begin', '0s');
            opacityAnimation.setAttribute('repeatCount', 'indefinite');
            outerCircle.appendChild(opacityAnimation);
            
            // Add circles to group and group to SVG
            markerGroup.appendChild(outerCircle);
            markerGroup.appendChild(innerCircle);
            pathSvg.appendChild(markerGroup);
            
            // Update marker scales to maintain proper size
            if (typeof updateMarkerScales === 'function') {
              updateMarkerScales();
            }
          } catch (e) {
            console.error('Error updating position:', e);
          }
        })();
      `;
      
      webViewRef.current.injectJavaScript(updatePositionJS);
    }
  }, [currentPos]);

  // Update route progress without full refresh
  useEffect(() => {
    if (webViewRef.current && completedPolyline.length > 1) {
      const updateCompletedPathJS = `
        (function() {
          try {
            const pathSvg = document.getElementById('path-svg');
            if (!pathSvg) return;
            
            // Remove previous completed path
            const prevCompletedPath = document.querySelector('.completed-line');
            if (prevCompletedPath) prevCompletedPath.remove();
            
            // Create new completed path
            const completedPath = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
            completedPath.setAttribute('points', '${completedPolyline.map(pt => `${pt.x * 100},${pt.y * 100}`).join(' ')}');
            completedPath.setAttribute('class', 'completed-line');
            pathSvg.appendChild(completedPath);
          } catch (e) {
            console.error('Error updating completed path:', e);
          }
        })();
      `;
      
      webViewRef.current.injectJavaScript(updateCompletedPathJS);
    }
  }, [completedPolyline]);

  // Memoize HTML content to prevent unnecessary rebuilds
  const htmlContent = useMemo(() => {
    if (!floorplanUrl) {
      return `<html><body style="display:flex;align-items:center;justify-content:center;height:100vh;background:${themeColors.background}"><p style="color:${themeColors.text}">No floorplan available</p></body></html>`;
    }

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
          background-color: ${themeColors.primary};
          border: 2px solid ${isDarkMode ? '#ffffff' : '#000000'};
          border-radius: 50%;
          transform: translate(-50%, -50%);
          box-shadow: 0 0 5px rgba(0,0,0,0.5);
          cursor: pointer;
          z-index: 10;
          transform-origin: center center;
        }
        .marker.start {
          background-color: ${themeColors.success || '#4CAF50'};
        }
        .marker.end {
          background-color: ${themeColors.secondary};
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
          stroke-width: 3;
          fill: none;
          stroke-linejoin: round;
          stroke-linecap: round;
          opacity: 0.75;
          vector-effect: non-scaling-stroke;
        }
        .current-pos {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background-color: ${themeColors.secondary};
          opacity: 0.25;
          position: absolute;
          transform: translate(-50%, -50%);
          z-index: 9;
        }
        .current-pos-center {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: ${themeColors.secondary};
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
          ${currentPos ? `
          <!-- Initial position indicators (will be updated dynamically) -->
          <div id="current-pos-outer" style="position: absolute; width: 14px; height: 14px; border-radius: 50%; background-color: ${themeColors.primary}; opacity: 0.25; left: ${currentPos.x * 100}%; top: ${currentPos.y * 100}%; transform: translate(-50%, -50%); z-index: 9;"></div>
          <div id="current-pos-inner" style="position: absolute; width: 8px; height: 8px; border-radius: 50%; background-color: ${themeColors.secondary}; left: ${currentPos.x * 100}%; top: ${currentPos.y * 100}%; transform: translate(-50%, -50%); z-index: 10;"></div>
          ` : ''}
        </div>
      </div>
      <script>
        const container = document.getElementById('container');
        const zoomableArea = document.getElementById('zoomable-area');
        const floorplan = document.getElementById('floorplan');
        const pathSvg = document.getElementById('path-svg');
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

        function updateMarkerScales() {
          const markers = document.querySelectorAll('.marker');
          const labels = document.querySelectorAll('.marker-label');
          const entranceFlags = document.querySelectorAll('.entrance-flag');
          const inverseScale = 1 / currentScale;
          
          // Scale markers and labels
          markers.forEach(marker => {
            marker.style.transform = 'translate(-50%, -50%) scale(' + inverseScale + ')';
          });
          
          labels.forEach(label => {
            label.style.transform = 'translateX(-50%) scale(' + inverseScale + ')';
          });
          
          entranceFlags.forEach(flag => {
            flag.style.transform = 'translate(-50%, -150%) scale(' + inverseScale + ')';
          });
          
          // Scale position indicators using IDs
          const outerPos = document.getElementById('current-pos-outer');
          const innerPos = document.getElementById('current-pos-inner');
          
          if (outerPos) {
            outerPos.style.transform = 'translate(-50%, -50%) scale(' + inverseScale + ')';
          }
          
          if (innerPos) {
            innerPos.style.transform = 'translate(-50%, -50%) scale(' + inverseScale + ')';
          }
        }

        function applyTransform() {
          zoomableArea.style.transform = 'translate(' + currentOffsetX + 'px, ' + currentOffsetY + 'px) scale(' + currentScale + ')';
        }
        function getDistance(x1, y1, x2, y2) {
          const xDiff = x2 - x1;
          const yDiff = y2 - y1;
          return Math.sqrt(xDiff * xDiff + yDiff * yDiff);
        }
        function placeMarker(marker, xNorm, yNorm) {
          marker.style.left = (xNorm * 100) + '%';
          marker.style.top = (yNorm * 100) + '%';
        }

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

        // Initialize everything when the image loads
        floorplan.addEventListener('load', function() {
          // Add room markers
          ${rooms.map(room => {
            const isStart = room.id === startId;
            const isEnd = room.id === endId;
            const markerClass = isStart ? 'marker start' : isEnd ? 'marker end' : 'marker';
            return `
              const marker_${room.id.replace(/[^a-zA-Z0-9]/g, '_')} = document.createElement('div');
              marker_${room.id.replace(/[^a-zA-Z0-9]/g, '_')}.className = '${markerClass}';
              marker_${room.id.replace(/[^a-zA-Z0-9]/g, '_')}.dataset.id = '${room.id}';
              placeMarker(marker_${room.id.replace(/[^a-zA-Z0-9]/g, '_')}, ${room.coordinates.x}, ${room.coordinates.y});
              const label_${room.id.replace(/[^a-zA-Z0-9]/g, '_')} = document.createElement('div');
              label_${room.id.replace(/[^a-zA-Z0-9]/g, '_')}.className = 'marker-label';
              label_${room.id.replace(/[^a-zA-Z0-9]/g, '_')}.textContent = '${room.name.replace(/'/g, "\\'")}';
              marker_${room.id.replace(/[^a-zA-Z0-9]/g, '_')}.appendChild(label_${room.id.replace(/[^a-zA-Z0-9]/g, '_')});
              zoomableArea.appendChild(marker_${room.id.replace(/[^a-zA-Z0-9]/g, '_')});
              ${(room.isEntrance || room.type === 'entrance') ? `
                const flag_${room.id.replace(/[^a-zA-Z0-9]/g, '_')} = document.createElement('div');
                flag_${room.id.replace(/[^a-zA-Z0-9]/g, '_')}.className = 'entrance-flag';
                placeMarker(flag_${room.id.replace(/[^a-zA-Z0-9]/g, '_')}, ${room.coordinates.x}, ${room.coordinates.y});
                zoomableArea.appendChild(flag_${room.id.replace(/[^a-zA-Z0-9]/g, '_')});
              ` : ''}
            `;
          }).join('')}
          // Draw route polylines if they exist
          ${completedPolyline.length > 1 ? `
            const completedPath = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
            completedPath.setAttribute('points', '${completedPolyline.map(pt => `${pt.x * 100},${pt.y * 100}`).join(' ')}');
            completedPath.setAttribute('class', 'completed-line');
            pathSvg.appendChild(completedPath);
          ` : ''}
          ${routePolyline.length > 1 ? `
            const routePath = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
            routePath.setAttribute('points', '${routePolyline.map(pt => `${pt.x * 100},${pt.y * 100}`).join(' ')}');
            routePath.setAttribute('class', 'path-line');
            pathSvg.appendChild(routePath);
          ` : ''}
          // ${nextInstructionEnd ? `
          //   const nextMarker = document.createElement('div');
          //   nextMarker.className = 'marker';
          //   nextMarker.style.backgroundColor = '${themeColors.notification || '#2196F3'}'; // blue highlight
          //   nextMarker.style.border = '2px solid #ffffff';
          //   nextMarker.style.zIndex = 20;
          //   placeMarker(nextMarker, ${nextInstructionEnd.x}, ${nextInstructionEnd.y});
          //   zoomableArea.appendChild(nextMarker);
          // ` : ''}
          // Only initialize position and zoom once when the map first loads
          if (window.initialMapLoadComplete !== true) {
            setTimeout(() => {
              currentScale = 1;
              currentOffsetX = 0;
              currentOffsetY = 0;
              applyTransform();
              updateMarkerScales();
              window.initialMapLoadComplete = true;
            }, 100);
          }
        });
      </script>
    </body>
    </html>
    `;
  }, [floorplanUrl, rooms, startId, endId, routePolyline, isDarkMode, themeColors, nextInstructionEnd]);

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
    <View style={styles.fixedFloorplanContainer}>
      <WebView
        key="indoor-schematic-map-webview" // Adding stable key to prevent WebView recreation
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={styles.fixedWebView}
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
  fixedFloorplanContainer: {
    width: FLOORPLAN_CONTAINER_WIDTH,
    height: FLOORPLAN_CONTAINER_HEIGHT,
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    marginVertical: 16,
  },
  fixedWebView: {
    width: FLOORPLAN_CONTAINER_WIDTH,
    height: FLOORPLAN_CONTAINER_HEIGHT,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
});