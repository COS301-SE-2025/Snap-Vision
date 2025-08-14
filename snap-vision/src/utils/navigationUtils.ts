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
  type: 'start' | 'waypoint' | 'turn' | 'destination' | 'connector';
  distance?: number;
  floorId?: string;
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
  floorId: string;
  connector?: {
    groupId: string;
    kind: 'stairs' | 'elevator';
    toFloorId: string;
  };
}

const NEAREST_ROOM_THRESHOLD = 0.3;

export const calculateInitialFacingDirection = (
  startPos: { x: number; y: number },
  firstWaypoint: { x: number; y: number }
): number => {
  const dx = firstWaypoint.x - startPos.x;
  const dy = firstWaypoint.y - startPos.y;
  // Calculate angle in degrees (0° = North/up, increases clockwise)
  return Math.atan2(dx, -dy) * (180 / Math.PI);
};

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
  userFacingDirection?: number
): 'left' | 'right' | 'straight' {
  // Vector from p1 to p2 (current direction)
  const v1 = { x: p2.x - p1.x, y: p2.y - p1.y };
  // Vector from p2 to p3 (new direction)
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
  
  if (userFacingDirection !== undefined) {
    // If we have user's facing direction, calculate relative to that
    const currentAngle = Math.atan2(v1.x, -v1.y) * (180 / Math.PI);
    const newAngle = Math.atan2(v2.x, -v2.y) * (180 / Math.PI);
    
    // Normalize angles relative to user's facing direction
    let relativeTurn = newAngle - currentAngle;
    if (relativeTurn > 180) relativeTurn -= 360;
    if (relativeTurn < -180) relativeTurn += 360;
    
    if (Math.abs(relativeTurn) < 15) return 'straight';
    return relativeTurn > 0 ? 'right' : 'left';
  }
  
  // Fallback to original cross product method
  const cross = v1.x * v2.y - v1.y * v2.x;
  if (Math.abs(cross) < 0.01) return 'straight';
  return cross > 0 ? 'left' : 'right';
}

//Landmark Helper

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

// ...existing code...
export const calculateMultiFloorRoute = (
  startRoomId: string,
  endRoomId: string,
  roomPOIs: RoomPOI[],
  pathPOIs: PathPOI[],
  opts?: { accessible?: boolean },
): NavigationStep[] => {
  const graph = new NavigationGraph(roomPOIs, pathPOIs);
  const roomPath = graph.findShortestPath(startRoomId, endRoomId);
  if (!roomPath) return [];

  const steps: NavigationStep[] = [];
  const startRoom = roomPOIs.find((r) => r.id === startRoomId)!;
  const endRoom = roomPOIs.find((r) => r.id === endRoomId)!;

  steps.push({
    instruction: `Begin navigation from ${startRoom.name}`,
    coordinates: startRoom.coordinates,
    type: 'start',
    floorId: startRoom.floorId,
  });

  let previousWaypoint: { x: number; y: number } = startRoom.coordinates;
  let previousDirection: number | undefined = undefined;
  let justExitedConnector = false;

  for (let i = 0; i < roomPath.length - 1; i++) {
    const current = roomPath[i];
    const next = roomPath[i + 1];
    const node = (graph as any).nodes.get(current) as GraphNode | undefined;
    const edge = node?.connections.find((c) => c.targetRoomId === next);
    if (!edge) continue;

    const prevRoom = roomPOIs.find((r) => r.id === current)!;
    const nextRoom = roomPOIs.find((r) => r.id === next)!;
    const waypoints = edge.waypoints.length ? edge.waypoints : [nextRoom.coordinates];

    if (edge.connector) {
      // Only generate instructions for waypoints BEFORE the connector
      if (waypoints.length > 0) {
        for (let idx = 0; idx < waypoints.length; idx++) {
          const pt = waypoints[idx];
          const nextPt = idx < waypoints.length - 1 ? waypoints[idx + 1] : edge.waypoints[0] || pt;

          if (previousDirection === undefined) {
            previousDirection = calculateInitialFacingDirection(previousWaypoint, pt);
          }

          const turnType = calculateTurnDirection(previousWaypoint, pt, nextPt, previousDirection);

          let instruction = '';
          let type: 'waypoint' | 'turn' = 'waypoint';

          if (turnType === 'left') {
            instruction = `Turn left towards ${nextRoom.name}`;
            type = 'turn';
          } else if (turnType === 'right') {
            instruction = `Turn right towards ${nextRoom.name}`;
            type = 'turn';
          } else {
            instruction = `Continue straight towards ${nextRoom.name}`;
          }

          steps.push({
            instruction,
            coordinates: pt,
            type,
            floorId: prevRoom.floorId,
            distance: calculateDistance(previousWaypoint, pt),
          });

          previousDirection = calculateInitialFacingDirection(previousWaypoint, pt);
          previousWaypoint = pt;
        }
      }

      // Connector step (stairs/elevator)
      steps.push({
        instruction: `Take ${edge.connector.kind === 'elevator' ? 'Elevator' : 'Stairs'} to Floor ${edge.connector.toFloorId}`,
        coordinates: edge.waypoints[0] || previousWaypoint,
        type: 'connector',
        floorId: edge.floorId,
        distance: edge.distance,
      });

      previousWaypoint = edge.waypoints[0] || previousWaypoint;
      // Reset facing direction after connector so next segment is always "straight"
      previousDirection = undefined;
      justExitedConnector = true;
    } else {
      for (let idx = 0; idx < waypoints.length; idx++) {
        const pt = waypoints[idx];
        const nextPt = idx < waypoints.length - 1 ? waypoints[idx + 1] : nextRoom.coordinates;

        // After connector, previousDirection is undefined, so first segment after stairs is always "straight"
        if (previousDirection === undefined) {
          previousDirection = calculateInitialFacingDirection(previousWaypoint, pt);
        }

        let turnType = calculateTurnDirection(previousWaypoint, pt, nextPt, previousDirection);

        let instruction = '';
        let type: 'waypoint' | 'turn' | 'destination' = 'waypoint';

        // Suppress turn instructions for the first waypoint after connector
        if (justExitedConnector) {
          instruction = `Continue straight towards ${nextRoom.name}`;
          type = 'waypoint';
          justExitedConnector = false;
        } else if (turnType === 'left') {
          instruction = `Turn left towards ${nextRoom.name}`;
          type = 'turn';
        } else if (turnType === 'right') {
          instruction = `Turn right towards ${nextRoom.name}`;
          type = 'turn';
        } else {
          instruction = `Continue straight towards ${nextRoom.name}`;
        }

        // If this is the last waypoint before the destination, make it explicit
        if (
          i === roomPath.length - 2 &&
          idx === waypoints.length - 1
        ) {
          instruction = `Arrive at ${endRoom.name}`;
          type = 'destination';
        }

        steps.push({
          instruction,
          coordinates: pt,
          type,
          floorId: prevRoom.floorId,
          distance: calculateDistance(previousWaypoint, pt),
        });

        previousDirection = calculateInitialFacingDirection(previousWaypoint, pt);
        previousWaypoint = pt;
      }
    }
  }

  // Only add a final destination step if not already added
  if (
    steps.length === 0 ||
    steps[steps.length - 1].type !== 'destination'
  ) {
    steps.push({
      instruction: `You have arrived at ${endRoom.name}`,
      coordinates: endRoom.coordinates,
      type: 'destination',
      floorId: endRoom.floorId,
    });
  }

  return steps;
};
// ...existing code...

