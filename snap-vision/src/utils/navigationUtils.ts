// src\utils\navigationUtils.ts

interface RoomPOI {
  id: string;
  name: string;
  buildingId: string;
  floorId: string;
  coordinates: { x: number; y: number };
  type: string;
  description: string | null;
}

interface PathPOI {
  id: string;
  buildingId: string;
  floorId: string;
  startRoomId: string;
  endRoomId: string;
  waypoints: { x: number; y: number }[];
  distance: number;
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
  distance: number;
}

export class NavigationGraph {
  private nodes: Map<string, GraphNode> = new Map();

  constructor(roomPOIs: RoomPOI[], pathPOIs: PathPOI[]) {
    this.buildGraph(roomPOIs, pathPOIs);
  }

  private buildGraph(roomPOIs: RoomPOI[], pathPOIs: PathPOI[]) {
    console.log('Building graph with:', {
      rooms: roomPOIs.length,
      paths: pathPOIs.length
    });

    // Create nodes for each room
    roomPOIs.forEach(room => {
      this.nodes.set(room.id, {
        roomId: room.id,
        coordinates: room.coordinates,
        connections: []
      });
      console.log('Added node for room:', room.id, room.name);
    });

    // Add edges based on paths
    pathPOIs.forEach(path => {
      console.log('Processing path:', {
        id: path.id,
        startRoomId: path.startRoomId,
        endRoomId: path.endRoomId,
        waypoints: path.waypoints.length
      });

      const startNode = this.nodes.get(path.startRoomId);
      const endNode = this.nodes.get(path.endRoomId);

      if (startNode && endNode) {
        // Add bidirectional connections
        startNode.connections.push({
          targetRoomId: path.endRoomId,
          pathId: path.id,
          waypoints: path.waypoints,
          distance: path.distance
        });

        endNode.connections.push({
          targetRoomId: path.startRoomId,
          pathId: path.id,
          waypoints: [...path.waypoints].reverse(), // Reverse waypoints for opposite direction
          distance: path.distance
        });

        console.log('Added bidirectional connection:', path.startRoomId, '<->', path.endRoomId);
      } else {
        console.warn('Missing nodes for path:', {
          pathId: path.id,
          startNode: !!startNode,
          endNode: !!endNode,
          startRoomId: path.startRoomId,
          endRoomId: path.endRoomId
        });
      }
    });

    console.log('Graph built. Total nodes:', this.nodes.size);
    this.nodes.forEach((node, id) => {
      console.log(`Node ${id} has ${node.connections.length} connections`);
    });
  }

