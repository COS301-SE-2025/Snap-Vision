import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, Text, TouchableOpacity } from 'react-native';
import { Camera, useCameraDevices, useCameraPermission } from 'react-native-vision-camera';
import { Canvas, Path, Paint, Skia } from '@shopify/react-native-skia';
import { useTheme } from '@react-navigation/native';
import { lightColors, darkColors } from '../../theme/colours';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Props {
  currentLocation: { x: number; y: number } | null;
  destinationCoords: { x: number; y: number } | null;
  deviceHeading: number;
  navigationSteps?: any[];
  routeCoordinates?: [number, number][];
  currentRouteIndex?: number;
  showMiniMap?: boolean;
}

export default function ARNavigationOverlay({
  currentLocation,
  destinationCoords,
  deviceHeading,
  navigationSteps = [],
  routeCoordinates = [],
  currentRouteIndex = 0,
  showMiniMap = true,
}: Props) {
  const devices = useCameraDevices();
  const device =
    devices.find((d) => d.position === 'back') ||
    devices.find((d) => d.position === 'external') ||
    devices[0];
  const { hasPermission, requestPermission } = useCameraPermission();

  const [isActive, setIsActive] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [nextInstruction, setNextInstruction] = useState<string>('');
  const [isMiniMapCollapsed, setIsMiniMapCollapsed] = useState(false);
  const [isWarningMinimized, setIsWarningMinimized] = useState(true);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    if (hasPermission) {
      if (device) {
        setIsActive(true);
        setDeviceError(null);
      } else {
        setDeviceError('No camera available');
      }
    }
  }, [hasPermission, device, devices]);

  // Get next navigation instruction
  useEffect(() => {
    if (navigationSteps.length > 0 && currentRouteIndex < navigationSteps.length) {
      setNextInstruction(navigationSteps[currentRouteIndex]?.instruction || '');
    }
  }, [navigationSteps, currentRouteIndex]);

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>Camera permission required for AR</Text>
        </View>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={styles.container}>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>{deviceError || 'Initializing camera...'}</Text>
          <SimpleARFallback
            currentLocation={currentLocation}
            destinationCoords={destinationCoords}
            deviceHeading={deviceHeading}
            nextInstruction={nextInstruction}
          />
        </View>

        {/* AR Navigation Warning for fallback view */}
        <ARNavigationWarning
          isMinimized={isWarningMinimized}
          onToggleMinimize={() => setIsWarningMinimized(!isWarningMinimized)}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Camera Background */}
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
        photo={false}
        video={false}
        audio={false}
      />

      {/* Simple AR Guidance Overlay */}
      <SimpleARGuidance
        currentLocation={currentLocation}
        destinationCoords={destinationCoords}
        deviceHeading={deviceHeading}
        nextInstruction={nextInstruction}
        routeCoordinates={routeCoordinates}
        currentRouteIndex={currentRouteIndex}
      />

      {/* AR Navigation Warning */}
      <ARNavigationWarning
        isMinimized={isWarningMinimized}
        onToggleMinimize={() => setIsWarningMinimized(!isWarningMinimized)}
      />

      {/* Mini Map Overlay */}
      {showMiniMap && currentLocation && destinationCoords && routeCoordinates.length > 0 && (
        <MiniMapOverlay
          currentLocation={currentLocation}
          destinationCoords={destinationCoords}
          routeCoordinates={routeCoordinates}
          currentRouteIndex={currentRouteIndex}
          deviceHeading={deviceHeading}
          isCollapsed={isMiniMapCollapsed}
          onToggleCollapse={() => setIsMiniMapCollapsed(!isMiniMapCollapsed)}
        />
      )}
    </View>
  );
}

// AR Navigation Warning Component
function ARNavigationWarning({
  isMinimized,
  onToggleMinimize,
}: {
  isMinimized: boolean;
  onToggleMinimize: () => void;
}) {
  const theme = useTheme();
  const colors = theme.dark ? darkColors : lightColors;

  return (
    <View
      style={[
        styles.warningContainer,
        isMinimized && styles.warningCollapsed,
        { backgroundColor: colors.warning },
      ]}
    >
      <TouchableOpacity style={styles.warningHeader} onPress={onToggleMinimize} activeOpacity={0.7}>
        <Text style={styles.warningTitle}>{isMinimized ? '   ⚠' : 'Navigation Warning'}</Text>
      </TouchableOpacity>

      {!isMinimized && (
        <View style={styles.warningContent}>
          <Text style={styles.warningText}>
            <Text style={styles.warningLabel}>NOTE: </Text>
            AR navigation can be inaccurate due to GPS imprecision and sensor limitations. Use as a
            general guide only.
          </Text>
        </View>
      )}
    </View>
  );
}