//Graph

function addInterFloorEdges(
  nodes: Map<string, GraphNode>,
  roomPOIs: RoomPOI[],
  options: { accessible?: boolean },
) {
  const connectorsByGroup = new Map<string, RoomPOI[]>();
  roomPOIs.forEach((r) => {
    if (!r.type) return;
    if (r.type === 'stairs' || r.type === 'elevator') {
      const groupId = (r as any).connectorGroupId;
      if (!groupId) return;
      if (!connectorsByGroup.has(groupId)) connectorsByGroup.set(groupId, []);
      connectorsByGroup.get(groupId)!.push(r);
    }
  });

  const STAIRS_BASE = 20;
  const STAIRS_PER_FLOOR = 20;
  const ELEV_BASE = 5;
  const ELEV_PER_FLOOR = 5;

  connectorsByGroup.forEach((roomsInGroup, groupId) => {
    const sorted = roomsInGroup
      .slice()
      .sort(
        (a, b) =>
          (a.floorId as any) - (b.floorId as any) || ('' + a.floorId).localeCompare('' + b.floorId),
      );

    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];

      if (a.type === 'stairs' && options.accessible) {
        // Skip stairs in accessible mode
      } else {
        const aNode = nodes.get(a.id);
        const bNode = nodes.get(b.id);
        if (aNode && bNode) {
          const isElev = a.type === 'elevator' && b.type === 'elevator';
          const distance = isElev ? ELEV_BASE + ELEV_PER_FLOOR : STAIRS_BASE + STAIRS_PER_FLOOR;

          // A -> B
          aNode.connections.push({
            targetRoomId: b.id,
            pathId: `connector:${groupId}:${a.floorId}->${b.floorId}`,
            waypoints: [b.coordinates], // for a hop, simple straight
            distance,
            floorId: a.floorId, // edge “belongs” to the source floor for rendering
            connector: { groupId, kind: isElev ? 'elevator' : 'stairs', toFloorId: b.floorId },
          });
          // B -> A
          bNode.connections.push({
            targetRoomId: a.id,
            pathId: `connector:${groupId}:${b.floorId}->${a.floorId}`,
            waypoints: [a.coordinates],
            distance,
            floorId: b.floorId,
            connector: { groupId, kind: isElev ? 'elevator' : 'stairs', toFloorId: a.floorId },
          });
        }
      }
    }
  });
}

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

    // Create intra-floor edges (bidirectional)
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

      // Infer distance if missing
      let inferred = (path.distance ?? 0) > 0 ? path.distance! : 0;
      if (inferred <= 0) {
        if (path.waypoints && path.waypoints.length > 1) {
          inferred = polylineDistance(path.waypoints);
        } else {
          inferred = calculateDistance(startNode.coordinates, endNode.coordinates);
        }
      }
      const dist = Math.max(0.0001, inferred);

      // Use the path's floorId for both directions
      const edgeFloor = path.floorId;

      // Forward
      startNode.connections.push({
        targetRoomId: endId,
        pathId: path.id,
        waypoints: path.waypoints ?? [],
        distance: dist,
        floorId: edgeFloor,
      });

      // Reverse (reverse waypoints)
      endNode.connections.push({
        targetRoomId: startId,
        pathId: path.id,
        waypoints: (path.waypoints ?? []).slice().reverse(),
        distance: dist,
        floorId: edgeFloor,
      });
    }

    addInterFloorEdges(this.nodes, roomPOIs, { accessible: false });
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
        const nodeB = this.nodes.get(b);
        if (nodeB) all.push(nodeB.coordinates);
      }

      total += conn.distance;
    }

    return { waypoints: all, totalDistance: total };
  }
}