  findShortestPath(startRoomId: string, endRoomId: string): string[] | null {
    console.log('Finding path from', startRoomId, 'to', endRoomId);

    if (!this.nodes.has(startRoomId)) {
      console.error('Start room not found in graph:', startRoomId);
      return null;
    }
    
    if (!this.nodes.has(endRoomId)) {
      console.error('End room not found in graph:', endRoomId);
      return null;
    }

    if (startRoomId === endRoomId) {
      return [startRoomId];
    }

    // Dijkstra's algorithm
    const distances: Map<string, number> = new Map();
    const previous: Map<string, string | null> = new Map();
    const unvisited: Set<string> = new Set();

    // Initialize
    this.nodes.forEach((_, roomId) => {
      const initialDistance = roomId === startRoomId ? 0 : Infinity;
      distances.set(roomId, initialDistance);
      previous.set(roomId, null);
      unvisited.add(roomId);
      console.log(`Initialized room ${roomId} with distance: ${initialDistance}`);
    });

    console.log('Initial state:', {
      startRoomExists: this.nodes.has(startRoomId),
      startDistance: distances.get(startRoomId),
      endDistance: distances.get(endRoomId),
      unvisitedCount: unvisited.size
    });

    while (unvisited.size > 0) {
      // Find unvisited node with minimum distance
      let currentRoom: string | null = null;
      let minDistance = Infinity;

      // FIXED: Use Array.from for proper iteration
      Array.from(unvisited).forEach(roomId => {
        const distance = distances.get(roomId);
        if (distance !== undefined && distance < minDistance) {
          minDistance = distance;
          currentRoom = roomId;
        }
      });

      console.log(`Selected current room: ${currentRoom} with distance: ${minDistance}`);

      if (!currentRoom || minDistance === Infinity) {
        console.warn('No path found - no reachable nodes');
        break;
      }

      unvisited.delete(currentRoom);

      // Process connections
      const currentNode = this.nodes.get(currentRoom);
      if (currentNode) {
        console.log(`Processing ${currentNode.connections.length} connections from ${currentRoom}`);
        
        currentNode.connections.forEach(edge => {
          console.log(`Checking connection to ${edge.targetRoomId}, is unvisited: ${unvisited.has(edge.targetRoomId)}`);
          
          if (unvisited.has(edge.targetRoomId)) {
            const currentDistance = distances.get(currentRoom!);
            const targetDistance = distances.get(edge.targetRoomId);
            
            if (currentDistance !== undefined && targetDistance !== undefined) {
              const altDistance = currentDistance + edge.distance;

              console.log(`Distance calculation: ${currentRoom} to ${edge.targetRoomId}`);
              console.log(`  Current: ${currentDistance}, Target: ${targetDistance}, Alt: ${altDistance}`);

              if (altDistance < targetDistance) {
                distances.set(edge.targetRoomId, altDistance);
                previous.set(edge.targetRoomId, currentRoom);
                console.log(`Updated distance to ${edge.targetRoomId}: ${altDistance}, previous: ${currentRoom}`);
              }
            }
          }
        });
      }

      // Check if we found the destination AFTER processing connections
      if (currentRoom === endRoomId) {
        console.log('Found path to destination');
        break;
      }
    }

    console.log('Final distances:', Array.from(distances.entries()));
    console.log('Final previous map:', Array.from(previous.entries()));

    // Reconstruct path
    const path: string[] = [];
    let currentRoom: string | null = endRoomId;

    console.log('Starting path reconstruction from:', endRoomId);

    while (currentRoom !== null) {
      console.log('Adding to path:', currentRoom);
      path.unshift(currentRoom);
      
      const prevRoom = previous.get(currentRoom);
      console.log(`Previous room for ${currentRoom}:`, prevRoom);
      
      currentRoom = prevRoom || null;
      
      // Safety check to prevent infinite loops
      if (path.length > this.nodes.size) {
        console.error('Path reconstruction loop detected');
        return null;
      }
    }

    console.log('Reconstructed path:', path);

    // Check if we found a valid path
    if (path.length >= 1 && path[0] === startRoomId && path[path.length - 1] === endRoomId) {
      console.log('Valid path found:', path);
      return path;
    } else {
      console.warn('Invalid path reconstructed:', {
        pathLength: path.length,
        firstRoom: path[0],
        lastRoom: path[path.length - 1],
        expectedStart: startRoomId,
        expectedEnd: endRoomId
      });
      return null;
    }
  }

  getPathDetails(roomPath: string[]): { waypoints: { x: number; y: number }[], totalDistance: number } {
    const allWaypoints: { x: number; y: number }[] = [];
    let totalDistance = 0;

    for (let i = 0; i < roomPath.length - 1; i++) {
      const currentRoomId = roomPath[i];
      const nextRoomId = roomPath[i + 1];
      
      const currentNode = this.nodes.get(currentRoomId);
      if (currentNode) {
        const connection = currentNode.connections.find(conn => conn.targetRoomId === nextRoomId);
        if (connection) {
          // Add all waypoints for this segment
          allWaypoints.push(...connection.waypoints);
          totalDistance += connection.distance;
        }
      }
    }

    return { waypoints: allWaypoints, totalDistance };
  }
}

// // Enhanced calculateRoute with proper turn-by-turn directions
// export const calculateRoute = (
//   startRoomId: string,
//   endRoomId: string,
//   roomPOIs: RoomPOI[],
//   pathPOIs: PathPOI[]
// ): NavigationStep[] => {
//   console.log('calculateRoute called with:', {
//     startRoomId,
//     endRoomId,
//     roomCount: roomPOIs.length,
//     pathCount: pathPOIs.length
//   });