// Mini Map Overlay Component
function MiniMapOverlay({
  currentLocation,
  destinationCoords,
  routeCoordinates,
  currentRouteIndex,
  deviceHeading,
  isCollapsed,
  onToggleCollapse,
}: {
  currentLocation: { x: number; y: number };
  destinationCoords: { x: number; y: number };
  routeCoordinates: [number, number][];
  currentRouteIndex: number;
  deviceHeading: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}) {
  // Calculate bounds for the mini map
  const allPoints = [
    [currentLocation.x, currentLocation.y],
    [destinationCoords.x, destinationCoords.y],
    ...routeCoordinates,
  ];

  const bounds = {
    minLat: Math.min(...allPoints.map((p) => p[1])),
    maxLat: Math.max(...allPoints.map((p) => p[1])),
    minLng: Math.min(...allPoints.map((p) => p[0])),
    maxLng: Math.max(...allPoints.map((p) => p[0])),
  };

  // Add padding to bounds
  const latPadding = (bounds.maxLat - bounds.minLat) * 0.1;
  const lngPadding = (bounds.maxLng - bounds.minLng) * 0.1;

  bounds.minLat -= latPadding;
  bounds.maxLat += latPadding;
  bounds.minLng -= lngPadding;
  bounds.maxLng += lngPadding;

  // Convert real coordinates to mini map coordinates
  const coordToMiniMap = (lng: number, lat: number) => {
    const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * 140; // 140 = minimap width - padding
    const y = ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * 140; // Flip Y axis
    return { x: Math.max(10, Math.min(150, x)), y: Math.max(10, Math.min(150, y)) };
  };

  const currentPos = coordToMiniMap(currentLocation.x, currentLocation.y);
  const destPos = coordToMiniMap(destinationCoords.x, destinationCoords.y);

  // Use actual route start and end points for better alignment
  const routeStartPos =
    routeCoordinates.length > 0
      ? coordToMiniMap(routeCoordinates[0][0], routeCoordinates[0][1])
      : currentPos;
  const routeEndPos =
    routeCoordinates.length > 0
      ? coordToMiniMap(
          routeCoordinates[routeCoordinates.length - 1][0],
          routeCoordinates[routeCoordinates.length - 1][1],
        )
      : destPos;

  // Get upcoming route points for preview
  const upcomingPoints = routeCoordinates.slice(currentRouteIndex, currentRouteIndex + 10);

  return (
    <View style={[styles.miniMapContainer, isCollapsed && styles.miniMapCollapsed]}>
      <TouchableOpacity style={styles.miniMapHeader} onPress={onToggleCollapse} activeOpacity={0.7}>
        <Text style={styles.miniMapTitle}>{isCollapsed ? 'Map' : 'Route Overview'}</Text>
        <Text style={styles.miniMapToggle}>{isCollapsed ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {!isCollapsed && (
        <>
          <View style={styles.miniMapCanvas}>
            {/* Route Path */}
            {routeCoordinates.length > 1 && (
              <View style={styles.routePath}>
                {routeCoordinates.slice(0, -1).map((point, index) => {
                  const start = coordToMiniMap(point[0], point[1]);
                  const end = coordToMiniMap(
                    routeCoordinates[index + 1][0],
                    routeCoordinates[index + 1][1],
                  );

                  const length = Math.sqrt(
                    Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2),
                  );
                  const angle = Math.atan2(end.y - start.y, end.x - start.x) * (180 / Math.PI);

                  return (
                    <View
                      key={index}
                      style={[
                        styles.routeSegment,
                        {
                          left: start.x,
                          top: start.y - 1, // Center the line vertically
                          width: length,
                          transform: [{ rotate: `${angle}deg` }],
                          backgroundColor: index < currentRouteIndex ? '#4CAF50' : '#2196F3', // Green for completed, blue for remaining
                          opacity: index < currentRouteIndex ? 0.8 : 1, // Slightly more visible for completed segments
                        },
                      ]}
                    />
                  );
                })}
              </View>
            )}
            <View
              style={[
                styles.currentLocationMarker,
                {
                  left: currentPos.x - 8,
                  top: currentPos.y - 8,
                  transform: [{ rotate: `${deviceHeading}deg` }],
                },
              ]}
            >
              <Text style={styles.currentLocationIcon}>📍</Text>
            </View>
            {/* Destination Marker - positioned at route end */}
            <View
              style={[
                styles.destinationMarker,
                { left: routeEndPos.x - 6, top: routeEndPos.y - 6 },
              ]}
            >
              <Text style={styles.destinationIcon}>🎯</Text>
            </View>
            {/* Upcoming waypoints */}
            {upcomingPoints.slice(1, 4).map((point, index) => {
              const pos = coordToMiniMap(point[0], point[1]);
              return (
                <View
                  key={index}
                  style={[styles.waypointMarker, { left: pos.x - 3, top: pos.y - 3 }]}
                />
              );
            })}
          </View>

          <View style={styles.miniMapFooter}>
            <Text style={styles.miniMapDistance}>
              {Math.round(
                calculateDistance(
                  currentLocation.y,
                  currentLocation.x,
                  destinationCoords.y,
                  destinationCoords.x,
                ),
              )}
              m remaining
            </Text>
          </View>
        </>
      )}
    </View>
  );
}

