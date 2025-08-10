// src/utils/navigationUtils.ts

/********************
 * Types & Interfaces
 ********************/

export interface RoomPOI {
  id: string;
  name: string;
  buildingId: string;
  floorId: string;
  coordinates: { x: number; y: number };
  type: string;
  description: string | null;
}

export interface PathPOI {
  id: string;
  buildingId: string;
  floorId: string;
  // Support both field namings (old/new)
  startRoomId?: string;
  endRoomId?: string;
  fromRoomId?: string;
  toRoomId?: string;
  waypoints: { x: number; y: number }[];
  distance?: number; // may be missing -> we will infer
}

export interface NavigationStep {
  instruction: string;
  coordinates: { x: number; y: number };
  type: 'start' | 'waypoint' | 'turn' | 'destination';
  distance?: number;
}

interface GraphNode {
  roomId: string;
  coordinates: { x: number; y: number };
  connections: GraphEdge[];
}

interface GraphEdge {
  targetRoomId: string;
  pathId: string;
  waypoints: { x: number; y: number }[];
  distance: number; // always > 0 (we infer if not provided)
}

/********************
 * Constants
 ********************/

const NEAREST_ROOM_THRESHOLD = 0.3; // relative units; tune per-building if needed

/********************
 * Math Helpers
 ********************/

export const calculateDistance = (
  a: { x: number; y: number },
  b: { x: number; y: number },
): number => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
};

function polylineDistance(points: { x: number; y: number }[]): number {
  if (!points || points.length < 2) return 0;
  let d = 0;
  for (let i = 0; i < points.length - 1; i++) {
    d += calculateDistance(points[i], points[i + 1]);
  }
  return d;
}

function calculateTurnDirection(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
): 'left' | 'right' | 'straight' {
  const v1 = { x: p2.x - p1.x, y: p2.y - p1.y };
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
  const cross = v1.x * v2.y - v1.y * v2.x;
  if (Math.abs(cross) < 0.01) return 'straight';
  return cross > 0 ? 'left' : 'right';
}

/********************
 * Landmark Helper
 ********************/

function findNearestRoom(
  point: { x: number; y: number },
  roomPOIs: RoomPOI[],
  excludeRoomIds: string[],
): RoomPOI | null {
  let nearest: RoomPOI | null = null;
  let minD = Infinity;
  for (const r of roomPOIs) {
    if (excludeRoomIds.includes(r.id)) continue;
    const d = calculateDistance(point, r.coordinates);
    if (d < minD && d < NEAREST_ROOM_THRESHOLD) {
      minD = d;
      nearest = r;
    }
  }
  return nearest;
}

/********************
 * Graph
 ********************/

export class NavigationGraph {
  private nodes: Map<string, GraphNode> = new Map();

  constructor(roomPOIs: RoomPOI[], pathPOIs: PathPOI[]) {
    this.buildGraph(roomPOIs, pathPOIs);
  }

  private buildGraph(roomPOIs: RoomPOI[], pathPOIs: PathPOI[]) {
    // Create nodes
    for (const room of roomPOIs) {
      this.nodes.set(room.id, {
        roomId: room.id,
        coordinates: room.coordinates,
        connections: [],
      });
    }

    // Create edges (bidirectional)
    for (const path of pathPOIs) {
      const startId = path.startRoomId ?? path.fromRoomId;
      const endId = path.endRoomId ?? path.toRoomId;

      if (!startId || !endId) {
        console.warn('Path missing endpoints:', path.id, { startId, endId });
        continue;
      }

      const startNode = this.nodes.get(startId);
      const endNode = this.nodes.get(endId);
      if (!startNode || !endNode) {
        console.warn('Path endpoints not found in graph:', path.id, {
          startExists: !!startNode,
          endExists: !!endNode,
        });
        continue;
      }

      // Infer distance if missing or non-positive.
      let inferred = (path.distance ?? 0) > 0 ? path.distance! : 0;
      if (inferred <= 0) {
        if (path.waypoints && path.waypoints.length > 1) {
          inferred = polylineDistance(path.waypoints);
        } else {
          // fallback: straight line between rooms
          inferred = calculateDistance(startNode.coordinates, endNode.coordinates);
        }
      }

      // Forward
      startNode.connections.push({
        targetRoomId: endId,
        pathId: path.id,
        waypoints: path.waypoints ?? [],
        distance: Math.max(0.0001, inferred),
      });

      // Reverse (reverse waypoints order)
      endNode.connections.push({
        targetRoomId: startId,
        pathId: path.id,
        waypoints: (path.waypoints ?? []).slice().reverse(),
        distance: Math.max(0.0001, inferred),
      });
    }
  }

