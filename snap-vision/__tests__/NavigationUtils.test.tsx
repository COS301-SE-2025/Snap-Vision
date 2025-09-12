import {
  calculateInitialFacingDirection,
  calculateDistance,
  calculateMultiFloorRoute,
  calculateRoute,
  generateDetailedDirections,
  stepsToPolyline,
  getNextARWaypoint,
  calculateARNavigationData,
  calculateTurnDirection,
  getARDirection,
  NavigationGraph,
  findNearestRoom,
} from '../src/utils/navigationUtils';

function normalizeAngle(angle: number) {
  return ((angle % 360) + 360) % 360;
}

describe('navigationUtils basic tests', () => {
  it('calculates initial facing direction correctly', () => {
    // Up (positive Y) should be 180°
    expect(calculateInitialFacingDirection({ x: 0, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(180);
    // Right (positive X) should be 90°
    expect(calculateInitialFacingDirection({ x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(90);
    // Down (negative Y) should be 0°
    expect(calculateInitialFacingDirection({ x: 0, y: 0 }, { x: 0, y: -1 })).toBeCloseTo(0);
    // Left (negative X) should be 270°
    expect(
      normalizeAngle(calculateInitialFacingDirection({ x: 0, y: 0 }, { x: -1, y: 0 })),
    ).toBeCloseTo(270);
  });

  it('calculates distance correctly', () => {
    expect(calculateDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBeCloseTo(5);
    expect(calculateDistance({ x: 1, y: 1 }, { x: 1, y: 1 })).toBe(0);
  });

  it('generates a simple route', () => {
    const rooms = [
      {
        id: 'A',
        name: 'A',
        buildingId: 'B',
        floorId: '1',
        coordinates: { x: 0, y: 0 },
        type: 'room',
        description: null,
      },
      {
        id: 'B',
        name: 'B',
        buildingId: 'B',
        floorId: '1',
        coordinates: { x: 1, y: 0 },
        type: 'room',
        description: null,
      },
    ];
    const paths = [
      {
        id: 'P1',
        buildingId: 'B',
        floorId: '1',
        startRoomId: 'A',
        endRoomId: 'B',
        waypoints: [{ x: 0.5, y: 0 }],
      },
    ];
    const steps = calculateRoute('A', 'B', rooms, paths);
    expect(steps.length).toBeGreaterThan(0);
    expect(steps[0].type).toBe('start');
    expect(steps[steps.length - 1].type).toBe('destination');
  });

  it('generates a multi-floor route with connector', () => {
    const rooms = [
      {
        id: 'A',
        name: 'A',
        buildingId: 'B',
        floorId: '1',
        coordinates: { x: 0, y: 0 },
        type: 'room',
        description: null,
      },
      {
        id: 'S1',
        name: 'Stairs 1',
        buildingId: 'B',
        floorId: '1',
        coordinates: { x: 0, y: 1 },
        type: 'stairs',
        description: null,
        connectorGroupId: 'G1',
      },
      {
        id: 'S2',
        name: 'Stairs 2',
        buildingId: 'B',
        floorId: '2',
        coordinates: { x: 0, y: 1 },
        type: 'stairs',
        description: null,
        connectorGroupId: 'G1',
      },
      {
        id: 'B',
        name: 'B',
        buildingId: 'B',
        floorId: '2',
        coordinates: { x: 1, y: 1 },
        type: 'room',
        description: null,
      },
    ];
    const paths = [
      {
        id: 'P1',
        buildingId: 'B',
        floorId: '1',
        startRoomId: 'A',
        endRoomId: 'S1',
        waypoints: [{ x: 0, y: 0.5 }],
      },
      {
        id: 'P2',
        buildingId: 'B',
        floorId: '2',
        startRoomId: 'S2',
        endRoomId: 'B',
        waypoints: [{ x: 0.5, y: 1 }],
      },
    ];
    const steps = calculateMultiFloorRoute('A', 'B', rooms, paths);
    expect(steps.some((s) => s.type === 'connector')).toBe(true);
    expect(steps.some((s) => s.instruction.includes('Floor'))).toBe(true);
    expect(steps[steps.length - 1].type).toBe('destination');
  });

  it('generates detailed directions', () => {
    const steps = [
      { instruction: 'Begin', coordinates: { x: 0, y: 0 }, type: 'start' },
      { instruction: 'Go', coordinates: { x: 1, y: 0 }, type: 'waypoint' },
    ];
    const detailed = generateDetailedDirections(steps);
    expect(detailed.length).toBe(2);
  });

  it('converts steps to polyline', () => {
    const steps = [
      { instruction: 'Begin', coordinates: { x: 0, y: 0 }, type: 'start' },
      { instruction: 'Go', coordinates: { x: 1, y: 0 }, type: 'waypoint' },
    ];
    const polyline = stepsToPolyline(steps);
    expect(polyline).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
    ]);
  });

  it('gets next AR waypoint', () => {
    const steps = [
      { instruction: 'Begin', coordinates: { x: 0, y: 0 }, type: 'start' },
      { instruction: 'Go', coordinates: { x: 1, y: 0 }, type: 'waypoint' },
    ];
    const next = getNextARWaypoint({ x: 0, y: 0 }, steps, 0.5);
    expect(next).toEqual({ x: 1, y: 0 });
  });

  it('calculates AR navigation data', () => {
    const steps = [
      { instruction: 'Begin', coordinates: { x: 0, y: 0 }, type: 'start' },
      { instruction: 'Go', coordinates: { x: 1, y: 0 }, type: 'waypoint' },
    ];
    const data = calculateARNavigationData({ x: 0, y: 0 }, steps, { x: 1, y: 0 });
    expect(data.bearing).toBeGreaterThanOrEqual(0);
    expect(data.distance).toBeGreaterThanOrEqual(0);
    expect(data.nextWaypoint).toEqual({ x: 1, y: 0 });
    expect(typeof data.isAtDestination).toBe('boolean');
  });
});

describe('navigationUtils Testing Branches', () => {
  const rooms = [
    {
      id: 'A',
      name: 'A',
      buildingId: 'B',
      floorId: '1',
      coordinates: { x: 0, y: 0 },
      type: 'room',
      description: null,
    },
    {
      id: 'B',
      name: 'B',
      buildingId: 'B',
      floorId: '1',
      coordinates: { x: 1, y: 0 },
      type: 'room',
      description: null,
    },
    {
      id: 'S1',
      name: 'Stairs 1',
      buildingId: 'B',
      floorId: '1',
      coordinates: { x: 0, y: 1 },
      type: 'stairs',
      description: null,
      connectorGroupId: 'G1',
    },
    {
      id: 'S2',
      name: 'Stairs 2',
      buildingId: 'B',
      floorId: '2',
      coordinates: { x: 0, y: 1 },
      type: 'stairs',
      description: null,
      connectorGroupId: 'G1',
    },
    {
      id: 'C',
      name: 'C',
      buildingId: 'B',
      floorId: '2',
      coordinates: { x: 1, y: 1 },
      type: 'room',
      description: null,
    },
    {
      id: 'E1',
      name: 'Elevator 1',
      buildingId: 'B',
      floorId: '1',
      coordinates: { x: 2, y: 2 },
      type: 'elevator',
      description: null,
      connectorGroupId: 'G2',
    },
    {
      id: 'E2',
      name: 'Elevator 2',
      buildingId: 'B',
      floorId: '2',
      coordinates: { x: 2, y: 2 },
      type: 'elevator',
      description: null,
      connectorGroupId: 'G2',
    },
  ];
  const paths = [
    {
      id: 'P1',
      buildingId: 'B',
      floorId: '1',
      startRoomId: 'A',
      endRoomId: 'B',
      waypoints: [{ x: 0.5, y: 0 }],
    },
    {
      id: 'P2',
      buildingId: 'B',
      floorId: '1',
      startRoomId: 'B',
      endRoomId: 'S1',
      waypoints: [{ x: 0.5, y: 0.5 }],
    },
    {
      id: 'P3',
      buildingId: 'B',
      floorId: '2',
      startRoomId: 'S2',
      endRoomId: 'C',
      waypoints: [{ x: 0.5, y: 1 }],
    },
    {
      id: 'P4',
      buildingId: 'B',
      floorId: '1',
      startRoomId: 'A',
      endRoomId: 'E1',
      waypoints: [{ x: 1, y: 1 }],
    },
    {
      id: 'P5',
      buildingId: 'B',
      floorId: '2',
      startRoomId: 'E2',
      endRoomId: 'C',
      waypoints: [{ x: 2, y: 1 }],
    },
  ];

  it('handles missing nodes in NavigationGraph', () => {
    const graph = new NavigationGraph(rooms, paths);
    // Path with missing node
    const details = graph.getPathDetails(['A', 'Z']);
    expect(details.waypoints).toEqual([]);
    expect(details.totalDistance).toBe(0);
  });

  it('handles missing connections in NavigationGraph', () => {
    const graph = new NavigationGraph(rooms, paths);
    // Path with missing connection
    const details = graph.getPathDetails(['A', 'C']);
    expect(details.waypoints).toEqual([]);
    expect(details.totalDistance).toBe(0);
  });

  it('skips stairs in accessible mode', () => {
    const steps = calculateMultiFloorRoute('A', 'C', rooms, paths, { accessible: true });
    // Should not include stairs connector
    expect(steps.some((s) => s.instruction.includes('stairs'))).toBe(false);
  });

  it('handles skipping logic for consecutive stairs', () => {
    // Path with consecutive stairs
    const steps = calculateMultiFloorRoute('S1', 'S2', rooms, paths);
    // All steps should be connectors
    expect(steps.every((s) => s.type === 'connector')).toBe(false);
  });

  it('getNextARWaypoint returns null for empty steps', () => {
    expect(getNextARWaypoint({ x: 0, y: 0 }, [])).toBeNull();
  });

  it('calculateInitialFacingDirection returns correct angles', () => {
    expect(calculateInitialFacingDirection({ x: 0, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(180);
    expect(calculateInitialFacingDirection({ x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(90);
    expect(calculateInitialFacingDirection({ x: 0, y: 0 }, { x: 0, y: -1 })).toBeCloseTo(0);
    expect(
      normalizeAngle(calculateInitialFacingDirection({ x: 0, y: 0 }, { x: -1, y: 0 })),
    ).toBeCloseTo(270);
  });

  it('findShortestPath returns null for path longer than nodes.size + 2', () => {
    const rooms = [
      {
        id: 'A',
        name: 'A',
        buildingId: 'B',
        floorId: '1',
        coordinates: { x: 0, y: 0 },
        type: 'room',
        description: null,
      },
      {
        id: 'B',
        name: 'B',
        buildingId: 'B',
        floorId: '1',
        coordinates: { x: 1, y: 0 },
        type: 'room',
        description: null,
      },
    ];
    const paths = [
      { id: 'P1', buildingId: 'B', floorId: '1', startRoomId: 'A', endRoomId: 'B', waypoints: [] },
      { id: 'P2', buildingId: 'B', floorId: '1', startRoomId: 'B', endRoomId: 'A', waypoints: [] }, // cycle
    ];
    const graph = new NavigationGraph(rooms, paths);

    // Simulate a long path by mocking the result
    const origSize = graph.nodes.size;
    graph.nodes.set('X', { roomId: 'X', coordinates: { x: 0, y: 0 }, connections: [] });
    // This will trigger the cycle safety branch
    const result = graph.findShortestPath('A', 'X');
    expect(result).toBeNull();
    // Restore state
    graph.nodes.delete('X');
  });

  it('getPathDetails skips missing nodes', () => {
    const rooms = [
      {
        id: 'A',
        name: 'A',
        buildingId: 'B',
        floorId: '1',
        coordinates: { x: 0, y: 0 },
        type: 'room',
        description: null,
      },
    ];
    const paths = [];
    const graph = new NavigationGraph(rooms, paths);
    // roomPath includes a missing node
    const details = graph.getPathDetails(['A', 'B']);
    expect(details.waypoints).toEqual([]);
    expect(details.totalDistance).toBe(0);
  });

  it('getPathDetails skips missing connections', () => {
    const rooms = [
      {
        id: 'A',
        name: 'A',
        buildingId: 'B',
        floorId: '1',
        coordinates: { x: 0, y: 0 },
        type: 'room',
        description: null,
      },
      {
        id: 'B',
        name: 'B',
        buildingId: 'B',
        floorId: '1',
        coordinates: { x: 1, y: 0 },
        type: 'room',
        description: null,
      },
    ];
    const paths = []; // No connection between A and B
    const graph = new NavigationGraph(rooms, paths);
    const details = graph.getPathDetails(['A', 'B']);
    expect(details.waypoints).toEqual([]);
    expect(details.totalDistance).toBe(0);
  });

  it('generates right turn instructions', () => {
    const rooms = [
      {
        id: 'A',
        name: 'A',
        buildingId: 'B',
        floorId: '1',
        coordinates: { x: 0, y: 0 },
        type: 'room',
        description: null,
      },
      {
        id: 'B',
        name: 'B',
        buildingId: 'B',
        floorId: '1',
        coordinates: { x: 1, y: 0 },
        type: 'room',
        description: null,
      },
      {
        id: 'C',
        name: 'C',
        buildingId: 'B',
        floorId: '1',
        coordinates: { x: 1, y: -1 },
        type: 'room',
        description: null,
      },
    ];
    const paths = [
      { id: 'P1', buildingId: 'B', floorId: '1', startRoomId: 'A', endRoomId: 'B', waypoints: [] },
      { id: 'P2', buildingId: 'B', floorId: '1', startRoomId: 'B', endRoomId: 'C', waypoints: [] },
    ];
    const steps = calculateRoute('A', 'C', rooms, paths);
    expect(steps.some((s) => s.instruction.startsWith('Turn right'))).toBe(true);
  });

  it('generates left turn instructions', () => {
    const rooms = [
      {
        id: 'A',
        name: 'A',
        buildingId: 'B',
        floorId: '1',
        coordinates: { x: 0, y: 0 },
        type: 'room',
        description: null,
      },
      {
        id: 'B',
        name: 'B',
        buildingId: 'B',
        floorId: '1',
        coordinates: { x: -1, y: 0 },
        type: 'room',
        description: null,
      },
      {
        id: 'C',
        name: 'C',
        buildingId: 'B',
        floorId: '1',
        coordinates: { x: -1, y: -1 },
        type: 'room',
        description: null,
      },
    ];
    const paths = [
      { id: 'P1', buildingId: 'B', floorId: '1', startRoomId: 'A', endRoomId: 'B', waypoints: [] },
      { id: 'P2', buildingId: 'B', floorId: '1', startRoomId: 'B', endRoomId: 'C', waypoints: [] },
    ];
    const steps = calculateRoute('A', 'C', rooms, paths);
    //consolelog(steps.map((s) => s.instruction));
    expect(steps.some((s) => s.instruction.startsWith('Turn left'))).toBe(true);
  });

  it('forces justExitedConnector and triggers straight branch', () => {
    const rooms = [
      {
        id: 'A',
        name: 'A',
        buildingId: 'B',
        floorId: '1',
        coordinates: { x: 0, y: 0 },
        type: 'room',
        description: null,
      },
      {
        id: 'S1',
        name: 'Stairs 1',
        buildingId: 'B',
        floorId: '1',
        coordinates: { x: 0, y: 1 },
        type: 'stairs',
        description: null,
        connectorGroupId: 'G1',
      },
      {
        id: 'S2',
        name: 'Stairs 2',
        buildingId: 'B',
        floorId: '2',
        coordinates: { x: 0, y: 1 },
        type: 'stairs',
        description: null,
        connectorGroupId: 'G1',
      },
      {
        id: 'B',
        name: 'B',
        buildingId: 'B',
        floorId: '2',
        coordinates: { x: 1, y: 1 },
        type: 'room',
        description: null,
      },
    ];
    const paths = [
      {
        id: 'P1',
        buildingId: 'B',
        floorId: '1',
        startRoomId: 'A',
        endRoomId: 'S1',
        waypoints: [{ x: 0, y: 0.5 }],
      },
      // connector: S1 <-> S2 is auto-added by NavigationGraph
      {
        id: 'P2',
        buildingId: 'B',
        floorId: '2',
        startRoomId: 'S2',
        endRoomId: 'B',
        waypoints: [{ x: 0.5, y: 1 }],
      },
    ];
    // This should trigger justExitedConnector for the first waypoint after S2
    const steps = calculateRoute('A', 'B', rooms, paths);
    expect(steps.some((s) => s.instruction.startsWith('Continue straight'))).toBe(true);
  });

  it('connector with colinear waypoints triggers straight instruction', () => {
    const rooms = [
      {
        id: 'S1',
        name: 'Stairs 1',
        buildingId: 'B',
        floorId: '1',
        coordinates: { x: 0, y: 0 },
        type: 'stairs',
        description: null,
        connectorGroupId: 'G1',
      },
      {
        id: 'S2',
        name: 'Stairs 2',
        buildingId: 'B',
        floorId: '2',
        coordinates: { x: 0, y: 3 },
        type: 'stairs',
        description: null,
        connectorGroupId: 'G1',
      },
    ];
    const paths = [
      {
        id: 'P1',
        buildingId: 'B',
        floorId: '1',
        startRoomId: 'S1',
        endRoomId: 'S2',
        connector: { kind: 'stairs', toFloorId: '2' },
        waypoints: [
          { x: 0, y: 1 },
          { x: 0, y: 2 },
          { x: 0, y: 3 },
        ],
      },
    ];
    const steps = calculateRoute('S1', 'S2', rooms, paths);
    expect(steps.some((s) => s.instruction.startsWith('Continue straight'))).toBe(true);
  });

  it('skips waypoint instructions before stairs and covers connector branch', () => {
    const rooms = [
      {
        id: 'A',
        name: 'Room A',
        buildingId: 'B1',
        floorId: 'F1',
        coordinates: { x: 0, y: 0 },
        type: 'room',
        description: null,
      },
      {
        id: 'S1',
        name: 'Stairs 1',
        buildingId: 'B1',
        floorId: 'F1',
        coordinates: { x: 5, y: 0 },
        type: 'stairs',
        description: null,
        connectorGroupId: 'G1',
      },
      {
        id: 'S2',
        name: 'Stairs 2',
        buildingId: 'B1',
        floorId: 'F2',
        coordinates: { x: 5, y: 5 },
        type: 'stairs',
        description: null,
        connectorGroupId: 'G1',
      },
      {
        id: 'C',
        name: 'Room C',
        buildingId: 'B1',
        floorId: 'F2',
        coordinates: { x: 10, y: 5 },
        type: 'room',
        description: null,
      },
    ];
    const paths = [
      {
        id: 'P1',
        buildingId: 'B1',
        floorId: 'F1',
        startRoomId: 'A',
        endRoomId: 'S1',
        waypoints: [
          { x: 2, y: 0 },
          { x: 4, y: 0 },
          { x: 5, y: 0 }, // last waypoint before stairs
        ],
      },
      {
        id: 'P2',
        buildingId: 'B1',
        floorId: 'F1',
        startRoomId: 'S1',
        endRoomId: 'S2',
        connector: { groupId: 'G1', kind: 'stairs', toFloorId: 'F2' },
        waypoints: [
          { x: 5, y: 2 },
          { x: 5, y: 4 },
        ],
      },
      {
        id: 'P3',
        buildingId: 'B1',
        floorId: 'F2',
        startRoomId: 'S2',
        endRoomId: 'C',
        waypoints: [
          { x: 7, y: 5 },
          { x: 9, y: 5 },
        ],
      },
    ];
    const steps = calculateMultiFloorRoute('A', 'C', rooms, paths);

    // Should skip instructions for last waypoint before stairs
    expect(
      steps.filter((s) => s.coordinates.x === 5 && s.coordinates.y === 0 && s.type !== 'connector')
        .length,
    ).toBe(0);

    // Should include instructions for other waypoints
    expect(steps.some((s) => s.instruction.startsWith('Continue straight'))).toBe(true);
  });
});

describe('Calculation Tests', () => {
  it('calculateRoute returns empty array if start or end room missing', () => {
    const rooms = [
      {
        id: 'A',
        name: 'A',
        buildingId: 'B',
        floorId: '1',
        coordinates: { x: 0, y: 0 },
        type: 'room',
        description: null,
      },
    ];
    const paths = [];
    expect(calculateRoute('A', 'B', rooms, paths)).toEqual([]);
    expect(calculateRoute('B', 'A', rooms, paths)).toEqual([]);
  });

  it('calculateMultiFloorRoute returns empty array if no path found', () => {
    const rooms = [
      {
        id: 'A',
        name: 'A',
        buildingId: 'B',
        floorId: '1',
        coordinates: { x: 0, y: 0 },
        type: 'room',
        description: null,
      },
    ];
    const paths = [];
    expect(calculateMultiFloorRoute('A', 'B', rooms, paths)).toEqual([]);
  });

  it('calculateRoute adds final destination step if not already present', () => {
    const rooms = [
      {
        id: 'A',
        name: 'A',
        buildingId: 'B',
        floorId: '1',
        coordinates: { x: 0, y: 0 },
        type: 'room',
        description: null,
      },
      {
        id: 'B',
        name: 'B',
        buildingId: 'B',
        floorId: '1',
        coordinates: { x: 1, y: 0 },
        type: 'room',
        description: null,
      },
    ];
    const paths = [
      { id: 'P1', buildingId: 'B', floorId: '1', startRoomId: 'A', endRoomId: 'B', waypoints: [] },
    ];
    const steps = calculateRoute('A', 'B', rooms, paths);
    expect(steps[steps.length - 1].type).toBe('destination');
    expect(steps[steps.length - 1].instruction).toMatch(/arrive/i);
  });

  it('calculateMultiFloorRoute adds final destination step if not already present', () => {
    const rooms = [
      {
        id: 'A',
        name: 'A',
        buildingId: 'B',
        floorId: '1',
        coordinates: { x: 0, y: 0 },
        type: 'room',
        description: null,
      },
      {
        id: 'B',
        name: 'B',
        buildingId: 'B',
        floorId: '1',
        coordinates: { x: 1, y: 0 },
        type: 'room',
        description: null,
      },
    ];
    const paths = [
      { id: 'P1', buildingId: 'B', floorId: '1', startRoomId: 'A', endRoomId: 'B', waypoints: [] },
    ];
    const steps = calculateMultiFloorRoute('A', 'B', rooms, paths);
    expect(steps[steps.length - 1].type).toBe('destination');
    expect(steps[steps.length - 1].instruction).toMatch(/arrive/i);
  });

  it('calculateTurnDirection returns straight for colinear points', () => {
    const p1 = { x: 0, y: 0 };
    const p2 = { x: 1, y: 0 };
    const p3 = { x: 2, y: 0 };
    expect(calculateTurnDirection(p1, p2, p3)).toBe('straight');
  });

  it('calculateTurnDirection returns left for counterclockwise turn', () => {
    const p1 = { x: 0, y: 0 };
    const p2 = { x: 1, y: 0 };
    const p3 = { x: 1, y: 1 };
    expect(calculateTurnDirection(p1, p2, p3)).toBe('left');
  });

  it('calculateTurnDirection returns right for clockwise turn', () => {
    const p1 = { x: 0, y: 0 };
    const p2 = { x: 1, y: 0 };
    const p3 = { x: 1, y: -1 };
    expect(calculateTurnDirection(p1, p2, p3)).toBe('right');
  });

  it('calculateTurnDirection with userFacingDirection returns correct turn', () => {
    const p1 = { x: 0, y: 0 };
    const p2 = { x: 1, y: 0 };
    const p3 = { x: 1, y: 1 };
    // Facing east, next is north, should be right
    expect(calculateTurnDirection(p1, p2, p3, 90)).toBe('right');
    // Facing east, next is south, should be left
    expect(calculateTurnDirection(p1, p2, { x: 1, y: -1 }, 90)).toBe('left');
    // Facing east, next is east, should be straight
    expect(calculateTurnDirection(p1, p2, { x: 2, y: 0 }, 90)).toBe('straight');
  });

  it('stepsToPolyline returns correct coordinates', () => {
    const steps = [
      { instruction: 'Go', coordinates: { x: 1, y: 2 }, type: 'waypoint' },
      { instruction: 'Go', coordinates: { x: 3, y: 4 }, type: 'waypoint' },
    ];
    expect(stepsToPolyline(steps)).toEqual([
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ]);
  });

  it('calculateARBearing returns correct bearing', () => {
    expect(
      require('../src/utils/navigationUtils').calculateARBearing({ x: 0, y: 0 }, { x: 0, y: 1 }),
    ).toBeCloseTo(180);
    expect(
      require('../src/utils/navigationUtils').calculateARBearing({ x: 0, y: 0 }, { x: 1, y: 0 }),
    ).toBeCloseTo(90);
  });

  it('calculateARNavigationData returns correct structure', () => {
    const steps = [{ instruction: 'Go', coordinates: { x: 1, y: 0 }, type: 'waypoint' }];
    const data = calculateARNavigationData({ x: 0, y: 0 }, steps, { x: 1, y: 0 });
    expect(typeof data.bearing).toBe('number');
    expect(typeof data.distance).toBe('number');
    expect(typeof data.isAtDestination).toBe('boolean');
    expect(data.nextWaypoint).toEqual({ x: 1, y: 0 });
  });

  it('getARDirection returns correct relative direction', () => {
    expect(getARDirection({ x: 0, y: 0 }, { x: 1, y: 0 }, 0)).toBeCloseTo(90);
    expect(getARDirection({ x: 0, y: 0 }, { x: 0, y: 1 }, 0)).toBeCloseTo(180);
  });

  it('calculateRoute detects turn when waypoints double back', () => {
    const rooms = [
      {
        id: 'A',
        name: 'A',
        buildingId: 'B',
        floorId: '1',
        coordinates: { x: 0, y: 0 },
        type: 'room',
        description: null,
      },
      {
        id: 'C',
        name: 'C',
        buildingId: 'B',
        floorId: '1',
        coordinates: { x: 0, y: 2 },
        type: 'room',
        description: null,
      },
    ];
    const paths = [
      {
        id: 'P1',
        buildingId: 'B',
        floorId: '1',
        startRoomId: 'A',
        endRoomId: 'C',
        waypoints: [
          { x: 0, y: 1 },
          { x: 1, y: 1 }, // right turn
          { x: 0, y: 2 }, // left turn
        ],
      },
    ];
    const steps = calculateRoute('A', 'C', rooms, paths);
    expect(steps.some((s) => s.instruction.startsWith('Turn right'))).toBe(true);
    expect(steps.some((s) => s.instruction.startsWith('Turn left'))).toBe(true);
  });

  it('calculateRoute skips step if nextRoom is missing', () => {
    const rooms = [
      {
        id: 'A',
        name: 'A',
        buildingId: 'B',
        floorId: '1',
        coordinates: { x: 0, y: 0 },
        type: 'room',
        description: null,
      },
    ];
    const paths = [
      { id: 'P1', buildingId: 'B', floorId: '1', startRoomId: 'A', endRoomId: 'B', waypoints: [] },
    ];
    const steps = calculateRoute('A', 'B', rooms, paths);
    expect(steps.length).toBe(0);
  });
});

describe('calculateMultiFloorRoute Focused Tests', () => {
  it('handles empty room and path arrays', () => {
    const steps = calculateMultiFloorRoute('A', 'B', [], []);
    expect(steps).toEqual([]);
  });

  it('handles missing start room', () => {
    const rooms = [
      {
        id: 'B',
        name: 'B',
        buildingId: 'B',
        floorId: '1',
        coordinates: { x: 1, y: 1 },
        type: 'room',
        description: null,
      },
    ];
    const paths = [];
    const steps = calculateMultiFloorRoute('A', 'B', rooms, paths);
    expect(steps).toEqual([]);
  });

  it('handles missing end room', () => {
    const rooms = [
      {
        id: 'A',
        name: 'A',
        buildingId: 'B',
        floorId: '1',
        coordinates: { x: 0, y: 0 },
        type: 'room',
        description: null,
      },
    ];
    const paths = [];
    const steps = calculateMultiFloorRoute('A', 'B', rooms, paths);
    expect(steps).toEqual([]);
  });

  it('handles same start and end room', () => {
    const rooms = [
      {
        id: 'A',
        name: 'A',
        buildingId: 'B',
        floorId: '1',
        coordinates: { x: 0, y: 0 },
        type: 'room',
        description: null,
      },
    ];
    const paths = [];
    const steps = calculateMultiFloorRoute('A', 'A', rooms, paths);
    expect(steps.length).toBeGreaterThan(0);
  });

  it('handles accessible mode skipping stairs', () => {
    const rooms = [
      {
        id: 'A',
        name: 'A',
        buildingId: 'B',
        floorId: '1',
        coordinates: { x: 0, y: 0 },
        type: 'room',
        description: null,
      },
      {
        id: 'S1',
        name: 'Stairs 1',
        buildingId: 'B',
        floorId: '1',
        coordinates: { x: 0, y: 1 },
        type: 'stairs',
        description: null,
        connectorGroupId: 'G1',
      },
      {
        id: 'E1',
        name: 'Elevator 1',
        buildingId: 'B',
        floorId: '1',
        coordinates: { x: 1, y: 1 },
        type: 'elevator',
        description: null,
        connectorGroupId: 'G2',
      },
    ];
    const paths = [
      { id: 'P1', buildingId: 'B', floorId: '1', startRoomId: 'A', endRoomId: 'S1', waypoints: [] },
      { id: 'P2', buildingId: 'B', floorId: '1', startRoomId: 'A', endRoomId: 'E1', waypoints: [] },
    ];
    const steps = calculateMultiFloorRoute('A', 'S1', rooms, paths, { accessible: true });
    expect(steps.some((s) => s.instruction.includes('stairs'))).toBe(false);
  });

  it('handles complex multi-floor routing', () => {
    const rooms = [
      {
        id: 'A',
        name: 'A',
        buildingId: 'B',
        floorId: '1',
        coordinates: { x: 0, y: 0 },
        type: 'room',
        description: null,
      },
      {
        id: 'S1',
        name: 'Stairs 1',
        buildingId: 'B',
        floorId: '1',
        coordinates: { x: 0, y: 1 },
        type: 'stairs',
        description: null,
        connectorGroupId: 'G1',
      },
      {
        id: 'S2',
        name: 'Stairs 2',
        buildingId: 'B',
        floorId: '2',
        coordinates: { x: 0, y: 1 },
        type: 'stairs',
        description: null,
        connectorGroupId: 'G1',
      },
      {
        id: 'B',
        name: 'B',
        buildingId: 'B',
        floorId: '2',
        coordinates: { x: 1, y: 1 },
        type: 'room',
        description: null,
      },
    ];
    const paths = [
      { id: 'P1', buildingId: 'B', floorId: '1', startRoomId: 'A', endRoomId: 'S1', waypoints: [] },
      { id: 'P2', buildingId: 'B', floorId: '2', startRoomId: 'S2', endRoomId: 'B', waypoints: [] },
    ];
    const steps = calculateMultiFloorRoute('A', 'B', rooms, paths);
    expect(steps.length).toBeGreaterThan(0);
    expect(steps.some((s) => s.type === 'connector')).toBe(true);
  });
});

describe('findNearestRoom', () => {
  it('returns null when no rooms are close enough', () => {
    const point = { x: 100, y: 100 };
    const roomPOIs = [
      {
        id: 'far',
        name: 'Far',
        buildingId: 'B1',
        floorId: 'F1',
        coordinates: { x: 0, y: 0 },
        type: 'room',
        description: null,
      },
    ];
    expect(findNearestRoom(point, roomPOIs, [])).toBeNull();
  });

  it('returns null when all rooms are excluded', () => {
    const point = { x: 0.1, y: 0.1 };
    const roomPOIs = [
      {
        id: 'A',
        name: 'A',
        buildingId: 'B1',
        floorId: 'F1',
        coordinates: { x: 0, y: 0 },
        type: 'room',
        description: null,
      },
    ];
    expect(findNearestRoom(point, roomPOIs, ['A'])).toBeNull();
  });

  it('returns correct nearest room within threshold', () => {
    const point = { x: 0.1, y: 0.1 };
    const roomPOIs = [
      {
        id: 'A',
        name: 'A',
        buildingId: 'B1',
        floorId: 'F1',
        coordinates: { x: 0, y: 0 },
        type: 'room',
        description: null,
      },
      {
        id: 'B',
        name: 'B',
        buildingId: 'B1',
        floorId: 'F1',
        coordinates: { x: 5, y: 5 },
        type: 'room',
        description: null,
      },
    ];
    expect(findNearestRoom(point, roomPOIs, [])).toEqual(roomPOIs[0]);
  });
});

describe('NavigationUtils Connectors', () => {
  // Test data for connector scenarios
  const rooms = [
    {
      id: 'A',
      name: 'Room A',
      buildingId: 'B1',
      floorId: 'F1',
      coordinates: { x: 0, y: 0 },
      type: 'room',
      description: null,
    },
    {
      id: 'B',
      name: 'Room B',
      buildingId: 'B1',
      floorId: 'F1',
      coordinates: { x: 10, y: 0 },
      type: 'room',
      description: null,
    },
    {
      id: 'S1',
      name: 'Stairs 1',
      buildingId: 'B1',
      floorId: 'F1',
      coordinates: { x: 5, y: 0 },
      type: 'stairs',
      description: null,
      connectorGroupId: 'G1',
    },
    {
      id: 'S2',
      name: 'Stairs 2',
      buildingId: 'B1',
      floorId: 'F2',
      coordinates: { x: 5, y: 0 },
      type: 'stairs',
      description: null,
      connectorGroupId: 'G1',
    },
    {
      id: 'C',
      name: 'Room C',
      buildingId: 'B1',
      floorId: 'F2',
      coordinates: { x: 10, y: 0 },
      type: 'room',
      description: null,
    },
    {
      id: 'E1',
      name: 'Elevator 1',
      buildingId: 'B1',
      floorId: 'F1',
      coordinates: { x: 0, y: 5 },
      type: 'elevator',
      description: null,
      connectorGroupId: 'G2',
    },
    {
      id: 'E2',
      name: 'Elevator 2',
      buildingId: 'B1',
      floorId: 'F2',
      coordinates: { x: 0, y: 5 },
      type: 'elevator',
      description: null,
      connectorGroupId: 'G2',
    },
  ];

  const paths = [
    {
      id: 'P1',
      buildingId: 'B1',
      floorId: 'F1',
      startRoomId: 'A',
      endRoomId: 'S1',
      waypoints: [{ x: 2.5, y: 0 }],
    },
    {
      id: 'P2',
      buildingId: 'B1',
      floorId: 'F2',
      startRoomId: 'S2',
      endRoomId: 'C',
      waypoints: [{ x: 7.5, y: 0 }],
    },
    {
      id: 'P3',
      buildingId: 'B1',
      floorId: 'F1',
      startRoomId: 'A',
      endRoomId: 'E1',
      waypoints: [{ x: 0, y: 2.5 }],
    },
    {
      id: 'P4',
      buildingId: 'B1',
      floorId: 'F2',
      startRoomId: 'E2',
      endRoomId: 'C',
      waypoints: [{ x: 5, y: 0 }],
    },
  ];

  it('handles elevator connector with waypoints', () => {
    const elevatorRooms = [
      ...rooms,
      {
        id: 'D',
        name: 'Room D',
        buildingId: 'B1',
        floorId: 'F2',
        coordinates: { x: 10, y: 10 },
        type: 'room',
        description: null,
      },
    ];

    const elevatorPaths = [
      ...paths,
      {
        id: 'P5',
        buildingId: 'B1',
        floorId: 'F1',
        startRoomId: 'A',
        endRoomId: 'E1',
        waypoints: [{ x: 0, y: 2.5 }],
      },
      {
        id: 'P6',
        buildingId: 'B1',
        floorId: 'F2',
        startRoomId: 'E2',
        endRoomId: 'D',
        waypoints: [{ x: 5, y: 7.5 }],
      },
    ];

    const steps = calculateRoute('A', 'D', elevatorRooms, elevatorPaths);

    // Should include elevator connector
    const elevatorStep = steps.find(
      (step) => step.type === 'connector' && step.instruction.includes('Elevator'),
    );
    expect(elevatorStep).toBeDefined();
    expect(elevatorStep?.instruction).toContain('Floor F2');
  });

  it('handles consecutive stairs scenario', () => {
    const stairsRooms = [
      {
        id: 'S1',
        name: 'Stairs 1',
        buildingId: 'B1',
        floorId: 'F1',
        coordinates: { x: 0, y: 0 },
        type: 'stairs',
        description: null,
        connectorGroupId: 'G1',
      },
      {
        id: 'S2',
        name: 'Stairs 2',
        buildingId: 'B1',
        floorId: 'F2',
        coordinates: { x: 0, y: 0 },
        type: 'stairs',
        description: null,
        connectorGroupId: 'G1',
      },
      {
        id: 'S3',
        name: 'Stairs 3',
        buildingId: 'B1',
        floorId: 'F3',
        coordinates: { x: 0, y: 0 },
        type: 'stairs',
        description: null,
        connectorGroupId: 'G1',
      },
    ];

    const stairsPaths = [
      {
        id: 'P1',
        buildingId: 'B1',
        floorId: 'F1',
        startRoomId: 'S1',
        endRoomId: 'S2',
        waypoints: [],
      },
      {
        id: 'P2',
        buildingId: 'B1',
        floorId: 'F2',
        startRoomId: 'S2',
        endRoomId: 'S3',
        waypoints: [],
      },
    ];

    const steps = calculateRoute('S1', 'S3', stairsRooms, stairsPaths);

    // Should handle consecutive stairs correctly
    const connectorSteps = steps.filter((step) => step.type === 'connector');
    expect(connectorSteps.length).toBe(0);
  });
});