//AR Guidance Component
function SimpleARGuidance({
  currentLocation,
  destinationCoords,
  deviceHeading,
  nextInstruction,
  routeCoordinates,
  currentRouteIndex,
}: {
  currentLocation: { x: number; y: number } | null;
  destinationCoords: { x: number; y: number } | null;
  deviceHeading: number;
  nextInstruction: string;
  routeCoordinates: [number, number][];
  currentRouteIndex: number;
}) {
  // Add bearing smoothing to prevent flickering
  const [bearingHistory, setBearingHistory] = useState<number[]>([]);
  const [smoothedBearing, setSmoothedBearing] = useState<number | null>(null);

  // Replace the target point calculation in SimpleARGuidance
  const rawBearing =
    currentLocation && destinationCoords
      ? (() => {
          let nextPoint: [number, number];

          if (routeCoordinates.length > 0) {
            //Prevent backward jumps
            const safeBaseIndex = Math.max(0, currentRouteIndex);

            // First, try to find a good forward point
            let targetIndex = safeBaseIndex;
            let bestDistance = Infinity;

            // Search only FORWARD in the route (prevent going backward)
            for (
              let i = safeBaseIndex;
              i < Math.min(safeBaseIndex + 8, routeCoordinates.length);
              i++
            ) {
              const point = routeCoordinates[i];
              const distanceToPoint = calculateDistance(
                currentLocation.y,
                currentLocation.x,
                point[1],
                point[0],
              );

              // Prefer points 15-40 meters ahead (good range for direction)
              if (
                distanceToPoint >= 15 &&
                distanceToPoint <= 40 &&
                distanceToPoint < bestDistance
              ) {
                targetIndex = i;
                bestDistance = distanceToPoint;
              }
            }

            // Fallback: if no good point found, just look ahead by 3-5 points
            if (targetIndex === safeBaseIndex) {
              targetIndex = Math.min(safeBaseIndex + 3, routeCoordinates.length - 1);
            }

            nextPoint = routeCoordinates[targetIndex];
          } else {
            nextPoint = [destinationCoords.x, destinationCoords.y];
          }

          return calculateBearing(currentLocation.y, currentLocation.x, nextPoint[1], nextPoint[0]);
        })()
      : 0;

  // Smooth the bearing to prevent flickering
  useEffect(() => {
    if (!currentLocation || !destinationCoords) return;

    setBearingHistory((prev) => {
      const newHistory = [...prev, rawBearing].slice(-8); // Keep last 8 readings for better smoothing

      // Calculate weighted average with circular angle handling
      let sinSum = 0;
      let cosSum = 0;
      let totalWeight = 0;

      newHistory.forEach((bearing, index) => {
        const weight = Math.pow(index + 1, 1.5); // Exponential weight favoring recent readings
        const radians = bearing * (Math.PI / 180);

        sinSum += Math.sin(radians) * weight;
        cosSum += Math.cos(radians) * weight;
        totalWeight += weight;
      });

      // Convert back to degrees
      const avgSin = sinSum / totalWeight;
      const avgCos = cosSum / totalWeight;
      const smoothedRadians = Math.atan2(avgSin, avgCos);
      const smoothed = smoothedRadians * (180 / Math.PI);

      setSmoothedBearing(normalizeAngle(smoothed));

      return newHistory;
    });
  }, [rawBearing, currentLocation, destinationCoords]);

  if (!currentLocation || !destinationCoords) return null;

  // Use smoothed bearing if available, otherwise use raw
  const bearing = smoothedBearing !== null ? smoothedBearing : rawBearing;

  const normalizedDeviceHeading = ((deviceHeading % 360) + 360) % 360;
  const relativeBearing = normalizeAngle(bearing - normalizedDeviceHeading);

  //direction logic with relaxed tolerances - 45 degrees for straight
  const getDirectionInstruction = () => {
    const absRelativeBearing = Math.abs(relativeBearing);

    if (absRelativeBearing < 45) return 'Continue Straight'; // Increased tolerance for straight
    if (relativeBearing >= 45 && relativeBearing < 100) return 'Turn Right';
    if (relativeBearing >= 100 && relativeBearing < 140) return 'Sharp Right';
    if (relativeBearing >= 140) return 'Turn Around';
    if (relativeBearing <= -45 && relativeBearing > -100) return 'Turn Left';
    if (relativeBearing <= -100 && relativeBearing > -140) return 'Sharp Left';
    if (relativeBearing <= -140) return 'Turn Around';
    return 'Continue';
  };

  // More precise direction logic with relaxed tolerances
  const getDirectionType = () => {
    if (Math.abs(relativeBearing) < 45) return 'up'; // Increased tolerance
    if (relativeBearing >= 45 && relativeBearing < 100) return 'up-right';
    if (relativeBearing >= 100 && relativeBearing < 140) return 'right';
    if (relativeBearing >= 140) return 'turn-around';
    if (relativeBearing <= -45 && relativeBearing > -100) return 'up-left';
    if (relativeBearing <= -100 && relativeBearing > -140) return 'left';
    if (relativeBearing <= -140) return 'turn-around';
    return 'up';
  };

  return (
    <>
      {/* AR Navigation with Arrow and Direction */}
      <View style={styles.mainGuidanceContainer}>
        {/* Simple Arrow without Circle */}
        <View style={styles.arrowContainer}>
          <CustomDirectionArrow direction={getDirectionType()} size={160} />
        </View>

        {/* Direction Text */}
        <Text style={styles.directionText}>{getDirectionInstruction()}</Text>
      </View>
    </>
  );
}