//Route Generation

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

  // Calculate initial facing direction
  let initialFacingDirection: number | undefined;
  if (waypoints.length > 0) {
    initialFacingDirection = calculateInitialFacingDirection(
      startRoom.coordinates,
      waypoints[0]
    );
  } else {
    initialFacingDirection = calculateInitialFacingDirection(
      startRoom.coordinates,
      endRoom.coordinates
    );
  }

  // Start
  steps.push({
    instruction: `Begin navigation from ${startRoom.name}. Face towards your first waypoint.`,
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
      
      // Pass initial facing direction for the first turn, then calculate relative turns
      const turn = calculateTurnDirection(prev, curr, next, i === 0 ? initialFacingDirection : undefined);

      let instruction = '';
      let type: 'waypoint' | 'turn' = 'waypoint';

      if (i === 0) {
        instruction = nearest
          ? `Start walking towards ${nearest.name}`
          : `Walk straight towards your destination`;
      } else {
        if (turn === 'left') {
          instruction = nearest ? `Turn left towards ${nearest.name}` : `Turn left and continue`;
          type = 'turn';
        } else if (turn === 'right') {
          instruction = nearest ? `Turn right towards ${nearest.name}` : `Turn right and continue`;
          type = 'turn';
        } else {
          instruction = nearest ? `Continue straight past ${nearest.name}` : `Continue straight`;
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
    const d = calculateDistance(startRoom.coordinates, endRoom.coordinates);
    steps.push({
      instruction: `Walk directly to ${endRoom.name}`,
      coordinates: endRoom.coordinates,
      type: 'waypoint',
      distance: d,
    });
  }

  steps.push({
    instruction: `You have arrived at ${endRoom.name}`,
    coordinates: endRoom.coordinates,
    type: 'destination',
    distance: totalDistance,
  });

  return steps;
};
//UI Stuff

export const generateDetailedDirections = (steps: NavigationStep[]): NavigationStep[] => {
  if (!steps.length) return [];
  
  // Calculate initial facing direction from start to first waypoint
  let initialFacingDirection: number | undefined;
  if (steps.length > 1) {
    initialFacingDirection = calculateInitialFacingDirection(
      steps[0].coordinates,
      steps[1].coordinates
    );
  }
  
  return steps.map((s, index) => {
    let prefix = '➡️ ';
    if (s.type === 'start') prefix = '🚶 ';
    else if (s.type === 'turn') {
      // Use more specific turn instructions based on facing direction
      if (s.instruction.includes('left')) {
        prefix = '↰ ';
      } else if (s.instruction.includes('right')) {
        prefix = '↱ ';
      } else {
        prefix = '🔄 ';
      }
    }
    else if (s.type === 'destination') prefix = '🎯 ';
    else if (s.type === 'connector') prefix = '🛗 ';
    
    return { ...s, instruction: `${prefix}${s.instruction}` };
  });
};

export function stepsToPolyline(steps: NavigationStep[]): { x: number; y: number }[] {
  return steps.map((s) => s.coordinates);
}

//AR Stuff

export interface ARNavigationData {
  bearing: number;
  distance: number;
  nextWaypoint: { x: number; y: number } | null;
  isAtDestination: boolean;
}

export const calculateARBearing = (
  currentPos: { x: number; y: number },
  targetPos: { x: number; y: number },
  _screenYDown: boolean = true, // kept for signature, but not needed
): number => {
  const dx = targetPos.x - currentPos.x;
  const dy = targetPos.y - currentPos.y;
  // Screen coordinates (Y down). 0° = up (negative Y), increases clockwise
  const angleDeg = Math.atan2(dx, -dy) * (180 / Math.PI);
  return (angleDeg + 360) % 360;
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
  deviceHeading: number,
  screenYDown: boolean = true,
): number => {
  const bearing = calculateARBearing(currentPos, targetPos, screenYDown);
  let rel = bearing - deviceHeading;
  if (rel > 180) rel -= 360;
  if (rel < -180) rel += 360;
  return rel;
};
