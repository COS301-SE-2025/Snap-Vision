import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, PanResponder } from 'react-native';
import Svg, {
  G,
  Circle,
  Text as SvgText,
  Polyline,
  Path,
  Image as SvgImage,
  Rect,
} from 'react-native-svg';

type RoomPOI = {
  id: string;
  name: string;
  coordinates: { x: number; y: number };
  type?: string;
  isEntrance?: boolean;
};

interface Props {
  rooms: RoomPOI[];
  startId?: string;
  endId?: string;
  routePolyline?: { x: number; y: number }[];
  completedPolyline?: { x: number; y: number }[];
  currentPos?: { x: number; y: number };
  onSelectRoom: (roomId: string) => void;
  themeColors: any;
  floorplanUrl?: string;
}

const CANVAS = 1000;
const FLOORPLAN_CONTAINER_WIDTH = 360;
const FLOORPLAN_CONTAINER_HEIGHT = 300;

export default function IndoorSchematicMap({
  rooms,
  startId,
  endId,
  routePolyline = [],
  completedPolyline = [],
  currentPos,
  onSelectRoom,
  themeColors,
  floorplanUrl,
}: Props) {
  // Animated values for scale and pan
  const scale = useRef(new Animated.Value(1)).current;
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  // Track pinch distance for zoom
  const lastDistance = useRef<number | null>(null);

  // PanResponder for drag and pinch
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({ x: pan.x._value, y: pan.y._value });
      },
      onPanResponderMove: (evt, gestureState) => {
        if (evt.nativeEvent.touches && evt.nativeEvent.touches.length === 2) {
          // Pinch zoom
          const touch1 = evt.nativeEvent.touches[0];
          const touch2 = evt.nativeEvent.touches[1];
          const dx = touch1.pageX - touch2.pageX;
          const dy = touch1.pageY - touch2.pageY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (lastDistance.current === null) {
            lastDistance.current = distance;
          } else {
            const scaleChange = distance / lastDistance.current;
            const newScale = Math.max(0.5, Math.min(5, scale._value * scaleChange));
            scale.setValue(newScale);
            lastDistance.current = distance;
          }
        } else if (evt.nativeEvent.touches && evt.nativeEvent.touches.length === 1) {
          // Pan
          Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false })(evt, gestureState);
        }
      },
      onPanResponderRelease: () => {
        pan.flattenOffset();
        lastDistance.current = null;
      },
    })
  ).current;

  useEffect(() => {
    scale.setValue(1);
    pan.setValue({ x: 0, y: 0 });
  }, [floorplanUrl]);

  const routePoints = routePolyline.map((pt) => [pt.x * CANVAS, pt.y * CANVAS] as [number, number]);
  const donePoints = completedPolyline.map((pt) => [pt.x * CANVAS, pt.y * CANVAS] as [number, number]);

  return (
    <View style={styles.fixedContainer}>
      <Animated.View
        style={{
          width: FLOORPLAN_CONTAINER_WIDTH,
          height: FLOORPLAN_CONTAINER_HEIGHT,
          transform: [
            { scale: scale },
            { translateX: pan.x },
            { translateY: pan.y },
          ],
        }}
        {...panResponder.panHandlers}
      >
        <Svg
          width={FLOORPLAN_CONTAINER_WIDTH}
          height={FLOORPLAN_CONTAINER_HEIGHT}
          viewBox={`0 0 ${CANVAS} ${CANVAS}`}
        >
          <Rect x={0} y={0} width={CANVAS} height={CANVAS} fill="transparent" />

          {/* Background floorplan image */}
          {floorplanUrl ? (
            <SvgImage
              x={0}
              y={0}
              width={CANVAS}
              height={CANVAS}
              preserveAspectRatio="xMidYMid meet"
              href={{ uri: floorplanUrl }}
              opacity={1}
            />
          ) : null}

          {/* Completed segment (behind remaining) */}
          {donePoints.length > 1 && (
            <Polyline
              points={donePoints.map(([x, y]) => `${x},${y}`).join(' ')}
              stroke={themeColors.text}
              strokeWidth={8}
              opacity={0.85}
              fill="none"
            />
          )}

          {/* Remaining route */}
          {routePoints.length > 1 && (
            <Polyline
              points={routePoints.map(([x, y]) => `${x},${y}`).join(' ')}
              stroke={themeColors.primary}
              strokeWidth={6}
              fill="none"
            />
          )}

          {/* Current position */}
          {currentPos && (
            <G>
              <Circle
                cx={currentPos.x * CANVAS}
                cy={currentPos.y * CANVAS}
                r={10}
                fill={themeColors.primary}
                opacity={0.25}
              />
              <Circle
                cx={currentPos.x * CANVAS}
                cy={currentPos.y * CANVAS}
                r={5}
                fill={themeColors.primary}
              />
            </G>
          )}

          {/* Rooms */}
          {rooms.map((r) => {
            const x = r.coordinates.x * CANVAS;
            const y = r.coordinates.y * CANVAS;
            const isStart = r.id === startId;
            const isEnd = r.id === endId;
            const fill = isStart
              ? themeColors.success || '#4CAF50'
              : isEnd
                ? themeColors.primary
                : themeColors.card;

            return (
              <G key={r.id}>
                {(r.isEntrance || r.type === 'entrance') && (
                  <Path
                    d={`M ${x - 6} ${y - 18} l 12 0 l 0 10 l -12 0 Z`}
                    fill={themeColors.warning || '#FFB300'}
                  />
                )}

                <Circle
                  cx={x}
                  cy={y}
                  r={12}
                  stroke={themeColors.border}
                  strokeWidth={2}
                  fill={fill}
                  onPressIn={() => onSelectRoom(r.id)}
                />

                <SvgText x={x + 16} y={y + 4} fontSize={16} fill={themeColors.secondary}>
                  {r.name}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fixedContainer: {
    width: FLOORPLAN_CONTAINER_WIDTH,
    height: FLOORPLAN_CONTAINER_HEIGHT,
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 2,
    marginVertical: 16,
  },
});