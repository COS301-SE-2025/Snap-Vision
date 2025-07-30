import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, Text, TouchableOpacity } from 'react-native';
import { Camera, useCameraDevices, useCameraPermission } from 'react-native-vision-camera';

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
  const [nextInstruction, setNextInstruction] = useState<string>('');

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

// Simplified AR Guidance Component
function SimpleARGuidance({ 
  currentLocation, 
  destinationCoords, 
  deviceHeading,
  nextInstruction,
  routeCoordinates,
  currentRouteIndex
}: {
  currentLocation: { x: number; y: number } | null;
  destinationCoords: { x: number; y: number } | null;
  deviceHeading: number;
  nextInstruction: string;
  routeCoordinates: [number, number][];
  currentRouteIndex: number;
}) {
  if (!currentLocation || !destinationCoords) return null;

  // Get next point from route or destination
  const nextPoint = routeCoordinates.length > currentRouteIndex + 1 
    ? routeCoordinates[currentRouteIndex + 1] 
    : [destinationCoords.x, destinationCoords.y];

  const bearing = calculateBearing(
    currentLocation.x, currentLocation.y,
    nextPoint[0], nextPoint[1]
  );
  
  const relativeBearing = normalizeAngle(bearing - deviceHeading);
  const distance = calculateDistance(
    currentLocation.x, currentLocation.y,
    nextPoint[0], nextPoint[1]
  );

  // Determine direction instruction with much wider tolerance
  const getDirectionInstruction = () => {
    if (Math.abs(relativeBearing) < 45) return "Continue Straight"; // Much wider straight zone
    if (relativeBearing > 45) return "Turn Right";
    if (relativeBearing < -45) return "Turn Left";
    return "Continue";
  };

  // Get direction emoji with wider zones
  const getDirectionEmoji = () => {
    if (Math.abs(relativeBearing) < 45) return "⬆️"; // Wider straight zone
    if (relativeBearing > 135) return "↙️"; // Behind right
    if (relativeBearing > 90) return "➡️";
    if (relativeBearing > 45) return "↗️";
    if (relativeBearing < -135) return "↘️"; // Behind left
    if (relativeBearing < -90) return "⬅️";
    if (relativeBearing < -45) return "↖️";
    return "⬆️";
  };

  return (
    <>
      {/* Main Direction Indicator - Center of screen */}
      <View style={styles.mainGuidanceContainer}>
        <View style={[
          styles.directionCircle,
          { 
            backgroundColor: Math.abs(relativeBearing) < 45 ? '#4CAF50' : '#FF9800', // Wider green zone
            transform: [{ rotate: `0deg` }] // Remove rotation, keep circle stable
          }
        ]}>
          <Text style={styles.directionEmoji}>{getDirectionEmoji()}</Text>
        </View>
        
        <Text style={styles.directionText}>
          {getDirectionInstruction()}
        </Text>
        
        <Text style={styles.distanceText}>
          {Math.round(distance)}m
        </Text>
        
        {/* Add bearing debug info */}
        <Text style={styles.bearingDebugText}>
          Bearing: {Math.round(relativeBearing)}°
        </Text>
      </View>

      {/* Top Instruction Bar */}
      {nextInstruction && (
        <View style={styles.instructionBar}>
          <Text style={styles.instructionText}>
            {nextInstruction}
          </Text>
        </View>
      )}

      {/* Ground Level Path Indicator */}
      <View style={styles.groundIndicator}>
        <View style={[
          styles.pathLine,
          { 
            transform: [{ rotate: `${Math.max(-45, Math.min(45, relativeBearing))}deg` }], // Clamp rotation
            opacity: Math.abs(relativeBearing) < 60 ? 0.8 : 0.3 // Wider visibility zone
          }
        ]} />
        <View style={styles.pathDots}>
          {[...Array(5)].map((_, i) => (
            <View 
              key={i} 
              style={[
                styles.pathDot, 
                { 
                  opacity: Math.abs(relativeBearing) < 60 ? 1 - (i * 0.15) : 0.3, // Wider visibility
                  transform: [{ translateX: Math.max(-50, Math.min(50, relativeBearing * 1.5)) }] // Clamp and reduce movement
                }
              ]} 
            />
          ))}
        </View>
      </View>

      {/* Compass Ring */}
      <View style={styles.compassContainer}>
        <View style={styles.compassRing}>
          <Text style={[styles.compassDirection, { top: 5 }]}>N</Text>
          <Text style={[styles.compassDirection, { right: 5, top: '45%' }]}>E</Text>
          <Text style={[styles.compassDirection, { bottom: 5 }]}>S</Text>
          <Text style={[styles.compassDirection, { left: 5, top: '45%' }]}>W</Text>
          
          {/* Current heading indicator */}
          <View style={[
            styles.headingIndicator,
            { transform: [{ rotate: `${-deviceHeading}deg` }] }
          ]} />
        </View>
      </View>
    </>
  );
}

// Simple fallback without camera
function SimpleARFallback({ 
  currentLocation, 
  destinationCoords, 
  deviceHeading,
  nextInstruction
}: {
  currentLocation: { x: number; y: number } | null;
  destinationCoords: { x: number; y: number } | null;
  deviceHeading: number;
  nextInstruction: string;
}) {
  if (!currentLocation || !destinationCoords) return null;

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
    <View style={styles.fallbackContainer}>
      <Text style={styles.fallbackTitle}>AR Navigation</Text>
      
      <View style={[
        styles.fallbackArrow,
        { transform: [{ rotate: `${relativeBearing}deg` }] }
      ]}>
        <Text style={styles.fallbackArrowText}>↑</Text>
      </View>
      
      <Text style={styles.fallbackDistance}>
        {Math.round(distance)}m to destination
      </Text>
      
      {nextInstruction && (
        <Text style={styles.fallbackInstruction}>
          {nextInstruction}
        </Text>
      )}
    </View>
  );
}

// Utility functions
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
    top: screenHeight * 0.4,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
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
  directionText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
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
  
  // Instruction Bar
  instructionBar: {
    position: 'absolute',
    top: 80,
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
  
  // Ground Path Indicator
  groundIndicator: {
    position: 'absolute',
    bottom: screenHeight * 0.2,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1,
  },
  pathLine: {
    width: 4,
    height: 100,
    backgroundColor: '#4CAF50',
    borderRadius: 2,
  },
  pathDots: {
    flexDirection: 'row',
    marginTop: 10,
    justifyContent: 'center',
  },
  pathDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginHorizontal: 4,
  },
  
  // Mini Compass
  compassContainer: {
    position: 'absolute',
    top: 150,
    right: 20,
    zIndex: 3,
  },
  compassRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: 'white',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compassDirection: {
    position: 'absolute',
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  headingIndicator: {
    width: 2,
    height: 30,
    backgroundColor: '#FF5722',
    position: 'absolute',
    top: 5,
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
});