import React, { useMemo, useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, {
  G,
  Circle,
  Text as SvgText,
  Polyline,
  Path,
  Image as SvgImage,
  Rect,
} from 'react-native-svg';
import SvgPanZoom from 'react-native-svg-pan-zoom';

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
  const [initialZoom, setInitialZoom] = useState(1);

  useEffect(() => {
    const { width, height } = Dimensions.get('window');
    const zoom = Math.min(width, height) / CANVAS;
    setInitialZoom(zoom);
  }, []);

  const routePoints = useMemo(
    () => routePolyline.map((pt) => [pt.x * CANVAS, pt.y * CANVAS] as [number, number]),
    [routePolyline],
  );

  const donePoints = useMemo(
    () => completedPolyline.map((pt) => [pt.x * CANVAS, pt.y * CANVAS] as [number, number]),
    [completedPolyline],
  );

  return (
    <View style={styles.container}>
      <SvgPanZoom
        style={styles.panZoom}
        canvasWidth={CANVAS}
        canvasHeight={CANVAS}
        minScale={initialZoom}
        maxScale={5}
        initialZoom={initialZoom}
        panEnabled={false}
        pinchEnabled={true}
        doubleTapEnabled={true}
        center={{ x: CANVAS / 2, y: CANVAS / 2 }}
      >
        <Svg width={CANVAS} height={CANVAS} viewBox={`0 0 ${CANVAS} ${CANVAS}`}>
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
      </SvgPanZoom>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  panZoom: { flex: 1 },
});
