// src/screens/IndoorSchematicNavScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Alert, Text, TouchableOpacity } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import SettingsHeader from '../components/molecules/SettingsHeader';
import IndoorSchematicMap from '../components/organisms/IndoorSchematicMap';
import StepsBottomSheet from '../components/molecules/StepsBottomSheet';
import {
  calculateRoute,
  generateDetailedDirections,
  calculateDistance,
  type NavigationStep,
} from '../utils/navigationUtils';

type ParamList = {
  IndoorSchematicNav: {
    buildingId: string;
    buildingName: string;
    locationId: string;
    floorId: string;
    userPos?: { x: number; y: number } | null;
  };
};

export interface RoomPOI {
  id: string;
  name: string;
  buildingId: string;
  floorId: string;
  coordinates: { x: number; y: number };
  type?: string;
  description?: string | null;
  isEntrance?: boolean;
}

export interface PathPOI {
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
}

export default function IndoorSchematicNavScreen() {
  const route = useRoute<RouteProp<ParamList, 'IndoorSchematicNav'>>();
  const { buildingId, buildingName, locationId, floorId, userPos } = route.params;

  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  const [rooms, setRooms] = useState<RoomPOI[]>([]);
  const [paths, setPaths] = useState<PathPOI[]>([]);
  const [loading, setLoading] = useState(true);

  const [startId, setStartId] = useState<string | null>(null);
  const [endId, setEndId] = useState<string | null>(null);

  const [steps, setSteps] = useState<NavigationStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(userPos ?? null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

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

        const pathsData = pathSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as PathPOI);

        setRooms(roomsData);
        setPaths(pathsData);

        // Default current position to nearest entrance if none provided
        if (!userPos) {
          const entrances = roomsData.filter((r) => r.isEntrance || r.type === 'entrance');
          if (entrances.length) {
            const centroid = roomsData.reduce(
              (acc, r) => ({ x: acc.x + r.coordinates.x, y: acc.y + r.coordinates.y }),
              { x: 0, y: 0 },
            );
            centroid.x /= roomsData.length || 1;
            centroid.y /= roomsData.length || 1;

            let best = entrances[0];
            let bestD = calculateDistance(centroid, best.coordinates);
            for (let i = 1; i < entrances.length; i++) {
              const d = calculateDistance(centroid, entrances[i].coordinates);
              if (d < bestD) {
                best = entrances[i];
                bestD = d;
              }
            }
            setCurrentPos(best.coordinates);
          }
        }
      } catch (e) {
        console.error(e);
        Alert.alert('Error', 'Failed to load indoor data.');
      } finally {
        setLoading(false);
      }
    })();
  }, [buildingId, locationId, floorId, userPos]);

  const resetRoute = () => {
    setStartId(null);
    setEndId(null);
    setSteps([]);
    setCurrentStep(0);
    setSheetOpen(false);
    // Keep currentPos as-is (you are here stays)
  };

  const onSelectRoom = (roomId: string) => {
    if (!startId) {
      setStartId(roomId);
      setEndId(null);
      setSteps([]);
      setCurrentStep(0);
      setSheetOpen(false);
      return;
    }
    if (startId && !endId && roomId !== startId) {
      setEndId(roomId);
      return;
    }
    setStartId(roomId);
    setEndId(null);
    setSteps([]);
    setCurrentStep(0);
    setSheetOpen(false);
  };

  // Compute route when both are chosen
  useEffect(() => {
    if (!startId || !endId) return;
    const routeSteps = calculateRoute(startId, endId, rooms as any, paths as any);
    if (!routeSteps.length) {
      Alert.alert('No route', 'No path between selected rooms on this floor.');
      setSteps([]);
      setCurrentStep(0);
      setSheetOpen(false);
      return;
    }
    const detailed = generateDetailedDirections(routeSteps);
    setSteps(detailed);
    setCurrentStep(0);
    setSheetOpen(true);

    // Start position at the first step
    if (detailed[0]?.coordinates) {
      setCurrentPos(detailed[0].coordinates);
    }
  }, [startId, endId, rooms, paths]);

  // Advance to next step (and update position)
  const handleAdvance = () => {
    if (!steps.length) return;
    if (currentStep >= steps.length - 1) {
      Alert.alert('Done', 'You have reached your destination.');
      return;
    }
    const next = currentStep + 1;
    setCurrentStep(next);
    const nextCoord = steps[next]?.coordinates;
    if (nextCoord) setCurrentPos(nextCoord);
  };

  // Polylines
  const remainingPolyline = useMemo(
    () => (steps.length ? steps.slice(currentStep).map((s) => s.coordinates) : []),
    [steps, currentStep],
  );
  const completedPolyline = useMemo(
    () =>
      steps.length && currentStep > 0
        ? steps.slice(0, currentStep + 1).map((s) => s.coordinates)
        : [],
    [steps, currentStep],
  );

  const prompt = !startId
    ? 'Tap a start room'
    : !endId
      ? 'Now tap a destination'
      : `${Math.max(0, steps.length - currentStep)} steps left`;

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SettingsHeader title={`Indoor Map — ${buildingName} (Floor ${floorId})`} />
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title={`Indoor Map — ${buildingName} (Floor ${floorId})`} />

      {/* Prompt banner */}
      <View
        style={[styles.promptBar, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Text style={{ color: colors.text, fontWeight: '600' }}>{prompt}</Text>
      </View>

      <IndoorSchematicMap
        rooms={rooms}
        startId={startId || undefined}
        endId={endId || undefined}
        routePolyline={remainingPolyline}
        completedPolyline={completedPolyline} // <- NEW
        onSelectRoom={onSelectRoom}
        themeColors={colors}
        currentPos={currentPos || undefined}
      />

      <StepsBottomSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onCancel={resetRoute} // <- NEW
        steps={steps}
        colors={colors}
        currentStep={currentStep}
        onAdvance={handleAdvance}
      />

      {/* Floating re-open button */}
      {!sheetOpen && steps.length > 0 && (
        <TouchableOpacity
          onPress={() => setSheetOpen(true)}
          style={[
            styles.fab,
            { backgroundColor: colors.primary, shadowColor: isDark ? '#000' : '#333' },
          ]}
        >
          <Text style={{ color: '#fff', fontWeight: '700' }}>Directions</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  promptBar: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 6,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 24,
    elevation: 5,
  },
});
