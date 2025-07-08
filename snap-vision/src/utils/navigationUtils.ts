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

    // Update the findShortestPath method in navigationUtils.ts
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
  
    // Initialize - FIXED: Ensure proper initialization
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
      // Find unvisited node with minimum distance - FIXED: Better selection logic
      let currentRoom: string | null = null;
      let minDistance = Infinity;
  
      for (const roomId of unvisited) {
        const distance = distances.get(roomId);
        if (distance !== undefined && distance < minDistance) {
          minDistance = distance;
          currentRoom = roomId;
        }
      }
  
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