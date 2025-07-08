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
      distances.set(roomId, roomId === startRoomId ? 0 : Infinity);
      previous.set(roomId, null);
      unvisited.add(roomId);
    });
  
    while (unvisited.size > 0) {
      // Find unvisited node with minimum distance
      let currentRoom: string | null = null;
      let minDistance = Infinity;
  
      unvisited.forEach(roomId => {
        const distance = distances.get(roomId) || Infinity;
        if (distance < minDistance) {
          minDistance = distance;
          currentRoom = roomId;
        }
      });
  
      if (!currentRoom || minDistance === Infinity) {
        console.warn('No path found - no reachable nodes');
        break; // No path exists
      }
  
      unvisited.delete(currentRoom);
  
      if (currentRoom === endRoomId) {
        console.log('Found path to destination');
        break; // Found shortest path to destination
      }
  
      // Check neighbors
      const currentNode = this.nodes.get(currentRoom);
      if (currentNode) {
        console.log(`Checking ${currentNode.connections.length} connections from ${currentRoom}`);
        
        currentNode.connections.forEach(edge => {
          if (unvisited.has(edge.targetRoomId)) {
            const altDistance = (distances.get(currentRoom!) || 0) + edge.distance;
            const currentDistance = distances.get(edge.targetRoomId) || Infinity;
  
            if (altDistance < currentDistance) {
              distances.set(edge.targetRoomId, altDistance);
              previous.set(edge.targetRoomId, currentRoom);
              console.log(`Updated distance to ${edge.targetRoomId}: ${altDistance}`);
            }
          }
        });
      }
    }
  
    // Reconstruct path
    const path: string[] = [];
    let currentRoom: string | null = endRoomId;
  
    while (currentRoom !== null) {
      path.unshift(currentRoom);
      currentRoom = previous.get(currentRoom) || null;
      
      // safety check to prevent infinite loops
      if (path.length > this.nodes.size) {
        console.error('Path reconstruction loop detected');
        return null;
      }
    }
  
    // Check if we actually found a valid path
    if (path.length > 0 && path[0] === startRoomId && path[path.length - 1] === endRoomId) {
      console.log('Final path:', path);
      return path;
    } else {
      console.warn('Invalid path reconstructed:', path);
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

export const calculateRoute = (
  startRoomId: string,
  endRoomId: string,
  roomPOIs: RoomPOI[],
  pathPOIs: PathPOI[]
): NavigationStep[] => {
  console.log('calculateRoute called with:', {
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
    instruction: `Start at ${startRoom.name}`,
    coordinates: startRoom.coordinates,
    type: 'start'
  });

  // Add waypoint steps
  waypoints.forEach((waypoint, index) => {
    steps.push({
      instruction: `Continue straight`,
      coordinates: waypoint,
      type: 'waypoint'
    });
  });

  // Destination step
  steps.push({
    instruction: `Arrive at ${endRoom.name}`,
    coordinates: endRoom.coordinates,
    type: 'destination',
    distance: totalDistance
  });

  console.log('Generated steps:', steps.length);
  return steps;
};

// Helper function to calculate distance between two points
export const calculateDistance = (
  point1: { x: number; y: number },
  point2: { x: number; y: number }
): number => {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

// Generate turn-by-turn directions with better instructions
// Add this function to navigationUtils.ts
export const generateDetailedDirections = (steps: NavigationStep[]): NavigationStep[] => {
  if (steps.length === 0) {
    return [];
  }

  // If we only have basic steps, enhance them with better instructions
  const detailedSteps: NavigationStep[] = [];
  
  steps.forEach((step, index) => {
    if (step.type === 'start') {
      detailedSteps.push({
        ...step,
        instruction: `Begin navigation from ${step.instruction.replace('Start at ', '')}`
      });
    } else if (step.type === 'destination') {
      detailedSteps.push({
        ...step,
        instruction: `You have arrived at your destination: ${step.instruction.replace('Arrive at ', '')}`
      });
    } else {
      // For waypoint steps, provide simple navigation instruction
      detailedSteps.push({
        ...step,
        instruction: `Continue following the path (Waypoint ${index})`
      });
    }
  });

  return detailedSteps;
};

// Helper function to calculate turn direction
function calculateTurnDirection(
  point1: { x: number; y: number },
  point2: { x: number; y: number },
  point3: { x: number; y: number }
): 'left' | 'right' | 'straight' {
  const cross = (point2.x - point1.x) * (point3.y - point1.y) - (point2.y - point1.y) * (point3.x - point1.x);
  
  if (Math.abs(cross) < 0.001) return 'straight';
  return cross > 0 ? 'left' : 'right';
}