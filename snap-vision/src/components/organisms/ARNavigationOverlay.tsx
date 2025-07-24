import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, Text, TouchableOpacity } from 'react-native';
import { Camera, useCameraDevices, useCameraPermission } from 'react-native-vision-camera';
import { Canvas, Path, Skia, Circle } from '@shopify/react-native-skia';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Props {
  currentLocation: { x: number; y: number } | null;
  destinationCoords: { x: number; y: number } | null;
  deviceHeading: number;
  navigationSteps?: any[];
  routeCoordinates?: [number, number][];
  currentRouteIndex?: number;
}

export default function ARNavigationOverlay({
  currentLocation,
  destinationCoords,
  deviceHeading,
  navigationSteps = [],
  routeCoordinates = [],
  currentRouteIndex = 0,
}: Props) {
  const devices = useCameraDevices();
  const device = devices.back || devices.external || Object.values(devices)[0];
  const { hasPermission, requestPermission } = useCameraPermission();

  const [isActive, setIsActive] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  // Simplified visible route segments
  const [visibleRouteSegments, setVisibleRouteSegments] = useState<{
    x: number;
    y: number;
    distance: number;
  }[]>([]);

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

  // Calculate visible route segments
  useEffect(() => {
    if (currentLocation && routeCoordinates.length > 0) {
      const segments = calculateVisibleRouteSegments(
        currentLocation,
        routeCoordinates,
        currentRouteIndex,
        deviceHeading
      );
      setVisibleRouteSegments(segments);
    }
  }, [currentLocation, routeCoordinates, currentRouteIndex, deviceHeading]);

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
          <ARFallbackView 
            currentLocation={currentLocation}
            routeCoordinates={routeCoordinates}
            currentRouteIndex={currentRouteIndex}
            deviceHeading={deviceHeading}
          />
        </View>
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

      {/* AR Path Overlay */}
      <Canvas style={styles.overlay}>
        <ARPathRenderer 
          routeSegments={visibleRouteSegments}
          deviceHeading={deviceHeading}
          currentLocation={currentLocation}
        />
      </Canvas>

      {/* Simple Direction Arrow - Always visible */}
      {currentLocation && destinationCoords && (
        <View style={styles.directionContainer}>
          <DirectionArrow 
            currentLocation={currentLocation}
            destinationCoords={destinationCoords}
            deviceHeading={deviceHeading}
          />
        </View>
      )}

      {/* Debug Toggle */}
      <TouchableOpacity 
        style={styles.debugToggle} 
        onPress={() => setShowDebugInfo(!showDebugInfo)}
      >
        <Text style={styles.debugToggleText}>
          {showDebugInfo ? '📊 Hide' : 'ℹ️ Info'}
        </Text>
      </TouchableOpacity>

      {/* Debug Info */}
      {showDebugInfo && (
        <View style={styles.debugInfo}>
          <Text style={styles.debugText}>Route Points: {routeCoordinates.length}</Text>
          <Text style={styles.debugText}>Current Index: {currentRouteIndex}</Text>
          <Text style={styles.debugText}>Visible Segments: {visibleRouteSegments.length}</Text>
          <Text style={styles.debugText}>Device Heading: {Math.round(deviceHeading)}°</Text>
          {currentLocation && (
            <Text style={styles.debugText}>
              Location: {currentLocation.y.toFixed(4)}, {currentLocation.x.toFixed(4)}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

// Enhanced calculation with debugging
function calculateVisibleRouteSegments(
  currentLocation: { x: number; y: number },
  routeCoordinates: [number, number][],
  currentRouteIndex: number,
  deviceHeading: number
) {
  console.log('calculateVisibleRouteSegments called with:');
  console.log('- Current location:', currentLocation);
  console.log('- Route coordinates count:', routeCoordinates.length);
  console.log('- Current route index:', currentRouteIndex);
  console.log('- Device heading:', deviceHeading);

  const visiblePoints: { x: number; y: number; distance: number }[] = [];
  const maxVisibleDistance = 100; // Increased for debugging
  const fieldOfView = 120; // Increased for debugging

  // Start from current index and look ahead
  const startIndex = Math.max(0, currentRouteIndex);
  const endIndex = Math.min(routeCoordinates.length, startIndex + 15); // Get more points

  console.log(`Processing route points from index ${startIndex} to ${endIndex}`);

  for (let i = startIndex; i < endIndex; i++) {
    const [lon, lat] = routeCoordinates[i];
    
    const distance = calculateDistance(
      currentLocation.x, currentLocation.y,
      lon, lat
    );

    console.log(`Point ${i}: (${lon.toFixed(6)}, ${lat.toFixed(6)}) - Distance: ${distance.toFixed(2)}m`);

    // Include more points for debugging
    if (distance <= maxVisibleDistance && distance > 1) {
      const bearing = calculateBearing(currentLocation.x, currentLocation.y, lon, lat);
      const relativeBearing = normalizeAngle(bearing - deviceHeading);
      
      console.log(`Point ${i}: Bearing: ${bearing.toFixed(2)}°, Relative: ${relativeBearing.toFixed(2)}°`);
      
      // Include points within field of view (more lenient for debugging)
      if (Math.abs(relativeBearing) <= fieldOfView / 2) {
        visiblePoints.push({
          x: lon,
          y: lat,
          distance
        });
        console.log(`Point ${i}: INCLUDED in visible points`);
      } else {
        console.log(`Point ${i}: EXCLUDED - outside field of view`);
      }
    } else {
      console.log(`Point ${i}: EXCLUDED - distance ${distance.toFixed(2)}m (max: ${maxVisibleDistance}m)`);
    }
  }

  console.log(`Total visible points: ${visiblePoints.length}`);
  return visiblePoints;
}

// AR Path Renderer Component - Enhanced with debugging (reverted to better version)
function ARPathRenderer({ 
  routeSegments, 
  deviceHeading,
  currentLocation
}: { 
  routeSegments: { x: number; y: number; distance: number }[]; 
  deviceHeading: number;
  currentLocation: { x: number; y: number } | null;
}) {
  console.log('ARPathRenderer - Route segments:', routeSegments.length);
  console.log('ARPathRenderer - Current location:', currentLocation);
  
  if (routeSegments.length < 2 || !currentLocation) {
    console.log('ARPathRenderer - Not enough data to render path');
    return null;
  }

  // Convert world coordinates to screen coordinates
  const screenPoints = routeSegments
    .map((point, index) => {
      const screenPoint = worldToScreen(point, deviceHeading, currentLocation);
      console.log(`Point ${index}: World(${point.x.toFixed(6)}, ${point.y.toFixed(6)}) -> Screen(${screenPoint?.x}, ${screenPoint?.y})`);
      return screenPoint;
    })
    .filter(point => point !== null);

  console.log('ARPathRenderer - Screen points:', screenPoints.length);

  if (screenPoints.length < 2) {
    console.log('ARPathRenderer - Not enough screen points to render path');
    return null;
  }

  // Create a simple straight line path for debugging
  const routePath = Skia.Path.Make();
  routePath.moveTo(screenPoints[0]!.x, screenPoints[0]!.y);
  
  // Just draw straight lines between points for now
  for (let i = 1; i < screenPoints.length; i++) {
    const point = screenPoints[i]!;
    routePath.lineTo(point.x, point.y);
  }

  return (
    <>
      {/* Route line - make it very visible */}
      <Path 
        path={routePath} 
        style="stroke" 
        strokeWidth={25} 
        color="#00FF00" // Bright green
        opacity={1.0}
      />
      
      {/* Route points - smaller and less intrusive */}
      {screenPoints.map((point, index) => (
        <Circle
          key={index}
          cx={point!.x}
          cy={point!.y}
          r={8}
          color="#FFFFFF" 
          opacity={0.8}
        />
      ))}
    </>
  );
}

// Simple direction arrow component
function DirectionArrow({ 
  currentLocation, 
  destinationCoords, 
  deviceHeading 
}: {
  currentLocation: { x: number; y: number };
  destinationCoords: { x: number; y: number };
  deviceHeading: number;
}) {
  const bearing = calculateBearing(
    currentLocation.x, currentLocation.y,
    destinationCoords.x, destinationCoords.y
  );
  
  const relativeBearing = normalizeAngle(bearing - deviceHeading);
  const distance = calculateDistance(
    currentLocation.x, currentLocation.y,
    destinationCoords.x, destinationCoords.y
  );

  return (
    <View style={styles.arrowContainer}>
      <View
        style={[
          styles.arrow,
          {
            transform: [{ rotate: `${relativeBearing}deg` }],
          },
        ]}
      >
        <Text style={styles.arrowText}>→</Text>
      </View>
      <Text style={styles.distanceText}>
        {Math.round(distance)}m to destination
      </Text>
    </View>
  );
}

// Fallback AR view without camera
function ARFallbackView({ 
  currentLocation, 
  routeCoordinates, 
  currentRouteIndex, 
  deviceHeading 
}: {
  currentLocation: { x: number; y: number } | null;
  routeCoordinates: [number, number][];
  currentRouteIndex: number;
  deviceHeading: number;
}) {
  if (!currentLocation || routeCoordinates.length === 0) return null;

  const nextPoint = routeCoordinates[Math.min(currentRouteIndex + 1, routeCoordinates.length - 1)];
  if (!nextPoint) return null;

  const bearing = calculateBearing(
    currentLocation.x, currentLocation.y,
    nextPoint[0], nextPoint[1]
  );

  const arrowDirection = normalizeAngle(bearing - deviceHeading);

  return (
    <View style={styles.fallbackContainer}>
      <Text style={styles.fallbackText}>AR Navigation (Fallback Mode)</Text>
      <View
        style={[
          styles.fallbackArrow,
          {
            transform: [{ rotate: `${arrowDirection}deg` }],
          },
        ]}
      >
        <Text style={styles.arrowText}>↑</Text>
      </View>
      <Text style={styles.fallbackText}>
        Next: {Math.round(calculateDistance(
          currentLocation.x, currentLocation.y,
          nextPoint[0], nextPoint[1]
        ))}m
      </Text>
    </View>
  );
}

// Enhanced coordinate projection with better ground-level positioning
function worldToScreen(
  worldPoint: { x: number; y: number; distance: number },
  deviceHeading: number,
  currentLocation: { x: number; y: number }
): { x: number; y: number } | null {
  // Calculate bearing from current location to the point
  const bearing = calculateBearing(currentLocation.x, currentLocation.y, worldPoint.x, worldPoint.y);
  const relativeBearing = normalizeAngle(bearing - deviceHeading);
  
  console.log(`WorldToScreen - Bearing: ${bearing.toFixed(2)}°, Relative: ${relativeBearing.toFixed(2)}°, Distance: ${worldPoint.distance.toFixed(2)}m`);
  
  // Horizontal position based on bearing (wider field of view)
  const horizontalFactor = relativeBearing / 60; // Map -60° to +60° to screen width
  const horizontalPos = screenWidth / 2 + (horizontalFactor * screenWidth / 2);
  
  // Ground-level vertical positioning for AR effect
  const maxDistance = 100;
  const minDistance = 5;
  
  // Normalize distance with better scaling
  const clampedDistance = Math.max(minDistance, Math.min(worldPoint.distance, maxDistance));
  const normalizedDistance = (clampedDistance - minDistance) / (maxDistance - minDistance);
  
  // Ground level positioning - closer points appear much lower
  const groundLevel = screenHeight * 0.95; // Very bottom of screen
  const horizonLevel = screenHeight * 0.6;  // Higher horizon for better perspective
  
  // Use exponential scaling for better depth perception
  const distanceFactor = Math.pow(normalizedDistance, 0.7);
  const verticalPos = groundLevel - (distanceFactor * (groundLevel - horizonLevel));
  
  console.log(`WorldToScreen - Distance: ${worldPoint.distance.toFixed(2)}m, Normalized: ${normalizedDistance.toFixed(3)}, VerticalPos: ${verticalPos.toFixed(2)}`);
  console.log(`WorldToScreen - Screen position: (${horizontalPos.toFixed(2)}, ${verticalPos.toFixed(2)})`);
  
  // Bounds checking (more lenient for debugging)
  if (horizontalPos < -50 || horizontalPos > screenWidth + 50) {
    console.log('WorldToScreen - Point outside horizontal bounds');
    return null;
  }
  if (verticalPos < horizonLevel || verticalPos > screenHeight) {
    console.log('WorldToScreen - Point outside vertical bounds');
    return null;
  }
  
  return { x: horizontalPos, y: verticalPos };
}

// Utility functions remain the same
function calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(y2 - y1);
  const dLon = toRad(x2 - x1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(y1)) * Math.cos(toRad(y2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function calculateBearing(x1: number, y1: number, x2: number, y2: number): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const toDeg = (x: number) => (x * 180) / Math.PI;
  
  const dLon = toRad(x2 - x1);
  const lat1 = toRad(y1);
  const lat2 = toRad(y2);
  
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  
  return normalizeAngle(toDeg(Math.atan2(y, x)));
}

function normalizeAngle(angle: number): number {
  while (angle > 180) angle -= 360;
  while (angle < -180) angle += 360;
  return angle;
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
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
  directionContainer: {
    position: 'absolute',
    top: screenHeight * 0.3,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  arrowContainer: {
    alignItems: 'center',
  },
  arrow: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 255, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  arrowText: {
    fontSize: 40,
    color: 'white',
    fontWeight: 'bold',
  },
  distanceText: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  debugToggle: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 3,
  },
  debugToggleText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  debugInfo: {
    position: 'absolute',
    bottom: 100,
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
  fallbackContainer: {
    alignItems: 'center',
    marginTop: 50,
  },
  fallbackText: {
    color: 'white',
    fontSize: 16,
    marginVertical: 10,
  },
  fallbackArrow: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 0, 0.8)',
    borderRadius: 30,
    marginVertical: 20,
  },
});