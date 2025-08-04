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
  const [compassOffset, setCompassOffset] = useState(0); // No initial offset

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
            compassOffset={compassOffset}
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
        compassOffset={compassOffset}
        setCompassOffset={setCompassOffset}
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
  currentRouteIndex,
  compassOffset,
  setCompassOffset
}: {
  currentLocation: { x: number; y: number } | null;
  destinationCoords: { x: number; y: number } | null;
  deviceHeading: number;
  nextInstruction: string;
  routeCoordinates: [number, number][];
  currentRouteIndex: number;
  compassOffset: number;
  setCompassOffset: (offset: number) => void;
}) {
  // GPS-based heading (like Google Maps)
  const [gpsHeading, setGpsHeading] = useState<number | null>(null);
  const [lastPosition, setLastPosition] = useState<{x: number, y: number, timestamp: number} | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [movementSpeed, setMovementSpeed] = useState(0);
  
  // Add bearing smoothing to prevent flickering
  const [bearingHistory, setBearingHistory] = useState<number[]>([]);
  const [smoothedBearing, setSmoothedBearing] = useState<number | null>(null);
  
  // Add state for stabilized heading to reduce tilt sensitivity
  const [stabilizedHeading, setStabilizedHeading] = useState(deviceHeading);
  const [headingHistory, setHeadingHistory] = useState<number[]>([]);
  
  // Calculate GPS heading from movement (like Google Maps)
  useEffect(() => {
    if (currentLocation && lastPosition) {
      const now = Date.now();
      const timeDiff = (now - lastPosition.timestamp) / 1000; // seconds
      
      // Skip if GPS update is too slow (> 3 seconds between updates)
      if (timeDiff > 3.0) {
        console.log('GPS UPDATE TOO SLOW:', timeDiff.toFixed(1), 's - skipping GPS heading');
        setLastPosition({
          x: currentLocation.x,
          y: currentLocation.y,
          timestamp: now
        });
        return;
      }
      
      // Calculate distance moved
      const distanceMoved = calculateDistance(
        lastPosition.y, lastPosition.x,
        currentLocation.y, currentLocation.x
      );
      
      // Calculate speed (meters per second)
      const speed = timeDiff > 0 ? distanceMoved / timeDiff : 0;
      setMovementSpeed(speed);
      
      // Debug GPS calculation
      console.log('GPS DEBUG:', {
        timeDiff: timeDiff.toFixed(2),
        distanceMoved: distanceMoved.toFixed(2),
        speed: speed.toFixed(2),
        updateFreq: `${(1/timeDiff).toFixed(1)} Hz`,
        isMovingNow: speed > 0.1 && distanceMoved > 0.3
      });
      
      // Much more sensitive thresholds: 0.1 m/s (very slow walking) and 0.3m distance
      if (speed > 0.1 && distanceMoved > 0.3 && timeDiff < 2.0) {
        const movementBearing = calculateBearing(
          lastPosition.y, lastPosition.x,
          currentLocation.y, currentLocation.x
        );
        setGpsHeading(movementBearing);
        setIsMoving(true);
        console.log('GPS HEADING ACTIVATED:', movementBearing.toFixed(1), '°');
      } else if (speed < 0.02) {
        // Nearly stopped, will fall back to compass
        setIsMoving(false);
        console.log('GPS HEADING DEACTIVATED - stationary');
      }
    }
    
    // Update last position with current timestamp
    if (currentLocation) {
      setLastPosition({
        x: currentLocation.x,
        y: currentLocation.y,
        timestamp: Date.now()
      });
    }
  }, [currentLocation]);
  
  // Stabilize the heading to reduce tilt sensitivity (for compass fallback)
  useEffect(() => {
    const normalizedHeading = ((deviceHeading % 360) + 360) % 360;
    
    // Update heading history (keep last 8 readings)
    setHeadingHistory(prev => {
      const newHistory = [...prev, normalizedHeading].slice(-8);
      
      // Calculate moving average for stability
      const average = newHistory.reduce((sum, h) => sum + h, 0) / newHistory.length;
      
      // Only update if change is significant (> 8°) and consistent
      const recentReadings = newHistory.slice(-3); // Last 3 readings
      const isConsistent = recentReadings.every(h => Math.abs(h - normalizedHeading) < 15);
      
      if (isConsistent && Math.abs(average - stabilizedHeading) > 8) {
        // Smooth the transition to prevent sudden jumps
        const smoothedHeading = stabilizedHeading + (average - stabilizedHeading) * 0.4;
        setStabilizedHeading(smoothedHeading);
      }
      
      return newHistory;
    });
  }, [deviceHeading, stabilizedHeading]);

  if (!currentLocation || !destinationCoords) return null;

  // FIXED: Use the actual route coordinates correctly
  // routeCoordinates are in [longitude, latitude] format from the routing API
  let nextPoint: [number, number];
  
  if (routeCoordinates.length > 0) {
    // Find the next point ahead in the route
    const lookAheadDistance = 1; // Reduced look ahead for more accurate direction
    const nextIndex = Math.min(currentRouteIndex + lookAheadDistance, routeCoordinates.length - 1);
    nextPoint = routeCoordinates[nextIndex];
  } else {
    // Fallback to destination if no route
    nextPoint = [destinationCoords.x, destinationCoords.y];
  }

  // FIXED: Ensure coordinates are in the right order
  // currentLocation: { x: longitude, y: latitude }
  // nextPoint: [longitude, latitude]
  // calculateBearing expects (lat1, lon1, lat2, lon2)
  const rawBearing = calculateBearing(
    currentLocation.y, // current latitude
    currentLocation.x, // current longitude
    nextPoint[1],      // target latitude
    nextPoint[0]       // target longitude
  );
  
  // Smooth the bearing to prevent flickering
  useEffect(() => {
    setBearingHistory(prev => {
      const newHistory = [...prev, rawBearing].slice(-5); // Keep last 5 readings
      
      // Calculate weighted average (more weight to recent readings)
      let weightedSum = 0;
      let totalWeight = 0;
      newHistory.forEach((bearing, index) => {
        const weight = index + 1; // More recent = higher weight
        weightedSum += bearing * weight;
        totalWeight += weight;
      });
      
      const smoothed = weightedSum / totalWeight;
      setSmoothedBearing(smoothed);
      
      return newHistory;
    });
  }, [rawBearing]);
  
  // Use smoothed bearing if available, otherwise use raw
  const bearing = smoothedBearing !== null ? smoothedBearing : rawBearing;
  
  // FIXED: Normalize device heading and handle negative values
  // NO OFFSETS - Pure raw readings from react-native-compass-heading library
  const normalizedDeviceHeading = ((deviceHeading % 360) + 360) % 360; // No offset applied
  const effectiveHeading = (isMoving && gpsHeading !== null) ? gpsHeading : normalizedDeviceHeading;
  const relativeBearing = normalizeAngle(bearing - effectiveHeading);
  
  const distance = calculateDistance(
    currentLocation.y, // current latitude
    currentLocation.x, // current longitude
    nextPoint[1],      // target latitude
    nextPoint[0]       // target longitude
  );

  // More precise direction logic with relaxed tolerances
  const getDirectionInstruction = () => {
    const absRelativeBearing = Math.abs(relativeBearing);
    
    if (absRelativeBearing < 25) return "Continue Straight"; // Increased from 10° to 25°
    if (relativeBearing >= 25 && relativeBearing < 80) return "Turn Right";
    if (relativeBearing >= 80 && relativeBearing < 120) return "Sharp Right";
    if (relativeBearing >= 120) return "Turn Around";
    if (relativeBearing <= -25 && relativeBearing > -80) return "Turn Left";
    if (relativeBearing <= -80 && relativeBearing > -120) return "Sharp Left";
    if (relativeBearing <= -120) return "Turn Around";
    return "Continue";
  };

  // More precise emoji logic with relaxed tolerances
  const getDirectionEmoji = () => {
    if (Math.abs(relativeBearing) < 25) return "⬆️"; // Increased from 10° to 25°
    if (relativeBearing >= 25 && relativeBearing < 45) return "↗️";
    if (relativeBearing >= 45 && relativeBearing < 90) return "➡️";
    if (relativeBearing >= 90 && relativeBearing < 135) return "↘️";
    if (relativeBearing >= 135) return "🔄"; // Turn around
    if (relativeBearing <= -25 && relativeBearing > -45) return "↖️";
    if (relativeBearing <= -45 && relativeBearing > -90) return "⬅️";
    if (relativeBearing <= -90 && relativeBearing > -135) return "↙️";
    if (relativeBearing <= -135) return "🔄"; // Turn around
    return "⬆️";
  };

  return (
    <>
      {/* COMPASS CALIBRATION ONLY - Center of screen */}
      <View style={styles.mainGuidanceContainer}>
        <View style={styles.debugInfoAboveArrow}>
          <Text style={styles.compassCalibrationText}>
            🧭 NEW COMPASS LIBRARY TEST
          </Text>
          
          <Text style={styles.compassCalibrationText}>
            Raw Device: {Math.round(deviceHeading)}°
          </Text>
          
          <Text style={styles.compassCalibrationText}>
            Offset: {compassOffset}° (Currently 0 - No Adjustments)
          </Text>
          
          <Text style={styles.compassCalibrationText}>
            Final Heading: {Math.round(normalizedDeviceHeading)}°
          </Text>
          
          <Text style={styles.compassCalibrationText}>
            📱 Cardinal Direction: {
              normalizedDeviceHeading >= 315 || normalizedDeviceHeading < 45 ? 'NORTH (0°)' :
              normalizedDeviceHeading >= 45 && normalizedDeviceHeading < 135 ? 'EAST (90°)' :
              normalizedDeviceHeading >= 135 && normalizedDeviceHeading < 225 ? 'SOUTH (180°)' :
              'WEST (270°)'
            }
          </Text>
          
          <Text style={styles.bearingDebugText}>
            📱 Test: Does Raw Device update when you rotate phone?
          </Text>
          
          <Text style={styles.bearingDebugText}>
            🧭 Compare: Raw Device vs Your Phone's Compass App
          </Text>
          
          <Text style={styles.bearingDebugText}>
            ⚡ This should work without movement!
          </Text>
        </View>
      </View>

      {/* Compass Calibration Controls */}
      <View style={styles.calibrationContainer}>
        <TouchableOpacity 
          style={styles.calibrateButton}
          onPress={() => setCompassOffset(compassOffset - 90)}
        >
          <Text style={styles.calibrateButtonText}>-90°</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.calibrateButton}
          onPress={() => setCompassOffset(compassOffset - 10)}
        >
          <Text style={styles.calibrateButtonText}>-10°</Text>
        </TouchableOpacity>

        <Text style={styles.offsetText}>Offset: {compassOffset}°</Text>

        <TouchableOpacity 
          style={styles.calibrateButton}
          onPress={() => setCompassOffset(compassOffset + 10)}
        >
          <Text style={styles.calibrateButtonText}>+10°</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.calibrateButton}
          onPress={() => setCompassOffset(compassOffset + 90)}
        >
          <Text style={styles.calibrateButtonText}>+90°</Text>
        </TouchableOpacity>
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
  compassOffset
}: {
  currentLocation: { x: number; y: number } | null;
  destinationCoords: { x: number; y: number } | null;
  deviceHeading: number;
  nextInstruction: string;
  compassOffset: number;
}) {
  if (!currentLocation || !destinationCoords) return null;

  // FIXED: Use correct coordinate order for GPS coordinates
  const bearing = calculateBearing(
    currentLocation.y, // latitude
    currentLocation.x, // longitude
    destinationCoords.y, // destination latitude
    destinationCoords.x  // destination longitude
  );
  
  // NO OFFSETS - Pure raw readings from react-native-compass-heading library
  const normalizedHeading = ((deviceHeading % 360) + 360) % 360;
  const relativeBearing = normalizeAngle(bearing - normalizedHeading);
  const distance = calculateDistance(
    currentLocation.y, // latitude
    currentLocation.x, // longitude
    destinationCoords.y, // destination latitude
    destinationCoords.x  // destination longitude
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
      
      {/* Debug info for fallback */}
      <Text style={styles.fallbackInstruction}>
        True Bearing: {Math.round(bearing)}°
        {bearing > 135 && bearing < 225 ? ' (SOUTH)' : ''}
      </Text>
      
      {nextInstruction && (
        <Text style={styles.fallbackInstruction}>
          {nextInstruction}
        </Text>
      )}
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
  const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
  
  const bearing = normalizeAngle(toDeg(Math.atan2(y, x)));
  
  // Debug log to console to verify calculation
  console.log('BEARING CALC:', {
    from: [lat1, lon1],
    to: [lat2, lon2],
    dLon: toDeg(dLon),
    y: y.toFixed(4),
    x: x.toFixed(4),
    atan2: toDeg(Math.atan2(y, x)).toFixed(1),
    finalBearing: bearing.toFixed(1)
  });
  
  return bearing;
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
    top: screenHeight * 0.25,
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
});