  findShortestPath(startRoomId: string, endRoomId: string): string[] | null {
    if (!this.nodes.has(startRoomId) || !this.nodes.has(endRoomId)) return null;
    if (startRoomId === endRoomId) return [startRoomId];

    const dist = new Map<string, number>();
    const prev = new Map<string, string | null>();
    const unvisited = new Set<string>();

    // init
    for (const id of this.nodes.keys()) {
      dist.set(id, id === startRoomId ? 0 : Infinity);
      prev.set(id, null);
      unvisited.add(id);
    }

    while (unvisited.size) {
      // pull min
      let current: string | null = null;
      let best = Infinity;
      for (const id of unvisited) {
        const d = dist.get(id)!;
        if (d < best) {
          best = d;
          current = id;
        }
      }
      if (!current || best === Infinity) break;
      unvisited.delete(current);

      if (current === endRoomId) break;

      const node = this.nodes.get(current)!;
      for (const edge of node.connections) {
        if (!unvisited.has(edge.targetRoomId)) continue;
        const alt = dist.get(current)! + edge.distance;
        if (alt < dist.get(edge.targetRoomId)!) {
          dist.set(edge.targetRoomId, alt);
          prev.set(edge.targetRoomId, current);
        }
      }
    }

    // reconstruct
    const path: string[] = [];
    let cur: string | null = endRoomId;
    while (cur) {
      path.unshift(cur);
      cur = prev.get(cur) ?? null;
      if (path.length > this.nodes.size + 2) return null; // safety
    }
    if (path[0] !== startRoomId || path[path.length - 1] !== endRoomId) return null;
    return path;
  }

  getPathDetails(roomPath: string[]): {
    waypoints: { x: number; y: number }[];
    totalDistance: number;
  } {
    const all: { x: number; y: number }[] = [];
    let total = 0;

    for (let i = 0; i < roomPath.length - 1; i++) {
      const a = roomPath[i];
      const b = roomPath[i + 1];

      const nodeA = this.nodes.get(a);
      if (!nodeA) continue;

      const conn = nodeA.connections.find((c) => c.targetRoomId === b);
      if (!conn) continue;

      if (conn.waypoints.length > 0) {
        all.push(...conn.waypoints);
      } else {
        // ensure we still give AR a target when there are no internal waypoints
        const nodeB = this.nodes.get(b);
        if (nodeB) all.push(nodeB.coordinates);
      }

      total += conn.distance;
    }

    return { waypoints: all, totalDistance: total };
  }
}

/********************
 * Route Generation
 ********************/

export const calculateRoute = (
  startRoomId: string,
  endRoomId: string,
  roomPOIs: RoomPOI[],
  pathPOIs: PathPOI[],
): NavigationStep[] => {
  const graph = new NavigationGraph(roomPOIs, pathPOIs);
  const roomPath = graph.findShortestPath(startRoomId, endRoomId);
  if (!roomPath) return [];

  const steps: NavigationStep[] = [];
  const { waypoints, totalDistance } = graph.getPathDetails(roomPath);

  const startRoom = roomPOIs.find((r) => r.id === startRoomId);
  const endRoom = roomPOIs.find((r) => r.id === endRoomId);
  if (!startRoom || !endRoom) return [];

  // Start
  steps.push({
    instruction: `Begin navigation from ${startRoom.name}`,
    coordinates: startRoom.coordinates,
    type: 'start',
  });

  // Waypoints with turn detection & landmarks
  if (waypoints.length > 0) {
    for (let i = 0; i < waypoints.length; i++) {
      const curr = waypoints[i];
      const prev = i > 0 ? waypoints[i - 1] : startRoom.coordinates;
      const next = i < waypoints.length - 1 ? waypoints[i + 1] : endRoom.coordinates;

      const nearest = findNearestRoom(curr, roomPOIs, [startRoomId, endRoomId]);
      const turn = calculateTurnDirection(prev, curr, next);

      let instruction = '';
      let type: 'waypoint' | 'turn' = 'waypoint';

      if (i === 0) {
        instruction = nearest
          ? `Exit ${startRoom.name} and head towards ${nearest.name}`
          : `Exit ${startRoom.name} and head towards ${endRoom.name}`;
      } else {
        if (turn === 'left') {
          instruction = nearest ? `Turn left near ${nearest.name}` : `Turn left and continue`;
          type = 'turn';
        } else if (turn === 'right') {
          instruction = nearest ? `Turn right near ${nearest.name}` : `Turn right and continue`;
          type = 'turn';
        } else {
          instruction = nearest
            ? `Continue straight past ${nearest.name}`
            : `Continue straight`;
        }
      }

      steps.push({
        instruction,
        coordinates: curr,
        type,
        distance: calculateDistance(prev, curr),
      });
    }
  } else {
    // No waypoints → direct segment
    const d = calculateDistance(startRoom.coordinates, endRoom.coordinates);
    steps.push({
      instruction: `Walk directly to ${endRoom.name}`,
      coordinates: endRoom.coordinates,
      type: 'waypoint',
      distance: d,
    });
  }

  // Destination
  steps.push({
    instruction: `You have arrived at ${endRoom.name}`,
    coordinates: endRoom.coordinates,
    type: 'destination',
    distance: totalDistance,
  });

  return steps;
};

