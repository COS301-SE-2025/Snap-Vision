export interface Waypoint {
  x: number;
  y: number;
}

/**
 * Generates SVG path string from waypoints
 */
export const generatePathSVG = (waypoints: Waypoint[]): string => {
  if (waypoints.length < 2) return '';

  let pathString = `M ${waypoints[0].x * 100} ${waypoints[0].y * 100}`;
  for (let i = 1; i < waypoints.length; i++) {
    pathString += ` L ${waypoints[i].x * 100} ${waypoints[i].y * 100}`;
  }
  return pathString;
};

/**
 * Calculates total distance between waypoints
 */
export const calculatePathDistance = (waypoints: Waypoint[]): number => {
  let totalDistance = 0;
  for (let i = 1; i < waypoints.length; i++) {
    const dx = waypoints[i].x - waypoints[i - 1].x;
    const dy = waypoints[i].y - waypoints[i - 1].y;
    totalDistance += Math.sqrt(dx * dx + dy * dy);
  }
  return totalDistance;
};

/**
 * Generates unique room ID
 */
export const generateRoomId = (buildingId: string, floorLabel: string): string => {
  return `room_${buildingId.replace(/\//g, '_')}_${floorLabel.replace(/\s/g, '_')}_${Date.now()}`;
};

/**
 * Generates unique path ID
 */
export const generatePathId = (buildingId: string, floorLabel: string): string => {
  return `path_${buildingId.replace(/\//g, '_')}_${floorLabel.replace(/\s/g, '_')}_${Date.now()}`;
};
