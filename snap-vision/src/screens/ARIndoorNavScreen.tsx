import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import StandardPopup from '../components/atoms/StandardPopup';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import firestore from '@react-native-firebase/firestore';
//import CompassHeading from 'react-native-compass-heading';
import { Camera, useCameraPermission } from 'react-native-vision-camera';
import type { CameraDevice } from 'react-native-vision-camera';
import {
  calculateRoute,
  generateDetailedDirections,
  getNextARWaypoint,
  calculateARNavigationData,
  getARDirection,
  type NavigationStep,
  calculateARBearing,
} from '../utils/navigationUtils';
import CompassHeading from 'react-native-compass-heading';

type ParamList = {
  ARIndoorNav: {
    buildingId: string;
    buildingName: string;
    locationId: string;
    floorId: string;
    startRoomId: string;
    endRoomId: string;
    userPos?: { x: number; y: number } | null;
    mapOrientationDeg?: number;
  };
};

type RoomPOI = {
  id: string;
  name: string;
  buildingId: string;
  floorId: string;
  coordinates: { x: number; y: number };
  type?: string;
  isEntrance?: boolean;
};
type PathPOI = {
  id: string;
  buildingId: string;
  floorId: string;
  startRoomId?: string;
  endRoomId?: string;
  fromRoomId?: string;
  toRoomId?: string;
  waypoints?: { x: number; y: number }[];
  distance?: number;
  accessible?: boolean;
};

function normalizeDeg(a: number) {
  let x = a % 360;
  if (x < 0) x += 360;
  return x;
}

