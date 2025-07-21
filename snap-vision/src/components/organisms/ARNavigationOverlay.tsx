// src/components/organisms/ARNavigationOverlay.tsx
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, Text, TouchableOpacity } from 'react-native';
import { Camera, useCameraDevices, useCameraPermission } from 'react-native-vision-camera';
import { Canvas, Path, Skia } from '@shopify/react-native-skia';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Props {
  currentLocation: { x: number; y: number } | null;
  destinationCoords: { x: number; y: number } | null;
  deviceHeading: number; // From compass/magnetometer
  navigationSteps?: any[]; // Your existing navigation steps
}

export default function ARNavigationOverlay({
  currentLocation,
  destinationCoords,
  deviceHeading,
  navigationSteps = [],
}: Props) {
  const devices = useCameraDevices();
  const device = devices.back || devices.external || Object.values(devices)[0];
  const { hasPermission, requestPermission } = useCameraPermission();

  const [bearing, setBearing] = useState<number>(0);
  const [isActive, setIsActive] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);
  const [showDebugInfo, setShowDebugInfo] = useState(false);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    console.log('Available devices:', devices);
    console.log('Selected device:', device);

    if (hasPermission) {
      if (device) {
        setIsActive(true);
        setDeviceError(null);
      } else {
        setDeviceError('No camera available');
        console.warn('No camera device found. Available devices:', Object.keys(devices));
      }
    }
  }, [hasPermission, device, devices]);

  useEffect(() => {
    if (currentLocation && destinationCoords) {
      // Calculate bearing to destination using your coordinate system
      const newBearing = calculateBearingFromCoords(
        currentLocation.x,
        currentLocation.y,
        destinationCoords.x,
        destinationCoords.y,
      );
      setBearing(newBearing);
    }
  }, [currentLocation, destinationCoords]);

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
          <Text style={styles.placeholderText}>
            Available devices: {Object.keys(devices).join(', ') || 'None'}
          </Text>
          <Text style={styles.placeholderText}>Try using the fallback AR mode below</Text>

          {/* Fallback AR without camera */}
          <TouchableOpacity
            style={styles.debugToggle}
            onPress={() => setShowDebugInfo(!showDebugInfo)}
          >
            <Text style={styles.debugToggleText}>
              {showDebugInfo ? '📊 Hide Info' : 'ℹ️ Debug'}
            </Text>
          </TouchableOpacity>

          {showDebugInfo && (
            <View style={styles.fallbackAR}>
              <Text style={styles.debugText}>Fallback AR Mode</Text>
              <Text style={styles.debugText}>Direction: {Math.round(bearing)}°</Text>
              <Text style={styles.debugText}>Device Heading: {Math.round(deviceHeading)}°</Text>

              <View
                style={[
                  styles.fallbackArrow,
                  {
                    transform: [{ rotate: `${bearing - deviceHeading}deg` }],
                  },
                ]}
              >
                <Text style={styles.arrowText}>↑</Text>
              </View>
            </View>
          )}

          {!showDebugInfo && (
            <View style={styles.minimalFallback}>
              <Text style={styles.placeholderText}>AR Mode Active</Text>
              <View
                style={[
                  styles.fallbackArrow,
                  {
                    transform: [{ rotate: `${bearing - deviceHeading}deg` }],
                  },
                ]}
              >
                <Text style={styles.arrowText}>↑</Text>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  }

  // Calculate arrow direction relative to device heading
  const arrowDirection = bearing - deviceHeading;

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

      {/* AR Overlay */}
      <Canvas style={styles.overlay}>
        <ARArrow direction={arrowDirection} />
      </Canvas>

      {/* Collapsible Debug Toggle Button */}
      <TouchableOpacity style={styles.debugToggle} onPress={() => setShowDebugInfo(!showDebugInfo)}>
        <Text style={styles.debugToggleText}>{showDebugInfo ? '📊 Hide Info' : 'ℹ️ Debug'}</Text>
      </TouchableOpacity>

      {/* Minimal AR Status (when debug is hidden) */}
      {!showDebugInfo && (
        <View style={styles.minimalStatus}>
          <Text style={styles.minimalStatusText}>
            AR Active • {Math.round(Math.abs(arrowDirection))}° {arrowDirection > 0 ? '→' : '←'}
          </Text>
        </View>
      )}

      {/* Collapsible Debug Info */}
      {showDebugInfo && (
        <View style={styles.debugInfo}>
          <TouchableOpacity style={styles.debugHeader} onPress={() => setShowDebugInfo(false)}>
            <Text style={styles.debugHeaderText}>AR Navigation Debug ▼</Text>
          </TouchableOpacity>
          <Text style={styles.debugText}>Direction: {Math.round(bearing)}°</Text>
          <Text style={styles.debugText}>Device Heading: {Math.round(deviceHeading)}°</Text>
          <Text style={styles.debugText}>Arrow: {Math.round(arrowDirection)}°</Text>
        </View>
      )}
    </View>
  );
}

