import React, { useRef, useEffect, useMemo, useCallback, useState } from 'react';
import { View, StyleSheet, Text, ActivityIndicator } from 'react-native';
import WebView from 'react-native-webview';
import { useTheme } from '@react-navigation/native';
import {
  useFloorplanPreloader,
  isFloorplanPreloaded,
} from '../../../src/utils/FloorplanManager';

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
  additionalFloorplans?: string[];
}

const FLOORPLAN_CONTAINER_WIDTH = 360;
const FLOORPLAN_CONTAINER_HEIGHT = 300;

const STATIC_HTML = `
<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes, maximum-scale=10.0">
<style>
  :root {
    --bg: #ffffff;
    --text: #000000;
    --primary: #007AFF;
    --secondary: #FF4081;
    --success: #4CAF50;
    --warning: #FFB300;
    --destination: #8B4513;
    --marker-border: #000000;
  }
  html, body {
    margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden;
    background: var(--bg); color: var(--text);
    touch-action: manipulation;
  }
  #container { position: relative; width: 100%; height: 100%; overflow: hidden; }
  #zoomable-area {
    position: absolute; transform-origin: 0 0; transition: transform 0.1s ease-out;
  }
  #floorplan { width: 100vw; height: 100vh; object-fit: contain; display: block; }
  .marker {
    position: absolute; width: 20px; height: 20px; background: var(--primary);
    border: 2px solid var(--marker-border); border-radius: 50%;
    transform: translate(-50%, -50%); box-shadow: 0 0 5px rgba(0,0,0,0.5);
    cursor: pointer; z-index: 10; transform-origin: center center;
  }
  .marker.start { background: var(--destination); }
  .marker.end { background: var(--success); }
  .marker-label {
    position: absolute; top: 25px; left: 50%; transform: translateX(-50%);
    background: #ffffff; color: var(--secondary);
    padding: 4px 8px; font-size: 12px; border-radius: 4px; white-space: nowrap;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2); pointer-events: auto; transform-origin: center top;
  }
  .entrance-flag {
    position: absolute; width: 10px; height: 10px; background: var(--warning);
    transform: translate(-50%, -150%); z-index: 11;
  }
  #path-svg {
    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
    pointer-events: none; z-index: 5;
  }
  .path-line {
    stroke: var(--primary); stroke-width: 3; fill: none; opacity: 0.8; vector-effect: non-scaling-stroke;
  }
  .completed-line {
    stroke: var(--text); stroke-width: 3; fill: none; stroke-linejoin: round; stroke-linecap: round;
    opacity: 0.75; vector-effect: non-scaling-stroke;
  }
</style>
</head>
<body>
  <div id="container">
    <div id="zoomable-area">
      <img id="floorplan" />
      <svg id="path-svg" viewBox="0 0 100 100" preserveAspectRatio="none"></svg>
    </div>
  </div>
  <script>
    // --- Internal state & helpers ---
    window.__state = {
      rooms: [], startId: null, endId: null,
      route: [], done: [], currentPos: null,
      floorplanUrl: null
    };

    const container = document.getElementById('container');
    const zoomableArea = document.getElementById('zoomable-area');
    const floorplan = document.getElementById('floorplan');
    const pathSvg = document.getElementById('path-svg');

    let currentScale = 1, currentOffsetX = 0, currentOffsetY = 0;
    let startDistance = 0, lastX = 0, lastY = 0, isDragging = false;
    let clickStartTime = 0, clickStartX = 0, clickStartY = 0;

    function applyTransform() {
      zoomableArea.style.transform =
        'translate(' + currentOffsetX + 'px,' + currentOffsetY + 'px) scale(' + currentScale + ')';
    }
    function getDistance(x1, y1, x2, y2) {
      const dx = x2 - x1, dy = y2 - y1; return Math.sqrt(dx*dx + dy*dy);
    }
    function placeAbs(el, xNorm, yNorm) {
      el.style.left = (xNorm * 100) + '%';
      el.style.top = (yNorm * 100) + '%';
    }
    function updateMarkerScales() {
      const inverse = 1 / currentScale;
      document.querySelectorAll('.marker').forEach(m => {
        m.style.transform = 'translate(-50%, -50%) scale(' + inverse + ')';
      });
      document.querySelectorAll('.marker-label').forEach(l => {
        l.style.transform = 'translateX(-50%) scale(' + inverse + ')';
      });
      document.querySelectorAll('.entrance-flag').forEach(f => {
        f.style.transform = 'translate(-50%, -150%) scale(' + inverse + ')';
      });
      // current position group (SVG) scales using vector-effect, so no manual scaling needed
    }

    // --- Public API (called from React Native via injectJavaScript) ---
    function setThemeColors(colors) {
      if (!colors) return;
      const root = document.documentElement;
      if (colors.background) root.style.setProperty('--bg', colors.background);
      if (colors.text) root.style.setProperty('--text', colors.text);
      if (colors.primary) root.style.setProperty('--primary', colors.primary);
      if (colors.secondary) root.style.setProperty('--secondary', colors.secondary);
      if (colors.success) root.style.setProperty('--success', colors.success);
      if (colors.warning) root.style.setProperty('--warning', colors.warning);
      if (colors.destination) root.style.setProperty('--destination', colors.destination);
      if (colors.isDarkMode) {
        // Dark mode marker borders are black
        root.style.setProperty('--marker-border', '#000000');
      } else {
        // Light mode marker borders are white
        root.style.setProperty('--marker-border', '#ffffff');
      }
    }

    function mountFloorplan(src) {
      if (!src) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'floorplan_loaded', success: false }));
        return;
      }
      
      // Add cache busting to avoid browser caching issues (if needed)
      const cacheBustingSrc = src.includes('?') ? src + '&t=' + Date.now() : src + '?t=' + Date.now();
      floorplan.src = cacheBustingSrc;
      
      // Let React Native know immediately if image is already complete (from cache)
      if (floorplan.complete) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'floorplan_loaded', success: true }));
        return;
      }

      // Set a timeout to detect if the image doesn't load within a reasonable time
      setTimeout(() => {
        if (!floorplan.complete) {
        }
      }, 5000); // 5 second timeout
    }

    function setRooms(rooms) {
      window.__state.rooms = rooms || [];
      // Remove old markers/labels/flags
      [...zoomableArea.querySelectorAll('.marker,.marker-label,.entrance-flag')].forEach(n => n.remove());
      // Add new
      window.__state.rooms.forEach(room => {
        const m = document.createElement('div');
        m.className = 'marker';
        m.dataset.id = room.id;
        placeAbs(m, room.coordinates.x, room.coordinates.y);
        m.addEventListener('click', () => {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'room_selected', id: room.id }));
        });
        const label = document.createElement('div');
        label.className = 'marker-label';
        label.textContent = room.name || '';
        m.appendChild(label);
        zoomableArea.appendChild(m);

        if (room.isEntrance || room.type === 'entrance') {
          const flag = document.createElement('div');
          flag.className = 'entrance-flag';
          placeAbs(flag, room.coordinates.x, room.coordinates.y);
          zoomableArea.appendChild(flag);
        }
      });
      setStartEnd(window.__state.startId, window.__state.endId); // re-apply start/end classes
      updateMarkerScales();
    }

    function setStartEnd(startId, endId) {
      window.__state.startId = startId || null;
      window.__state.endId = endId || null;
      document.querySelectorAll('.marker').forEach(m => {
        const id = m.dataset.id;
        m.classList.toggle('start', id === window.__state.startId);
        m.classList.toggle('end', id === window.__state.endId);
      });
    }

    function setRoute(points) {
      window.__state.route = points || [];
      const old = pathSvg.querySelector('.path-line');
      if (old) old.remove();
      if (window.__state.route.length > 1) {
        const pl = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        pl.setAttribute('points', window.__state.route.map(p => (p.x*100)+','+(p.y*100)).join(' '));
        pl.setAttribute('class', 'path-line');
        pathSvg.appendChild(pl);
      }
    }

    function setCompleted(points) {
      window.__state.done = points || [];
      const old = pathSvg.querySelector('.completed-line');
      if (old) old.remove();
      if (window.__state.done.length > 1) {
        const pl = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
        pl.setAttribute('points', window.__state.done.map(p => (p.x*100)+','+(p.y*100)).join(' '));
        pl.setAttribute('class', 'completed-line');
        pathSvg.appendChild(pl);
      }
    }

    function updateCurrentPos(pos) {
      window.__state.currentPos = pos || null;
      const prev = document.getElementById('current-position-group');
      if (prev) prev.remove();
      if (!pos) return;

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('id', 'current-position-group');

      const outer = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      outer.setAttribute('id', 'current-pos-outer-circle');
      outer.setAttribute('cx', String(pos.x * 100));
      outer.setAttribute('cy', String(pos.y * 100));
      outer.setAttribute('r', '1');
      outer.setAttribute('fill', 'var(--secondary)');
      outer.setAttribute('fill-opacity', '0.7');
      outer.setAttribute('stroke', 'var(--marker-border)');
      outer.setAttribute('stroke-width', '0.3');
      const pulseR = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
      pulseR.setAttribute('attributeName', 'r');
      pulseR.setAttribute('from', '2'); pulseR.setAttribute('to', '4');
      pulseR.setAttribute('dur', '1.5s'); pulseR.setAttribute('begin', '0s');
      pulseR.setAttribute('repeatCount', 'indefinite');
      outer.appendChild(pulseR);
      const pulseO = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
      pulseO.setAttribute('attributeName', 'fill-opacity');
      pulseO.setAttribute('from', '0.7'); pulseO.setAttribute('to', '0.2');
      pulseO.setAttribute('dur', '1.5s'); pulseO.setAttribute('begin', '0s');
      pulseO.setAttribute('repeatCount', 'indefinite');
      outer.appendChild(pulseO);

      const inner = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      inner.setAttribute('id', 'current-pos-inner-circle');
      inner.setAttribute('cx', String(pos.x * 100));
      inner.setAttribute('cy', String(pos.y * 100));
      inner.setAttribute('r', '1.5');
      inner.setAttribute('fill', 'var(--secondary)');
      inner.setAttribute('stroke', 'var(--marker-border)');
      inner.setAttribute('stroke-width', '0.2');

      g.appendChild(outer); g.appendChild(inner);
      pathSvg.appendChild(g);
    }

    // Define initMap function first so it's available immediately
    function initMap(payload) {
      try {
        setThemeColors(payload.themeColors || null);
        mountFloorplan(payload.floorplanUrl || '');
        setRooms(payload.rooms || []);
        setStartEnd(payload.startId || null, payload.endId || null);
        setRoute(payload.routePolyline || []);
        setCompleted(payload.completedPolyline || []);
        updateCurrentPos(payload.currentPos || null);

        // Initial transform
        currentScale = 1; currentOffsetX = 0; currentOffsetY = 0;
        applyTransform(); updateMarkerScales();
        window.initialMapLoadComplete = true;
      } catch (error) {
      }
    }
    
    // Expose all public API functions
    window.setThemeColors = setThemeColors;
    window.mountFloorplan = mountFloorplan;
    window.setRooms = setRooms;
    window.setStartEnd = setStartEnd;
    window.setRoute = setRoute;
    window.setCompleted = setCompleted;
    window.updateCurrentPos = updateCurrentPos;
    window.initMap = initMap; // Explicitly expose initMap

    // --- Gestures (pinch-zoom & pan) ---
    document.addEventListener('touchstart', function(e) {
      if (e.touches.length === 2) {
        startDistance = getDistance(
          e.touches[0].clientX, e.touches[0].clientY,
          e.touches[1].clientX, e.touches[1].clientY
        );
        e.preventDefault();
      } else if (e.touches.length === 1) {
        lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
        isDragging = true; clickStartTime = Date.now();
        clickStartX = lastX; clickStartY = lastY;
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
          currentScale = newScale; startDistance = distance;
          applyTransform(); updateMarkerScales();
        }
        e.preventDefault();
      } else if (e.touches.length === 1 && isDragging) {
        const deltaX = e.touches[0].clientX - lastX;
        const deltaY = e.touches[0].clientY - lastY;
        
        // Calculate new position with constraints
        const newOffsetX = currentOffsetX + deltaX;
        const newOffsetY = currentOffsetY + deltaY;
        
        // Get container dimensions
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        // Calculate the scaled image dimensions
        const scaledWidth = containerWidth * currentScale;
        const scaledHeight = containerHeight * currentScale;
        
        // Set boundaries to prevent image from moving completely out of view
        // Allow some movement but keep at least 20% of the image visible
        const minVisibleRatio = 0.3;
        const maxOffsetX = containerWidth * (1 - minVisibleRatio);
        const minOffsetX = -(scaledWidth - containerWidth * minVisibleRatio);
        const maxOffsetY = containerHeight * (1 - minVisibleRatio);
        const minOffsetY = -(scaledHeight - containerHeight * minVisibleRatio);
        
        // Apply constraints
        currentOffsetX = Math.max(minOffsetX, Math.min(maxOffsetX, newOffsetX));
        currentOffsetY = Math.max(minOffsetY, Math.min(maxOffsetY, newOffsetY));
        
        applyTransform();
        lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
        e.preventDefault();
      }
    }, { passive: false });

    document.addEventListener('touchend', function(e) {
      if (e.touches.length < 2) startDistance = 0;
      if (e.touches.length === 0) {
        isDragging = false;
        const clickDuration = Date.now() - clickStartTime;
        if (clickDuration < 300 && clickStartTime > 0) {
          const el = document.elementFromPoint(clickStartX, clickStartY);
          if (el && el.classList.contains('marker')) {
            const roomId = el.dataset.id;
            if (roomId) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'room_selected', id: roomId
              }));
            }
          }
        }
        clickStartTime = 0;
      }
    });
  </script>
</body>
</html>
`;

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
  additionalFloorplans = [],
}: Props): React.JSX.Element {
  const webViewRef = useRef<WebView>(null);
  const { dark: isDarkMode } = useTheme();

  const htmlContent = useMemo(() => {
    return STATIC_HTML;
  }, []);

  // Track loading states
  const [webViewReady, setWebViewReady] = useState(false);
  const [floorplanLoaded, setFloorplanLoaded] = useState(false);
  const [initAttempts, setInitAttempts] = useState(0);
  const maxInitAttempts = 3;

  const handleLoadEnd = useCallback(() => {
    setWebViewReady(true);
    setInitAttempts(0); 
    const payload = {
      floorplanUrl,
      rooms,
      startId,
      endId,
      routePolyline,
      completedPolyline,
      currentPos,
      themeColors: {
        background: isDarkMode ? '#121212' : themeColors?.background || '#ffffff',
        text: themeColors?.text || (isDarkMode ? '#ffffff' : '#000000'),
        primary: themeColors?.primary || '#007AFF',
        secondary: themeColors?.secondary || '#FF4081',
        success: themeColors?.success || '#4CAF50',
        warning: themeColors?.warning || '#FFB300',
        destination: '#8B4513',
        isDarkMode: isDarkMode,
      },
    };

    setTimeout(() => {
      webViewRef.current?.injectJavaScript(`
        try {
          // First check if initMap exists, if not define a safety implementation
          if (typeof window.initMap !== 'function') {
            // Define initMap function dynamically if it's missing
            window.initMap = function(payload) {
              try {
                // Apply all the settings
                if (window.setThemeColors) window.setThemeColors(payload.themeColors || null);
                if (window.mountFloorplan) window.mountFloorplan(payload.floorplanUrl || '');
                if (window.setRooms) window.setRooms(payload.rooms || []);
                if (window.setStartEnd) window.setStartEnd(payload.startId || null, payload.endId || null);
                if (window.setRoute) window.setRoute(payload.routePolyline || []);
                if (window.setCompleted) window.setCompleted(payload.completedPolyline || []);
                if (window.updateCurrentPos) window.updateCurrentPos(payload.currentPos || null);
                window.initialMapLoadComplete = true;
              } catch (err) {
              }
            };
          }
          
          // Now call initMap after ensuring it exists
          if (document.readyState === 'complete') {
            window.initMap(${JSON.stringify(payload)});
          } else {
            document.addEventListener('DOMContentLoaded', function() {
              window.initMap(${JSON.stringify(payload)});
            });
          }
          
          // Monitor floorplan image load status
          const floorplan = document.getElementById('floorplan');
          if (floorplan) {
            floorplan.onload = function() {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'floorplan_loaded', success: true }));
            };
            floorplan.onerror = function(e) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'floorplan_loaded', success: false }));
            };
          }
        } catch(error) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'map_init_error', error: error.toString() }));
        }
        true;
      `);
    }, 300);
  }, [
    floorplanUrl,
    rooms,
    startId,
    endId,
    routePolyline,
    completedPolyline,
    currentPos,
    themeColors,
    isDarkMode,
  ]);

  // Incremental updates (no reloads)
  useEffect(() => {
    if (webViewRef.current && webViewReady) {
      webViewRef.current.injectJavaScript(`window.setRooms(${JSON.stringify(rooms || [])}); true;`);
    }
  }, [rooms, webViewReady]);

  useEffect(() => {
    webViewRef.current?.injectJavaScript(
      `window.setStartEnd(${JSON.stringify(startId)}, ${JSON.stringify(endId)}); true;`,
    );
  }, [startId, endId]);

  useEffect(() => {
    webViewRef.current?.injectJavaScript(
      `window.setRoute(${JSON.stringify(routePolyline || [])}); true;`,
    );
  }, [routePolyline]);

  useEffect(() => {
    webViewRef.current?.injectJavaScript(
      `window.setCompleted(${JSON.stringify(completedPolyline || [])}); true;`,
    );
  }, [completedPolyline]);

  useEffect(() => {
    const cmd = currentPos
      ? `window.updateCurrentPos(${JSON.stringify(currentPos)}); true;`
      : `window.updateCurrentPos(null); true;`;
    webViewRef.current?.injectJavaScript(cmd);
  }, [currentPos]);

  useEffect(() => {
    const colors = {
      background: isDarkMode ? '#121212' : themeColors?.background || '#ffffff',
      text: themeColors?.text || (isDarkMode ? '#ffffff' : '#000000'),
      primary: themeColors?.primary || '#007AFF',
      secondary: themeColors?.secondary || '#FF4081',
      success: themeColors?.success || '#4CAF50',
      warning: themeColors?.warning || '#FFB300',
    };
    webViewRef.current?.injectJavaScript(`window.setThemeColors(${JSON.stringify(colors)}); true;`);
  }, [themeColors, isDarkMode]);

  const handleMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'room_selected' && data.id) {
        onSelectRoom(data.id);
      } else if (data.type === 'floorplan_loaded') {
        setFloorplanLoaded(!!data.success);
      } else if (data.type === 'map_init_error') {
      }
    } catch (e) {}
  };

  // Loading and error states for floorplan
  const [isLoading, setIsLoading] = useState(true);

  // Preload all floorplans
  const allFloorplans = useMemo(() => {
    const urls: string[] = [];
    if (floorplanUrl) urls.push(floorplanUrl);
    if (additionalFloorplans && additionalFloorplans.length > 0) {
      urls.push(...additionalFloorplans.filter((url) => !!url));
    }
    return urls;
  }, [floorplanUrl, additionalFloorplans]);

  // Use the floorplan preloader
  const [preloadProgress, setPreloadProgress] = useState(0);
  const { isPreloaded } = useFloorplanPreloader(allFloorplans, (loaded, total) => {
    setPreloadProgress(Math.floor((loaded / Math.max(total, 1)) * 100));
    // If the current floorplan is preloaded, we can consider it loaded
    if (floorplanUrl && isFloorplanPreloaded(floorplanUrl)) {
      setFloorplanLoaded(true);
    }
  });

  // Track previous floorplan URL to handle switching
  const prevFloorplanUrlRef = useRef<string | undefined>(floorplanUrl);

  // Handle floorplan switching
  useEffect(() => {
    if (prevFloorplanUrlRef.current !== floorplanUrl && webViewRef.current && floorplanUrl) {
      // We're switching floors - directly update the floorplan in WebView without reloading

      // If the new floorplan is already preloaded, don't show loading screen
      const alreadyPreloaded = isPreloaded(floorplanUrl);
      if (alreadyPreloaded) {
        setFloorplanLoaded(true);
        // Set loading to false immediately if preloaded
        setIsLoading(false);
      } else {
        // Only show loading if not preloaded
        setFloorplanLoaded(false);
      }

      // Update the floorplan directly via JavaScript injection
      webViewRef.current.injectJavaScript(`
        if (window.mountFloorplan) {
          window.mountFloorplan('${floorplanUrl}');
        }
        true;
      `);

      prevFloorplanUrlRef.current = floorplanUrl;
    }
  }, [floorplanUrl, webViewRef, isPreloaded]);

  // Update loading state when WebView and floorplan states change
  useEffect(() => {
    // Only show loading on first load or when not preloaded
    const isCurrentFloorplanPreloaded = floorplanUrl ? isPreloaded(floorplanUrl) : true;
    const initialLoad = !webViewReady;
    const floorplanNeedsLoading =
      !floorplanLoaded && !!floorplanUrl && !isCurrentFloorplanPreloaded;

    setIsLoading(initialLoad || floorplanNeedsLoading);
  }, [webViewReady, floorplanLoaded, floorplanUrl, isPreloaded]);

  useEffect(() => {
    if (webViewReady && !floorplanLoaded && floorplanUrl && initAttempts < maxInitAttempts) {
      const timer = setTimeout(() => {
        setInitAttempts((prev) => prev + 1);

        // Attempt reinitialization
        const payload = {
          floorplanUrl,
          rooms,
          startId,
          endId,
          routePolyline,
          completedPolyline,
          currentPos,
          themeColors: {
            background: isDarkMode ? '#121212' : themeColors?.background || '#ffffff',
            text: themeColors?.text || (isDarkMode ? '#ffffff' : '#000000'),
            primary: themeColors?.primary || '#007AFF',
            secondary: themeColors?.secondary || '#FF4081',
            success: themeColors?.success || '#4CAF50',
            warning: themeColors?.warning || '#FFB300',
            destination: '#8B4513',
            isDarkMode: isDarkMode,
          },
        };

        webViewRef.current?.injectJavaScript(`
          if (typeof window.initMap === 'function') {
            try {
              window.initMap(${JSON.stringify(payload)});
            } catch(e) {
            }
          }
          true;
        `);
      }, 2000); // Wait 2 seconds between attempts

      return () => clearTimeout(timer);
    }
  }, [
    webViewReady,
    floorplanLoaded,
    floorplanUrl,
    initAttempts,
    isDarkMode,
    rooms,
    startId,
    endId,
    routePolyline,
    completedPolyline,
    currentPos,
    themeColors,
  ]);

  // Clean up resources when component unmounts
  useEffect(() => {
    return () => {
      setWebViewReady(false);
      setFloorplanLoaded(false);
      setInitAttempts(0);
    };
  }, []);

  const handleLoad = useCallback(() => {}, []);

  return (
    <View style={styles.fixedFloorplanContainer}>
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={styles.fixedWebView}
        onLoad={handleLoad}
        onLoadEnd={handleLoadEnd}
        onMessage={handleMessage}
        originWhitelist={['*']}
        scrollEnabled={false}
        bounces={false}
        javaScriptEnabled
        domStorageEnabled
        cacheEnabled={true}
      />

      {/* {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>
            {preloadProgress < 100
              ? `Preloading floorplans (${preloadProgress}%)...`
              : 'Loading floorplan...'}
          </Text>
        </View>
      )} */}
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
    position: 'relative',
  },
  fixedWebView: {
    width: FLOORPLAN_CONTAINER_WIDTH,
    height: FLOORPLAN_CONTAINER_HEIGHT,
    backgroundColor: '#fff',
    borderRadius: 16,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  loadingText: {
    marginTop: 10,
    color: '#333',
    fontSize: 14,
  },
});