// Simple fallback without camera
function SimpleARFallback({
  currentLocation,
  destinationCoords,
  deviceHeading,
  nextInstruction,
}: {
  currentLocation: { x: number; y: number } | null;
  destinationCoords: { x: number; y: number } | null;
  deviceHeading: number;
  nextInstruction: string;
}) {
  if (!currentLocation || !destinationCoords) return null;

  // FIXED: Use correct coordinate order for GPS coordinates
  const bearing = calculateBearing(
    currentLocation.y, // latitude
    currentLocation.x, // longitude
    destinationCoords.y, // destination latitude
    destinationCoords.x, // destination longitude
  );

  // NO OFFSETS - Pure raw readings from react-native-compass-heading library
  const normalizedHeading = ((deviceHeading % 360) + 360) % 360;
  const relativeBearing = normalizeAngle(bearing - normalizedHeading);
  const distance = calculateDistance(
    currentLocation.y, // latitude
    currentLocation.x, // longitude
    destinationCoords.y, // destination latitude
    destinationCoords.x, // destination longitude
  );

  return (
    <View style={styles.fallbackContainer}>
      <Text style={styles.fallbackTitle}>AR Navigation</Text>

      <View style={[styles.fallbackArrow, { transform: [{ rotate: `${relativeBearing}deg` }] }]}>
        <Text style={styles.fallbackArrowText}>↑</Text>
      </View>

      <Text style={styles.fallbackDistance}>
        {distance >= 1000 ? `${(distance / 1000).toFixed(1)}km` : `${Math.round(distance)}m`}
      </Text>

      {nextInstruction && <Text style={styles.fallbackInstruction}>{nextInstruction}</Text>}
    </View>
  );
}

// Updated utility functions to handle coordinates correctly
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const toDeg = (x: number) => (x * 180) / Math.PI;

  const dLon = toRad(lon2 - lon1);
  const lat1Rad = toRad(lat1);
  const lat2Rad = toRad(lat2);

  const y = Math.sin(dLon) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);

  const bearing = normalizeAngle(toDeg(Math.atan2(y, x)));

  return bearing;
}

function normalizeAngle(angle: number): number {
  while (angle > 180) angle -= 360;
  while (angle < -180) angle += 360;
  return angle;
}