/********************
 * UI Helpers
 ********************/

export const generateDetailedDirections = (steps: NavigationStep[]): NavigationStep[] => {
  if (!steps.length) return [];
  return steps.map((s) => {
    let prefix = '➡️ ';
    if (s.type === 'start') prefix = '🚶 ';
    else if (s.type === 'turn') prefix = '🔄 ';
    else if (s.type === 'destination') prefix = '🎯 ';
    return { ...s, instruction: `${prefix}${s.instruction}` };
  });
};

export function stepsToPolyline(steps: NavigationStep[]): { x: number; y: number }[] {
  return steps.map((s) => s.coordinates);
}

/********************
 * AR Utilities
 ********************/

export interface ARNavigationData {
  bearing: number; // degrees, 0-360
  distance: number; // same units as map coords
  nextWaypoint: { x: number; y: number } | null;
  isAtDestination: boolean;
}

/**
 * Calculate bearing from current -> target.
 * Set screenYDown=true if your floorplan uses screen coords (0,0 top-left, Y grows downward).
 * Otherwise, assume math coords (Y up).
 */
export const calculateARBearing = (
  currentPos: { x: number; y: number },
  targetPos: { x: number; y: number },
  screenYDown: boolean = true,
): number => {
  const dx = targetPos.x - currentPos.x;
  const dy = targetPos.y - currentPos.y;

  let angleDeg: number;

  if (screenYDown) {
    // On screen coords, atan2 returns 0° pointing "down". Convert to a north-up 0°.
    // atan2 returns angle in radians between the positive X-axis and the point (x, y)
    // Here we want 0° = up, increasing clockwise; adjust empirically if needed.
    angleDeg = Math.atan2(dx, dy) * (180 / Math.PI); // 0° ~ down
    angleDeg = (angleDeg + 180) % 360; // shift so 0° ~ up/north-ish
  } else {
    // Math-style coords: 0° along +X; convert so 0° ~ up
    angleDeg = Math.atan2(dx, -dy) * (180 / Math.PI);
    angleDeg = (angleDeg + 360) % 360;
  }

  return angleDeg;
};

export const getNextARWaypoint = (
  currentPos: { x: number; y: number },
  navigationSteps: NavigationStep[],
  proximityThreshold: number = 0.1,
): { x: number; y: number } | null => {
  if (!navigationSteps || !navigationSteps.length) return null;

  for (const step of navigationSteps) {
    const d = calculateDistance(currentPos, step.coordinates);
    if (d > proximityThreshold) return step.coordinates;
  }
  // Already close to all → target destination
  return navigationSteps[navigationSteps.length - 1]?.coordinates ?? null;
};

export const calculateARNavigationData = (
  currentPos: { x: number; y: number },
  navigationSteps: NavigationStep[],
  destinationPos: { x: number; y: number },
): ARNavigationData => {
  const nextWaypoint = getNextARWaypoint(currentPos, navigationSteps);
  const target = nextWaypoint ?? destinationPos;

  const bearing = calculateARBearing(currentPos, target, true);
  const distance = calculateDistance(currentPos, target);
  const isAtDestination = distance < 0.05;

  return { bearing, distance, nextWaypoint, isAtDestination };
};

export const getARDirection = (
  currentPos: { x: number; y: number },
  targetPos: { x: number; y: number },
  deviceHeading: number, // 0-360°, from magnetometer
  screenYDown: boolean = true,
): number => {
  const bearing = calculateARBearing(currentPos, targetPos, screenYDown);
  let rel = bearing - deviceHeading;
  if (rel > 180) rel -= 360;
  if (rel < -180) rel += 360;
  return rel; // -180..180 → left/right offset for arrow
};
