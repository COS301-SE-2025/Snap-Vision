// Simple AR overlay for testing - no camera dependencies
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions, Text, TouchableOpacity, Animated } from 'react-native';
import { accelerometer, setUpdateIntervalForType, SensorTypes } from 'react-native-sensors';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Props {
  currentLocation: { x: number; y: number } | null;
  destinationCoords: { x: number; y: number } | null;
  deviceHeading: number;
  navigationSteps?: any[];
}

export default function SimpleAROverlay({ 
  currentLocation, 
  destinationCoords, 
  deviceHeading,
  navigationSteps = []
}: Props) {
  const [bearing, setBearing] = useState<number>(0);
  const [showDebug, setShowDebug] = useState(true);
  const [showAnimal, setShowAnimal] = useState(false);
  const [currentAnimal, setCurrentAnimal] = useState('🐕');
  const [shakeAnimation] = useState(new Animated.Value(0));
  const [animalPosition] = useState(new Animated.ValueXY({ x: 0, y: 0 }));

  const animals = ['🐕', '🐱', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐸', '🐧', '🦋', '🐝', '🐙', '🦄'];

  useEffect(() => {
    // Set up accelerometer for shake detection
    setUpdateIntervalForType(SensorTypes.accelerometer, 100);
    
    const subscription = accelerometer.subscribe(({ x, y, z }) => {
      const totalAcceleration = Math.sqrt(x * x + y * y + z * z);
      
      // Detect shake (high acceleration) or phone pointing forward (z > 8)
      if (totalAcceleration > 15 || z > 8) {
        if (!showAnimal) {
          // Show new random animal
          const randomAnimal = animals[Math.floor(Math.random() * animals.length)];
          setCurrentAnimal(randomAnimal);
          setShowAnimal(true);
          
          // Random position
          const randomX = Math.random() * (screenWidth - 100);
          const randomY = Math.random() * (screenHeight - 200) + 100;
          
          animalPosition.setValue({ x: randomX, y: randomY });
          
          // Shake animation
          Animated.sequence([
            Animated.timing(shakeAnimation, {
              toValue: 1,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(shakeAnimation, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start();
          
          // Hide animal after 3 seconds
          setTimeout(() => {
            setShowAnimal(false);
          }, 3000);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [showAnimal]);

  // ...existing code...

  useEffect(() => {
    if (currentLocation && destinationCoords) {
      const dx = destinationCoords.x - currentLocation.x;
      const dy = destinationCoords.y - currentLocation.y;
      const newBearing = Math.atan2(dx, -dy) * (180 / Math.PI);
      setBearing((newBearing + 360) % 360);
    }
  }, [currentLocation, destinationCoords]);

  const arrowDirection = bearing - deviceHeading;
  const normalizedDirection = ((arrowDirection + 180) % 360) - 180; // -180 to 180

  const shakeTransform = shakeAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 10],
  });

  return (
    <View style={styles.container}>
      {/* Simple colored background instead of camera */}
      <View style={styles.background} />
      
      {/* Large, visible arrow */}
      <View style={styles.arrowContainer}>
        <Animated.View 
          style={[
            styles.arrow, 
            { 
              transform: [
                { rotate: `${arrowDirection}deg` },
                { translateX: shakeTransform },
                { translateY: shakeTransform }
              ] 
            }
          ]}
        >
          <Text style={styles.arrowText}>▲</Text>
        </Animated.View>
      </View>

      {/* Fun Animal that appears on shake/tilt */}
      {showAnimal && (
        <Animated.View 
          style={[
            styles.animalContainer,
            {
              transform: [
                { translateX: animalPosition.x },
                { translateY: animalPosition.y },
                { scale: shakeAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.5],
                }) }
              ]
            }
          ]}
        >
          <Text style={styles.animalEmoji}>{currentAnimal}</Text>
          <Text style={styles.animalText}>Hello! 👋</Text>
        </Animated.View>
      )}

      {/* Simple status */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          🧭 AR Navigation Active {showAnimal ? '🎉' : ''}
        </Text>
        {showAnimal && (
          <Text style={styles.statusSubtext}>
            Shake or tilt forward to see animals!
          </Text>
        )}
      </View>

      {/* Debug toggle */}
      <TouchableOpacity 
        style={styles.debugToggle}
        onPress={() => setShowDebug(!showDebug)}
      >
        <Text style={styles.debugToggleText}>
          {showDebug ? 'Hide' : 'Info'}
        </Text>
      </TouchableOpacity>

      {/* Debug info */}
      {showDebug && (
        <View style={styles.debugPanel}>
          <Text style={styles.debugText}>🎯 Target: {Math.round(bearing)}°</Text>
          <Text style={styles.debugText}>🧭 Device: {Math.round(deviceHeading)}°</Text>
          <Text style={styles.debugText}>➡️ Arrow: {Math.round(normalizedDirection)}°</Text>
          <Text style={styles.debugText}>
            Direction: {Math.abs(normalizedDirection) < 20 ? 'STRAIGHT' : 
                       normalizedDirection > 0 ? 'TURN RIGHT' : 'TURN LEFT'}
          </Text>
          {showAnimal && (
            <Text style={styles.debugText}>🎉 Animal: {currentAnimal} appeared!</Text>
          )}
        </View>
      )}

      {/* Distance indicator */}
      <View style={styles.distanceIndicator}>
        <Text style={styles.distanceText}>
          📍 Destination Ahead {showAnimal ? '• Animal spotted!' : ''}
        </Text>
      </View>

      {/* Instructions */}
      <TouchableOpacity 
        style={styles.instructionBubble}
        onPress={() => {
          const randomAnimal = animals[Math.floor(Math.random() * animals.length)];
          setCurrentAnimal(randomAnimal);
          setShowAnimal(true);
          setTimeout(() => setShowAnimal(false), 3000);
        }}
      >
        <Text style={styles.instructionText}>
          📱 Shake phone or tap here for animals!
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  background: {
    flex: 1,
    backgroundColor: '#1a1a2e', // Dark blue background
  },
  arrowContainer: {
    position: 'absolute',
    top: screenHeight * 0.4,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  arrow: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 0, 0.9)',
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
  },
  arrowText: {
    fontSize: 50,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusBar: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 12,
    borderRadius: 25,
    alignItems: 'center',
    zIndex: 3,
  },
  statusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusSubtext: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
  },
  animalContainer: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 5,
  },
  animalEmoji: {
    fontSize: 60,
    textAlign: 'center',
  },
  animalText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 5,
  },
  instructionBubble: {
    position: 'absolute',
    top: screenHeight * 0.75,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    zIndex: 2,
  },
  instructionText: {
    color: '#333',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  debugToggle: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    zIndex: 3,
  },
  debugToggleText: {
    color: '#333',
    fontWeight: 'bold',
  },
  debugPanel: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    padding: 15,
    borderRadius: 15,
    zIndex: 2,
  },
  debugText: {
    color: '#fff',
    fontSize: 14,
    marginVertical: 2,
    textAlign: 'center',
  },
  distanceIndicator: {
    position: 'absolute',
    bottom: screenHeight * 0.25,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 165, 0, 0.9)',
    padding: 10,
    borderRadius: 20,
    alignItems: 'center',
    zIndex: 2,
  },
  distanceText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