export default function ARIndoorNavScreen() {
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupTitle, setPopupTitle] = useState('');
  const [popupMessage, setPopupMessage] = useState('');
  const [popupConfirmText, setPopupConfirmText] = useState('OK');
  const route = useRoute<RouteProp<ParamList, 'ARIndoorNav'>>();
  const nav = useNavigation<any>();
  const {
    buildingId,
    buildingName,
    locationId,
    floorId,
    startRoomId,
    endRoomId,
    userPos,
    mapOrientationDeg = 0,
  } = route.params;

  // Camera & permissions
  const { hasPermission, requestPermission } = useCameraPermission();
  const [device, setDevice] = useState<CameraDevice | null>(null);
  const [availableDevices, setAvailableDevices] = useState<CameraDevice[]>([]);
  const cameraRef = useRef<Camera>(null);

  // App state
  const [rooms, setRooms] = useState<RoomPOI[]>([]);
  const [paths, setPaths] = useState<any[]>([]);
  const [steps, setSteps] = useState<NavigationStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(userPos ?? null);
  const [heading, setHeading] = useState<number>(0);

  const [onPopupConfirm, setOnPopupConfirm] = useState<() => void>(
    () => () => setPopupVisible(false),
  );

  const [orientationOffset, setOrientationOffset] = useState<number>(
    normalizeDeg(mapOrientationDeg),
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const status = await Camera.getCameraPermissionStatus();
        if (status !== 'authorized') {
          await Camera.requestCameraPermission();
        }

        const devs = await Camera.getAvailableCameraDevices();
        if (!mounted) return;
        setAvailableDevices(devs);

        const back =
          devs.find((d) => d.position === 'back') ||
          devs.find((d) => d.position === 'external') ||
          devs[0] ||
          null;

        setDevice(back);
      } catch (e) {
        //consolewarn('[AR] Failed to enumerate cameras', e);
        setDevice(null);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const roomSnap = await firestore()
          .collection('locations')
          .doc(locationId)
          .collection('roomPOIs')
          .where('buildingId', '==', buildingId)
          .where('floorId', '==', floorId)
          .get();
        const roomsData = roomSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as RoomPOI);

        const pathSnap = await firestore()
          .collection('locations')
          .doc(locationId)
          .collection('pathPOIs')
          .where('buildingId', '==', buildingId)
          .where('floorId', '==', floorId)
          .get();
        const pathsData = pathSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

        setRooms(roomsData);
        setPaths(pathsData);

        const routeSteps = calculateRoute(
          startRoomId,
          endRoomId,
          roomsData as any,
          pathsData as any,
        );
        if (!routeSteps.length) {
          setPopupTitle('No route');
          setPopupMessage('No path found on this floor.');
          setPopupConfirmText('Go Back');
          setPopupVisible(true);
          setTimeout(() => nav.goBack(), 500);
          return;
        }

        const detailed = generateDetailedDirections(routeSteps);
        setSteps(detailed);
        setCurrentStep(0);

        if (!userPos && detailed[0]?.coordinates) {
          setCurrentPos(detailed[0].coordinates);
        }
      } catch (e) {
        //consoleerror(e);
        setPopupTitle('Error');
        setPopupMessage('Failed to load indoor AR.');
        setPopupConfirmText('Go Back');
        setPopupVisible(true);
        setTimeout(() => nav.goBack(), 500);
      }
    })();
  }, [buildingId, locationId, floorId, startRoomId, endRoomId, nav, userPos]);

  useEffect(() => {
    if (!hasPermission) requestPermission().catch(() => {});
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    CompassHeading.start(6, ({ heading: hdg }) => setHeading(hdg));
    return () => CompassHeading.stop();
  }, []);

  const advance = useCallback(() => {
    if (!steps.length) return;
    if (currentStep >= steps.length - 1) {
      setPopupTitle('Arrived');
      setPopupMessage('You have reached your destination.');
      setPopupConfirmText('OK');
      setOnPopupConfirm(() => () => {
        setPopupVisible(false);
        nav.goBack();
      });
      setPopupVisible(true);
      return;
    }
    const next = currentStep + 1;
    setCurrentStep(next);
    const nextPos = steps[next]?.coordinates;
    if (nextPos) setCurrentPos(nextPos);
  }, [steps, currentStep]);

  const cancel = useCallback(() => nav.goBack(), [nav]);

  const remainingSteps = useMemo(
    () => (steps.length ? steps.slice(currentStep) : []),
    [steps, currentStep],
  );

  const nextWaypoint = useMemo(
    () => getNextARWaypoint(currentPos || remainingSteps[0]?.coordinates, remainingSteps),
    [currentPos, remainingSteps],
  );
  const dest = useMemo(
    () => (steps.length ? steps[steps.length - 1].coordinates : undefined),
    [steps],
  );

  const ar = useMemo(() => {
  if (!currentPos || !dest) return { direction: 0, distance: 0, isAtDestination: false };

  const target = nextWaypoint || dest;
  const bearingMap = calculateARBearing(currentPos, target, true);
  const bearingWorld = normalizeDeg(bearingMap + orientationOffset);

  // IMPROVED: More stable relative bearing calculation
  let rel = bearingWorld - heading;
  
  // Normalize to [-180, 180] range more carefully
  while (rel > 180) rel -= 360;
  while (rel < -180) rel += 360;

  // Add some hysteresis to prevent flickering between directions
  const absRel = Math.abs(rel);
  
  // If we're close to the threshold, apply some smoothing
  if (absRel > 120 && absRel < 160) {
    // Apply some dampening in the "turn around" zone
    rel = rel * 0.8; // Reduce the severity slightly
  }

  const { distance, isAtDestination } = calculateARNavigationData(
    currentPos,
    remainingSteps.length ? remainingSteps : steps,
    dest,
  );

    return { direction: rel, distance, isAtDestination, bearingMap, bearingWorld,rawBearing:bearingMap };
  }, [currentPos, nextWaypoint, dest, remainingSteps, steps, heading, orientationOffset]);

  const calibrate = useCallback(() => {
    if (!currentPos) return;
    const target = nextWaypoint || dest;
    if (!target) return;
    const bearingMap = calculateARBearing(currentPos, target, true);
    const newOffset = normalizeDeg(heading - bearingMap);
    setOrientationOffset(newOffset);
  }, [currentPos, nextWaypoint, dest, heading]);

  const arrowStyle = useMemo(
    () => [{ transform: [{ rotate: `${ar.direction}deg` }] }],
    [ar.direction],
  );
  const currentInstruction = steps[currentStep]?.instruction ?? 'Follow the arrow';

  const showCamera = hasPermission && !!device;

  return (
    <View style={styles.container}>
      {/* Camera */}
      {showCamera ? (
        <Camera ref={cameraRef} style={StyleSheet.absoluteFill} device={device!} isActive />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.fallback]}>
          <Text style={styles.fallbackTitle}>Camera not available</Text>
          {!hasPermission && (
            <Text style={styles.fallbackText}>Grant camera permission and reload the app.</Text>
          )}
          {hasPermission && !device && (
            <>
              <Text style={styles.fallbackText}>No back camera reported by the OS.</Text>
              {availableDevices.length > 0 ? (
                <Text style={styles.fallbackText}>
                  Detected:{' '}
                  {availableDevices.map((d) => `${d.position}:${d.name ?? d.id}`).join(' | ')}
                </Text>
              ) : (
                <Text style={styles.fallbackText}>
                  Detected: none (try a real device or OEM camera enabled)
                </Text>
              )}
            </>
          )}
        </View>
      )}

      {/* HUD */}
      <View style={styles.hud} pointerEvents="box-none">
        <Text style={styles.title}>
          {buildingName} — Floor {floorId}
        </Text>

        <View style={styles.arrowRow}>
          <View style={styles.arrowWrap}>
            <View style={[styles.arrow, arrowStyle]} />
          </View>
        </View>

        <Text style={styles.instruction}>{currentInstruction}</Text>
        <Text style={styles.distance}>
          {ar.isAtDestination ? 'Arrived' : `${Math.round(ar.distance * 10)} m`}
        </Text>

        <View style={styles.actionsRow}>
          <TouchableOpacity onPress={cancel} style={[styles.btn, styles.btnGhost]}>
            <Text style={styles.btnGhostText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={calibrate} style={[styles.btn, styles.btnGhost]}>
            <Text style={styles.btnGhostText}>Calibrate</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={advance} style={[styles.btn, styles.btnPrimary]}>
            <Text style={styles.btnPrimaryText}>
              {currentStep >= steps.length - 1 ? "I've arrived" : 'Mark step done'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.debugPill}>
          <Text style={styles.debugText}>
            {hasPermission ? '📷 ok' : '📷 no'} • {device ? '📱 cam' : '🚫 cam'} • hdg{' '}
            {heading.toFixed(0)}°{'  '}off {Math.round(orientationOffset)}°
          </Text>
        </View>
      </View>
      <StandardPopup
        visible={popupVisible}
        title={popupTitle}
        message={popupMessage}
        confirmText={popupConfirmText}
        onConfirm={() => setPopupVisible(false)}
        showCancel={false}
      />
    </View>
  );
}