// Helper component for drawing the AR arrow using Skia
function ARArrow({ direction }: { direction: number }) {
  const centerX = screenWidth / 2;
  const centerY = screenHeight / 2;
  const arrowLength = 80;

  // Convert direction to radians and adjust for screen coordinates
  const directionRad = (direction * Math.PI) / 180;

  // Calculate arrow end point
  const endX = centerX + Math.sin(directionRad) * arrowLength;
  const endY = centerY - Math.cos(directionRad) * arrowLength;

  // Create arrow shaft path
  const shaftPath = Skia.Path.Make();
  shaftPath.moveTo(centerX, centerY);
  shaftPath.lineTo(endX, endY);

  // Create arrowhead path
  const arrowheadPath = createArrowHead(endX, endY, directionRad);

  return (
    <>
      {/* Arrow shaft */}
      <Path path={shaftPath} style="stroke" strokeWidth={6} color="#00FF00" />
      {/* Arrowhead */}
      <Path path={arrowheadPath} style="fill" color="#00FF00" />
      {/* Center dot */}
      <Path path={createCenterDot(centerX, centerY)} style="fill" color="#FF0000" />
    </>
  );
}

// Helper function to calculate bearing from current position to target in your coordinate system
function calculateBearingFromCoords(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;

  // Calculate angle in radians, then convert to degrees
  const angle = Math.atan2(dx, -dy) * (180 / Math.PI);

  // Normalize to 0-360 degrees
  return (angle + 360) % 360;
}

// Helper function to create arrowhead using Skia
function createArrowHead(x: number, y: number, direction: number) {
  const size = 20;
  const angle1 = direction + Math.PI * 0.8;
  const angle2 = direction - Math.PI * 0.8;

  const x1 = x + Math.cos(angle1) * size;
  const y1 = y + Math.sin(angle1) * size;
  const x2 = x + Math.cos(angle2) * size;
  const y2 = y + Math.sin(angle2) * size;

  const path = Skia.Path.Make();
  path.moveTo(x, y);
  path.lineTo(x1, y1);
  path.lineTo(x2, y2);
  path.close();

  return path;
}

// Helper function to create center reference dot
function createCenterDot(x: number, y: number) {
  const path = Skia.Path.Make();
  path.addCircle(x, y, 5);
  return path;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
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
    fontSize: 18,
    marginVertical: 5,
    textAlign: 'center',
  },
  debugInfo: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    zIndex: 3,
    elevation: 5,
  },
  debugToggle: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 3,
    elevation: 5,
  },
  debugToggleText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  minimalStatus: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    zIndex: 2,
    alignItems: 'center',
  },
  minimalStatusText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  debugHeader: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 8,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    marginBottom: 5,
  },
  debugHeaderText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  debugText: {
    color: 'white',
    fontSize: 12,
    textAlign: 'center',
    marginVertical: 2,
    paddingHorizontal: 10,
    paddingBottom: 5,
  },
  fallbackAR: {
    marginTop: 30,
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 12,
    alignItems: 'center',
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
  },
  minimalFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackArrow: {
    marginTop: 20,
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 0, 0.3)',
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#00FF00',
  },
  arrowText: {
    color: '#00FF00',
    fontSize: 50,
    fontWeight: 'bold',
  },
});