// Simplified Skia-based Arrow Component
function CustomDirectionArrow({ direction, size = 160 }: { direction: string; size?: number }) {
  const theme = useTheme();
  const colors = theme.dark ? darkColors : lightColors;

  // Arrow colors based on theme
  const primaryArrowColor = colors.text; // Blue: #2f6e83 (light) / #69c6d0 (dark)
  const secondaryArrowColor = colors.secondary; // Blue-green: #3E5650 (light) / #90AFA8 (dark)
  const strokeColor = theme.dark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)';

  const getRotation = () => {
    switch (direction) {
      case 'up':
        return 0;
      case 'up-right':
        return 45;
      case 'right':
        return 90;
      case 'down-right':
        return 135;
      case 'down':
        return 180;
      case 'down-left':
        return 225;
      case 'left':
        return 270;
      case 'up-left':
        return 315;
      case 'turn-around':
        return 0; // Will use different path
      default:
        return 0;
    }
  };

  // Special case for turn around - circular arrow
  if (direction === 'turn-around') {
    return (
      <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
        <Canvas style={{ width: size, height: size }}>
          {/* Subtle outline for circular path (drawn first) */}
          <Path
            path={createTurnAroundPath(size)}
            color={strokeColor}
            style="stroke"
            strokeWidth={size * 0.12}
            strokeCap="round"
            strokeJoin="round"
          />
          {/* Main circular path */}
          <Path
            path={createTurnAroundPath(size)}
            color={primaryArrowColor}
            style="stroke"
            strokeWidth={size * 0.08}
            strokeCap="round"
            strokeJoin="round"
          />
          {/* Arrow head outline (drawn first) */}
          <Path
            path={createTurnAroundArrowHead(size)}
            color={strokeColor}
            style="stroke"
            strokeWidth={3}
          />
          {/* Arrow head at end of circle */}
          <Path path={createTurnAroundArrowHead(size)} color={primaryArrowColor} style="fill" />
        </Canvas>
      </View>
    );
  }

  // Standard directional arrow
  return (
    <View
      style={{
        width: size,
        height: size,
        justifyContent: 'center',
        alignItems: 'center',
        transform: [{ rotate: `${getRotation()}deg` }],
      }}
    >
      <Canvas style={{ width: size, height: size }}>
        {/* Arrow shaft */}
        <Path path={createArrowShaft(size)} color={primaryArrowColor} style="fill" />

        {/* Arrow head */}
        <Path path={createArrowHead(size)} color={primaryArrowColor} style="fill" />

        {/* Subtle outline for visibility */}
        <Path path={createArrowShaft(size)} color={strokeColor} style="stroke" strokeWidth={4} />

        <Path path={createArrowHead(size)} color={strokeColor} style="stroke" strokeWidth={4} />
      </Canvas>
    </View>
  );
}

// Helper functions to create Skia paths
function createArrowShaft(size: number): string {
  const centerX = size / 2;
  const shaftWidth = size * 0.15; // Made thicker for better visibility
  const shaftHeight = size * 0.42; // Slightly longer
  const startY = size * 0.43; // Adjusted start position

  return `M ${centerX - shaftWidth / 2} ${startY} 
          L ${centerX + shaftWidth / 2} ${startY} 
          L ${centerX + shaftWidth / 2} ${startY + shaftHeight} 
          L ${centerX - shaftWidth / 2} ${startY + shaftHeight} 
          Z`;
}

function createArrowHead(size: number): string {
  const centerX = size / 2;
  const headWidth = size * 0.35; // Made wider
  const headHeight = size * 0.32; // Slightly taller
  const tipY = size * 0.12; // Moved tip up slightly

  return `M ${centerX} ${tipY} 
          L ${centerX - headWidth / 2} ${tipY + headHeight} 
          L ${centerX + headWidth / 2} ${tipY + headHeight} 
          Z`;
}

function createTurnAroundPath(size: number): string {
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.3; // Increased radius for bigger circular arrow

  // Create a 3/4 circle path
  return `M ${centerX + radius} ${centerY} 
          A ${radius} ${radius} 0 1 1 ${centerX - radius * 0.7} ${centerY - radius * 0.7}`;
}