const ARROW_SIZE = 80;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  fallback: {
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  fallbackTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  fallbackText: { color: '#ccc', fontSize: 14, textAlign: 'center' },
  hud: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    paddingTop: Platform.select({ ios: 60, android: 40 }),
    paddingHorizontal: 16,
  },
  title: { color: '#fff', fontWeight: '700', fontSize: 16, marginBottom: 12 },
  arrowRow: { alignItems: 'center', marginVertical: 12 },
  arrowWrap: {
    width: ARROW_SIZE * 2,
    height: ARROW_SIZE * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrow: {
    width: 0,
    height: 0,
    borderLeftWidth: ARROW_SIZE * 0.5,
    borderRightWidth: ARROW_SIZE * 0.5,
    borderBottomWidth: ARROW_SIZE * 1.2,
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: 'white',
    opacity: 0.95,
  },
  instruction: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6,
  },
  distance: { color: '#fff', fontSize: 14, opacity: 0.9, marginTop: 4, marginBottom: 12 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10 },
  btnPrimary: { backgroundColor: '#5E5CE6' },
  btnPrimaryText: { color: '#fff', fontWeight: '700' },
  btnGhost: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  btnGhostText: { color: '#fff', fontWeight: '700' },
  debugPill: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  debugText: { color: '#fff', fontSize: 12, opacity: 0.85 },
});