// src/components/organisms/ARNavigationOverlay.advanced.tsx
// This is the full AR implementation to be used once react-native-vision-camera and skia are properly configured

import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Camera, useCameraDevices } from 'react-native-vision-camera';
import { Canvas, Path } from '@shopify/react-native-skia';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Props {
  currentLocation: { x: number; y: number } | null;
  destinationCoords: { x: number; y: number } | null;
  deviceHeading: number;
  navigationSteps?: any[];
}

export default function ARNavigationOverlayAdvanced({
  currentLocation,
  destinationCoords,
  deviceHeading,
  navigationSteps = [],
}: Props) {
  const devices = useCameraDevices();
  const device = devices.back;

  const [bearing, setBearing] = useState<number>(0);

  useEffect(() => {
    if (currentLocation && destinationCoords) {
      const newBearing = calculateBearingFromCoords(
        currentLocation.x,
        currentLocation.y,
        destinationCoords.x,
        destinationCoords.y,
      );
      setBearing(newBearing);
    }
  }, [currentLocation, destinationCoords]);

  if (!device) return null;

  const arrowDirection = bearing - deviceHeading;

  return (
    <View style={styles.container}>
      <Camera style={StyleSheet.absoluteFill} device={device} isActive={true} />

      <Canvas style={styles.overlay}>
        <ARArrow direction={arrowDirection} />
      </Canvas>
    </View>
  );
}

function ARArrow({ direction }: { direction: number }) {
  const centerX = screenWidth / 2;
  const centerY = screenHeight / 2 - 100;
  const arrowLength = 80;

  const directionRad = (direction * Math.PI) / 180;
  const endX = centerX + Math.sin(directionRad) * arrowLength;
  const endY = centerY - Math.cos(directionRad) * arrowLength;

  const arrowPath = `M ${centerX} ${centerY} L ${endX} ${endY}`;

  return (
    <>
      <Path path={arrowPath} style="stroke" strokeWidth={8} color="#00FF00" />
      <Path path={createArrowHead(endX, endY, directionRad)} style="fill" color="#00FF00" />
      <Path
        path={`M ${centerX - 8} ${centerY} A 8 8 0 1 0 ${centerX + 8} ${centerY} A 8 8 0 1 0 ${centerX - 8} ${centerY}`}
        style="fill"
        color="#00FF00"
      />
    </>
  );
}

function calculateBearingFromCoords(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const angle = Math.atan2(dx, -dy) * (180 / Math.PI);
  return (angle + 360) % 360;
}

function createArrowHead(x: number, y: number, direction: number): string {
  const size = 20;
  const angle1 = direction + Math.PI * 0.8;
  const angle2 = direction - Math.PI * 0.8;

  const x1 = x + Math.cos(angle1) * size;
  const y1 = y + Math.sin(angle1) * size;
  const x2 = x + Math.cos(angle2) * size;
  const y2 = y + Math.sin(angle2) * size;

  return `M ${x} ${y} L ${x1} ${y1} L ${x2} ${y2} Z`;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
});