//   const graph = new NavigationGraph(roomPOIs, pathPOIs);
//   const roomPath = graph.findShortestPath(startRoomId, endRoomId);

//   if (!roomPath) {
//     console.error('No route found between rooms');
//     return [];
//   }

//   console.log('Route found:', roomPath);

//   const steps: NavigationStep[] = [];
//   const { waypoints, totalDistance } = graph.getPathDetails(roomPath);

//   // Find room details
//   const startRoom = roomPOIs.find(r => r.id === startRoomId);
//   const endRoom = roomPOIs.find(r => r.id === endRoomId);

//   if (!startRoom || !endRoom) {
//     console.error('Could not find room details');
//     return [];
//   }

//   // Start step
//   steps.push({
//     instruction: `Begin navigation from ${startRoom.name}`,
//     coordinates: startRoom.coordinates,
//     type: 'start'
//   });

//   // Process waypoints to create meaningful turn-by-turn instructions
//   if (waypoints.length > 0) {
//     for (let i = 0; i < waypoints.length; i++) {
//       const currentPoint = waypoints[i];
//       const prevPoint = i > 0 ? waypoints[i - 1] : startRoom.coordinates;
//       const nextPoint = i < waypoints.length - 1 ? waypoints[i + 1] : endRoom.coordinates;

//       // Calculate distance from previous point
//       const distanceFromPrev = calculateDistance(prevPoint, currentPoint);
      
//       let instruction = '';
//       let stepType: 'waypoint' | 'turn' = 'waypoint';

//       if (i === 0) {
//         // First waypoint - initial direction
//         instruction = `Exit ${startRoom.name} and walk ${formatDistance(distanceFromPrev)} towards ${endRoom.name}`;
//       } else {
//         // Subsequent waypoints - check for turns
//         const turnDirection = calculateTurnDirection(prevPoint, currentPoint, nextPoint);
        
//         if (turnDirection === 'left') {
//           instruction = `Turn left and continue ${formatDistance(calculateDistance(currentPoint, nextPoint))}`;
//           stepType = 'turn';
//         } else if (turnDirection === 'right') {
//           instruction = `Turn right and continue ${formatDistance(calculateDistance(currentPoint, nextPoint))}`;
//           stepType = 'turn';
//         } else {
//           instruction = `Continue straight for ${formatDistance(calculateDistance(currentPoint, nextPoint))}`;
//         }
//       }

//       steps.push({
//         instruction,
//         coordinates: currentPoint,
//         type: stepType,
//         distance: distanceFromPrev
//       });
//     }
//   } else {
//     // Direct path with no waypoints
//     const directDistance = calculateDistance(startRoom.coordinates, endRoom.coordinates);
//     steps.push({
//       instruction: `Walk directly ${formatDistance(directDistance)} to ${endRoom.name}`,
//       coordinates: endRoom.coordinates,
//       type: 'waypoint',
//       distance: directDistance
//     });
//   }

//   // Final destination step
//   steps.push({
//     instruction: `You have arrived at ${endRoom.name}`,
//     coordinates: endRoom.coordinates,
//     type: 'destination',
//     distance: totalDistance
//   });

//   console.log('Generated steps:', steps.length);
//   return steps;
// };

// // Helper function to format distance for display
// function formatDistance(distance: number): string {
//   // Convert relative distance to approximate real-world distance
//   // This is a rough approximation - may need to adjust based on your floorplan scale
//   const approximateMeters = distance * 10; // Assuming 1 unit = 10 meters
  
//   if (approximateMeters < 1) {
//     return `${Math.round(approximateMeters * 100)} cm`;
//   } else if (approximateMeters < 10) {
//     return `${Math.round(approximateMeters * 10) / 10} m`;
//   } else {
//     return `${Math.round(approximateMeters)} m`;
//   }
// }