function createTurnAroundArrowHead(size: number): string {
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.3; // Match the increased radius

  const arrowX = centerX - radius * 0.7 - size * 0.04; // Shifted left by 3.5% of size
  const arrowY = centerY - radius * 0.7;
  const headSize = size * 0.1; // Increased head size

  // Flipped arrow head to point at 270 degrees (to the left)
  // Creating a triangular arrow head pointing left (270 degrees)
  return `M ${arrowX - headSize} ${arrowY} 
          L ${arrowX + headSize} ${arrowY - headSize} 
          L ${arrowX + headSize} ${arrowY + headSize} 
          Z`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
  },
  placeholder: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: 'white',
    fontSize: 16,
    marginVertical: 5,
    textAlign: 'center',
  },

  // Main AR Guidance
  mainGuidanceContainer: {
    position: 'absolute',
    top: screenHeight * 0.375, // Moved down slightly from 0.35 for better positioning
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  debugInfoAboveArrow: {
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    borderRadius: 10,
    maxWidth: screenWidth * 0.9,
  },
  directionCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  directionEmoji: {
    fontSize: 50,
    color: 'white',
  },
  // Updated arrow container without circle
  arrowContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  directionText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  distanceText: {
    fontSize: 18,
    color: 'white',
    marginTop: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bearingDebugText: {
    fontSize: 14,
    color: '#FFD700',
    marginTop: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  compassCalibrationText: {
    fontSize: 16,
    color: '#00FF00',
    marginTop: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    fontWeight: 'bold',
  },

  // Instruction Bar
  instructionBar: {
    position: 'absolute',
    top: 20, // Aligned with turn-by-turn directions in MapScreen
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    zIndex: 3,
  },
  instructionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },

  // Debug
  debugToggle: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 4,
  },
  debugToggleText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  debugInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 10,
    borderRadius: 8,
    minWidth: 200,
    zIndex: 3,
  },
  debugText: {
    color: 'white',
    fontSize: 12,
    marginVertical: 2,
  },

  // Fallback Mode
  fallbackContainer: {
    alignItems: 'center',
    marginTop: 50,
  },
  fallbackTitle: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 30,
  },
  fallbackArrow: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.8)',
    borderRadius: 50,
    borderWidth: 3,
    borderColor: 'white',
    marginVertical: 20,
  },
  fallbackArrowText: {
    fontSize: 50,
    color: 'white',
    fontWeight: 'bold',
  },
  fallbackDistance: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 10,
  },
  fallbackInstruction: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 15,
    borderRadius: 10,
    maxWidth: 300,
  },
  calibrationContainer: {
    position: 'absolute',
    bottom: 120,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 8,
    borderRadius: 10,
  },
  calibrateButton: {
    backgroundColor: 'rgba(76, 175, 80, 0.8)',
    padding: 6,
    borderRadius: 5,
    minWidth: 50,
  },
  calibrateButtonText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  offsetText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Mini Map Styles
  miniMapContainer: {
    position: 'absolute',
    top: 70, // distanc from top of screen
    right: 20,
    width: 160,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    zIndex: 5,
  },
  miniMapHeader: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  miniMapTitle: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  miniMapToggle: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  miniMapCollapsed: {
    height: 'auto',
  },
  miniMapCanvas: {
    width: 160,
    height: 160,
    position: 'relative',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  miniMapFooter: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  miniMapDistance: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  miniMapProgress: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 9,
    marginTop: 2,
  },
  routePath: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  routeSegment: {
    position: 'absolute',
    height: 2,
    backgroundColor: '#4CAF50',
    transformOrigin: 'left center',
  },
  currentLocationMarker: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  currentLocationIcon: {
    fontSize: 8,
    color: 'white',
  },
  destinationMarker: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F44336',
    justifyContent: 'center',
    alignItems: 'center',
  },
  destinationIcon: {
    fontSize: 8,
  },
  waypointMarker: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },

  // Debug styles
  debugContainer: {
    marginTop: 10,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
    alignItems: 'center',
  },

  // Warning component styles (matching minimap styling)
  warningContainer: {
    position: 'absolute',
    top: 70, // Same level as minimap
    left: 20, // Left side to avoid minimap overlap
    width: 160, // Same width as minimap when expanded
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    zIndex: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  warningCollapsed: {
    width: 50, // Smaller width when minimized
    height: 'auto',
  },
  warningHeader: {
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  warningTitle: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    flex: 1,
  },
  warningToggle: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  warningContent: {
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  warningText: {
    color: 'white',
    fontSize: 10,
    lineHeight: 14,
  },
  warningLabel: {
    fontWeight: 'bold',
    color: '#FFD700', // Gold color for emphasis
  },
});
