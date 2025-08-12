// src/components/organisms/IndoorSchematicMap.tsx
import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { G, Circle, Text as SvgText, Polyline, Path } from 'react-native-svg';
import SvgPanZoom from 'react-native-svg-pan-zoom';

type RoomPOI = {
  id: string;
  name: string;
  coordinates: { x: number; y: number }; // normalized 0..1
  type?: string;
  isEntrance?: boolean;
};

interface Props {
  rooms: RoomPOI[];
  startId?: string;
  endId?: string;
  routePolyline?: { x: number; y: number }[];
  completedPolyline?: { x: number; y: number }[]; // NEW
  currentPos?: { x: number; y: number };
  onSelectRoom: (roomId: string) => void;
  themeColors: any;
}

const CANVAS = 2000;

export default function IndoorSchematicMap({
  rooms,
  startId,
  endId,
  routePolyline = [],
  completedPolyline = [],
  currentPos,
  onSelectRoom,
  themeColors,
}: Props) {
  const roomMap = useMemo(() => new Map(rooms.map((r) => [r.id, r])), [rooms]);
  const routePoints = useMemo(
    () => routePolyline.map((pt) => [pt.x * CANVAS, pt.y * CANVAS] as [number, number]),
    [routePolyline],
  );

  const completedPoints = useMemo(
    () => completedPolyline.map((pt) => [pt.x * CANVAS, pt.y * CANVAS] as [number, number]),
    [completedPolyline],
  );

  return (
    <View style={styles.container}>
      <SvgPanZoom
        canvasWidth={CANVAS}
        canvasHeight={CANVAS}
        minScale={0.6}
        maxScale={3}
        initialZoom={1}
      >
        <Svg width={CANVAS} height={CANVAS} viewBox={`0 0 ${CANVAS} ${CANVAS}`}>
          <G>
            {completedPoints.length > 1 && (
              <Polyline
                points={completedPoints.map(([x, y]) => `${x},${y}`).join(' ')}
                stroke={themeColors.text}
                strokeWidth={5}
                opacity={0.5}
                fill="none"
              />
            )}

            {/* Remaining route (on top) */}
            {routePoints.length > 1 && (
              <Polyline
                points={routePoints.map(([x, y]) => `${x},${y}`).join(' ')}
                stroke={themeColors.primary}
                strokeWidth={6}
                fill="none"
              />
            )}

            {/* Current position (you are here) */}
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
                  {/* Entrance badge (small flag above the node) */}
                  {(r.isEntrance || r.type === 'entrance') && (
                    <Path
                      d={`M ${x - 6} ${y - 18} l 12 0 l 0 10 l -12 0 Z`}
                      fill={themeColors.warning || '#FFB300'}
                    />
                  )}

                  {/* Tappable node */}
                  <Circle
                    cx={x}
                    cy={y}
                    r={12}
                    stroke={themeColors.border}
                    strokeWidth={2}
                    fill={fill}
                    onPressIn={() => onSelectRoom(r.id)}
                  />

                  {/* Label */}
                  <SvgText x={x + 16} y={y + 4} fontSize={16} fill={themeColors.text}>
                    {r.name}
                  </SvgText>
                </G>
              );
            })}
          </G>
        </Svg>
      </SvgPanZoom>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