// Helper function to find the nearest room to a waypoint
function findNearestRoom(
  point: { x: number; y: number },
  roomPOIs: RoomPOI[],
  excludeRoomIds: string[]
): RoomPOI | null {
  let nearestRoom: RoomPOI | null = null;
  let minDistance = Infinity;

  roomPOIs.forEach(room => {
    if (!excludeRoomIds.includes(room.id)) {
      const distance = calculateDistance(point, room.coordinates);
      if (distance < minDistance && distance < 0.3) { // Only consider rooms within reasonable distance
        minDistance = distance;
        nearestRoom = room;
      }
    }
  });

  return nearestRoom;
}

// Helper function to calculate distance between two points
export const calculateDistance = (
  point1: { x: number; y: number },
  point2: { x: number; y: number }
): number => {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

// Generate detailed turn-by-turn directions
export const generateDetailedDirections = (steps: NavigationStep[]): NavigationStep[] => {
  if (steps.length === 0) {
    return [];
  }

  const detailedSteps: NavigationStep[] = [];
  
  steps.forEach((step, index) => {
    if (step.type === 'start') {
      detailedSteps.push({
        ...step,
        instruction: `🚶 ${step.instruction}`
      });
    } else if (step.type === 'destination') {
      detailedSteps.push({
        ...step,
        instruction: `🎯 ${step.instruction}`
      });
    } else if (step.type === 'turn') {
      detailedSteps.push({
        ...step,
        instruction: `🔄 ${step.instruction}`
      });
    } else {
      detailedSteps.push({
        ...step,
        instruction: `➡️ ${step.instruction}`
      });
    }
  });

  return detailedSteps;
};

// Helper function to calculate turn direction using cross product
function calculateTurnDirection(
  point1: { x: number; y: number },
  point2: { x: number; y: number },
  point3: { x: number; y: number }
): 'left' | 'right' | 'straight' {
  // Calculate vectors
  const vec1 = { x: point2.x - point1.x, y: point2.y - point1.y };
  const vec2 = { x: point3.x - point2.x, y: point3.y - point2.y };
  
  // Calculate cross product
  const cross = vec1.x * vec2.y - vec1.y * vec2.x;
  
  // Determine turn direction
  if (Math.abs(cross) < 0.01) return 'straight'; // Threshold for straight line
  return cross > 0 ? 'left' : 'right';
}

// Alternative calculateRoute with landmark references (for future use)
export const calculateRoute = (
  startRoomId: string,
  endRoomId: string,
  roomPOIs: RoomPOI[],
  pathPOIs: PathPOI[]
): NavigationStep[] => {
  console.log('calculateRouteWithLandmarks called with:', {
    startRoomId,
    endRoomId,
    roomCount: roomPOIs.length,
    pathCount: pathPOIs.length
  });

  const graph = new NavigationGraph(roomPOIs, pathPOIs);
  const roomPath = graph.findShortestPath(startRoomId, endRoomId);

  if (!roomPath) {
    console.error('No route found between rooms');
    return [];
  }

  console.log('Route found:', roomPath);

  const steps: NavigationStep[] = [];
  const { waypoints, totalDistance } = graph.getPathDetails(roomPath);

  // Find room details
  const startRoom = roomPOIs.find(r => r.id === startRoomId);
  const endRoom = roomPOIs.find(r => r.id === endRoomId);

  if (!startRoom || !endRoom) {
    console.error('Could not find room details');
    return [];
  }

  // Start step
  steps.push({
    instruction: `Begin navigation from ${startRoom.name}`,
    coordinates: startRoom.coordinates,
    type: 'start'
  });

  // Process waypoints with landmark references
  if (waypoints.length > 0) {
    for (let i = 0; i < waypoints.length; i++) {
      const currentPoint = waypoints[i];
      const prevPoint = i > 0 ? waypoints[i - 1] : startRoom.coordinates;
      const nextPoint = i < waypoints.length - 1 ? waypoints[i + 1] : endRoom.coordinates;

      // Find nearest room to current waypoint for landmark reference
      const nearestRoom = findNearestRoom(currentPoint, roomPOIs, [startRoomId, endRoomId]);
      
      let instruction = '';
      let stepType: 'waypoint' | 'turn' = 'waypoint';

      if (i === 0) {
        if (nearestRoom) {
          instruction = `Exit ${startRoom.name} and head towards ${nearestRoom.name}`;
        } else {
          instruction = `Exit ${startRoom.name} and head towards ${endRoom.name}`;
        }
      } else {
        const turnDirection = calculateTurnDirection(prevPoint, currentPoint, nextPoint);
        
        if (turnDirection === 'left') {
          instruction = nearestRoom 
            ? `Turn left near ${nearestRoom.name}`
            : `Turn left and continue`;
          stepType = 'turn';
        } else if (turnDirection === 'right') {
          instruction = nearestRoom 
            ? `Turn right near ${nearestRoom.name}`
            : `Turn right and continue`;
          stepType = 'turn';
        } else {
          instruction = nearestRoom 
            ? `Continue straight past ${nearestRoom.name}`
            : `Continue straight`;
        }
      }

      steps.push({
        instruction,
        coordinates: currentPoint,
        type: stepType
      });
    }
  }

  // Final approach
  steps.push({
    instruction: `You have arrived at ${endRoom.name}`,
    coordinates: endRoom.coordinates,
    type: 'destination',
    distance: totalDistance
  });

  console.log('Generated steps:', steps.length);
  return steps;
};

// AR Navigation utilities
export interface ARNavigationData {
  bearing: number;
  distance: number;
  nextWaypoint: { x: number; y: number } | null;
  isAtDestination: boolean;
}

// Calculate bearing from current position to target in your coordinate system
export const calculateARBearing = (
  currentPos: { x: number; y: number },
  targetPos: { x: number; y: number }
): number => {
  const dx = targetPos.x - currentPos.x;
  const dy = targetPos.y - currentPos.y;
  
  // Calculate angle in radians, then convert to degrees
  // Note: This assumes your coordinate system has Y increasing upward
  const angle = Math.atan2(dx, -dy) * (180 / Math.PI);
  
  // Normalize to 0-360 degrees
  return (angle + 360) % 360;
};

// Get the next waypoint for AR navigation
export const getNextARWaypoint = (
  currentPos: { x: number; y: number },
  navigationSteps: NavigationStep[],
  proximityThreshold: number = 0.1
): { x: number; y: number } | null => {
  if (!navigationSteps || navigationSteps.length === 0) {
    return null;
  }

  // Find the closest upcoming waypoint
  for (const step of navigationSteps) {
    const distance = calculateDistance(currentPos, step.coordinates);
    
    // If we're not close to this waypoint yet, it's our target
    if (distance > proximityThreshold) {
      return step.coordinates;
    }
  }

  // If we're close to all waypoints, target the last one (destination)
  return navigationSteps[navigationSteps.length - 1]?.coordinates || null;
};

// Calculate AR navigation data for current position
export const calculateARNavigationData = (
  currentPos: { x: number; y: number },
  navigationSteps: NavigationStep[],
  destinationPos: { x: number; y: number }
): ARNavigationData => {
  const nextWaypoint = getNextARWaypoint(currentPos, navigationSteps);
  const targetPos = nextWaypoint || destinationPos;
  
  const bearing = calculateARBearing(currentPos, targetPos);
  const distance = calculateDistance(currentPos, targetPos);
  const isAtDestination = distance < 0.05; // Very close to destination
  
  return {
    bearing,
    distance,
    nextWaypoint,
    isAtDestination
  };
};

// Convert relative coordinates to screen direction for AR
export const getARDirection = (
  currentPos: { x: number; y: number },
  targetPos: { x: number; y: number },
  deviceHeading: number
): number => {
  const bearing = calculateARBearing(currentPos, targetPos);
  
  // Calculate direction relative to device heading
  let arDirection = bearing - deviceHeading;
  
  // Normalize to -180 to 180 range for easier arrow positioning
  if (arDirection > 180) {
    arDirection -= 360;
  } else if (arDirection < -180) {
    arDirection += 360;
  }
  
  return arDirection;
};