import React, { useEffect, useMemo, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import firestore from '@react-native-firebase/firestore';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { getThemeColors } from '../theme';
import SettingsHeader from '../components/molecules/SettingsHeader';
import IndoorSchematicMap from '../components/organisms/IndoorSchematicMap';
import StepsBottomSheet from '../components/molecules/StepsBottomSheet';
import * as NavUtils from '../utils/navigationUtils';
import { Picker } from '@react-native-picker/picker';
import StandardPopup from '../components/atoms/StandardPopup';

type ParamList = {
  IndoorSchematicNav: {
    buildingId: string;
    buildingName: string;
    locationId: string;
    floorId: string; // initial floor to show
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
  const navigation = useNavigation<any>();
  const { buildingId, buildingName, locationId, floorId: initialFloorId, userPos } = route.params;

  const { isDark } = useTheme();
  const colors = getThemeColors(isDark);

  // Master data (ALL floors)
  const [allRooms, setAllRooms] = useState<RoomPOI[]>([]);
  const [allPaths, setAllPaths] = useState<PathPOI[]>([]);
  const [floors, setFloors] = useState<string[]>([]);
  const [selectedFloorId, setSelectedFloorId] = useState<string>(initialFloorId);

  // Screen state
  const [loading, setLoading] = useState(true);
  const [startId, setStartId] = useState<string | null>(null);
  const [endId, setEndId] = useState<string | null>(null);
  const [steps, setSteps] = useState<NavUtils.NavigationStep[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(userPos ?? null);

  // Popup state
  const [popupVisible, setPopupVisible] = useState(false);
const [popupTitle, setPopupTitle] = useState('');
const [popupMessage, setPopupMessage] = useState('');
const [popupConfirmText, setPopupConfirmText] = useState('OK');

  // Fetch ALL floors for this building
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        const roomSnap = await firestore()
          .collection('locations')
          .doc(locationId)
          .collection('roomPOIs')
          .where('buildingId', '==', buildingId)
          .get();
        const roomsData = roomSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as RoomPOI);

        const pathSnap = await firestore()
          .collection('locations')
          .doc(locationId)
          .collection('pathPOIs')
          .where('buildingId', '==', buildingId)
          .get();
        const pathsData = pathSnap.docs.map((d) => ({ id: d.id, ...d.data() }) as PathPOI);

        setAllRooms(roomsData);
        setAllPaths(pathsData);

        // Floors list
        const floorSet = Array.from(new Set(roomsData.map((r) => r.floorId))).sort();
        setFloors(floorSet);

        // Ensure selectedFloorId is valid
        if (!floorSet.includes(selectedFloorId)) {
          setSelectedFloorId(floorSet[0] || initialFloorId);
        }

        //Place user at entrance if nothing selected
        if (!userPos) {
          const initFloor = floorSet.includes(initialFloorId)
            ? initialFloorId
            : floorSet[0] || initialFloorId;
          const entrances = roomsData.filter(
            (r) => (r.isEntrance || r.type === 'entrance') && r.floorId === initFloor,
          );
          if (entrances.length) {
            setCurrentPos(entrances[0].coordinates);
          }
        }
      } catch (e) {
        console.error(e);
        setPopupTitle('Error');
setPopupMessage('Failed to load indoor data.');
setPopupConfirmText('OK');
setPopupVisible(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [buildingId, locationId]);

  const roomsOnSelectedFloor = useMemo(
    () => allRooms.filter((r) => r.floorId === selectedFloorId),
    [allRooms, selectedFloorId],
  );

  // DO NOT reset start/end when changing floors — multi-floor selection depends on this
  // (User can pick start on one floor, switch floor, pick destination)

  const resetRoute = () => {
    setStartId(null);
    setEndId(null);
    setSteps([]);
    setCurrentStep(0);
    setSheetOpen(false);
    // keep currentPos
  };

  const onSelectRoom = (roomId: string) => {
    // You can select on current floor; to select on another floor, switch floors and tap there
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
    // Reset from tapped
    setStartId(roomId);
    setEndId(null);
    setSteps([]);
    setCurrentStep(0);
    setSheetOpen(false);
  };

  // Compute route (multi-floor if available)
  useEffect(() => {
    if (!startId || !endId) return;

    // Prefer multi-floor function if present
    const hasMulti = typeof (NavUtils as any).calculateMultiFloorRoute === 'function';

    const routeSteps: NavUtils.NavigationStep[] = hasMulti
      ? (NavUtils as any).calculateMultiFloorRoute(
          startId,
          endId,
          allRooms as any,
          allPaths as any,
          {
            accessible: false,
          },
        )
      : NavUtils.calculateRoute(
          startId,
          endId,
          // single-floor fallback: try to route on whichever floors contain the nodes
          allRooms as any,
          allPaths as any,
        );

    if (!routeSteps || !routeSteps.length) {
      setPopupTitle('No route');
setPopupMessage('No path between the selected rooms in this building.');
setPopupConfirmText('OK');
setPopupVisible(true);
      setSteps([]);
      setCurrentStep(0);
      setSheetOpen(false);
      return;
    }

    const detailed = NavUtils.generateDetailedDirections(routeSteps);
    setSteps(detailed);
    setCurrentStep(0);
    setSheetOpen(true);

    const firstStep = detailed[0];
    if (firstStep?.coordinates) setCurrentPos(firstStep.coordinates);
    if ((firstStep as any)?.floorId) setSelectedFloorId(String((firstStep as any).floorId));
  }, [startId, endId, allRooms, allPaths]);

  const handleAdvance = () => {
    if (!steps.length) return;
    if (currentStep >= steps.length - 1) {
  setPopupTitle('Done');
setPopupMessage('You have reached your destination.');
setPopupConfirmText('OK');
setPopupVisible(true);
      return;
    }
    const next = currentStep + 1;
    setCurrentStep(next);
    const nextStep = steps[next];
    if (nextStep?.coordinates) setCurrentPos(nextStep.coordinates);
    const nextFloor = (nextStep as any)?.floorId;
    if (nextFloor && nextFloor !== selectedFloorId) setSelectedFloorId(String(nextFloor));
  };

  const remainingPolyline = useMemo(() => {
    if (!steps.length) return [];
    return steps
      .slice(currentStep)
      .filter((s) => ((s as any).floorId ? String((s as any).floorId) === selectedFloorId : true))
      .map((s) => s.coordinates);
  }, [steps, currentStep, selectedFloorId]);

  const completedPolyline = useMemo(() => {
    if (!steps.length || currentStep <= 0) return [];
    return steps
      .slice(0, currentStep + 1)
      .filter((s) => ((s as any).floorId ? String((s as any).floorId) === selectedFloorId : true))
      .map((s) => s.coordinates);
  }, [steps, currentStep, selectedFloorId]);

  const prompt = !startId
    ? 'Choose your start room'
    : !endId
      ? 'Choose your destination'
      : `${Math.max(0, steps.length - currentStep)} steps left`;

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <SettingsHeader title={`Indoor Map — ${buildingName}`} />
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SettingsHeader title={`Indoor Map — ${buildingName}`} />

      {/* Top bar: floor picker */}
      <View style={styles.topBar}>
        <Text style={{ color: colors.text, fontWeight: '700' }}></Text>
        <Picker
          selectedValue={selectedFloorId}
          onValueChange={(v) => setSelectedFloorId(String(v))}
          style={{ width: 160, color: colors.text }}
          dropdownIconColor={colors.text}
          mode="dropdown"
        >
          {floors.map((f) => (
            <Picker.Item key={f} label={`Floor ${f}`} value={f} color={colors.text} />
          ))}
        </Picker>
      </View>

      {/* Prompt banner */}
      <View
        style={[styles.promptBar, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Text style={{ color: colors.text, fontWeight: '600' }}>{prompt}</Text>
      </View>

      {/* Schematic map (only selected-floor rooms) */}
      <IndoorSchematicMap
        rooms={roomsOnSelectedFloor}
        startId={startId || undefined}
        endId={endId || undefined}
        routePolyline={remainingPolyline}
        completedPolyline={completedPolyline}
        onSelectRoom={onSelectRoom}
        themeColors={colors}
        currentPos={currentPos || undefined}
      />

      {/* Directions sheet */}
      <StepsBottomSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onCancel={resetRoute}
        steps={steps}
        colors={colors}
        currentStep={currentStep}
        onAdvance={handleAdvance}
      />

      {/* Floating Directions button */}
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

      {/* Floating AR button (launches AR for the *currently selected* floor) */}
      {steps.length > 0 && startId && endId && (
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('ARIndoorNav', {
              buildingId,
              buildingName,
              locationId,
              floorId: selectedFloorId,
              startRoomId: startId,
              endRoomId: endId,
              userPos: currentPos || null,
            })
          }
          style={[styles.fabAR, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={{ color: colors.text, fontWeight: '700' }}>AR</Text>
        </TouchableOpacity>
        
      )}
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },

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

  fabAR: {
    position: 'absolute',
    right: 16,
    bottom: 74, // stacked above the Directions FAB
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 24,
    borderWidth: 1,
    elevation: 4,
  },
});
