export type RobotStatus = "IDLE" | "MOVING" | "WAITING" | "BLOCKED";
export type ObstacleType = "STATIC" | "DYNAMIC";

export interface GridPosition {
  x: number;
  y: number;
}

export interface GridDimensions {
  width: number;
  height: number;
}

export interface Obstacle {
  id: string;
  position: GridPosition;
  type: ObstacleType;
  discoveredAtTick: number;
}

export interface RobotCommand {
  robotId: string;
  target: GridPosition;
}

export interface RobotModel {
  id: string;
  name: string;
  position: GridPosition;
  goal: GridPosition | null;
  path: GridPosition[];
  status: RobotStatus;
  lastUpdatedTick: number;
  blockedReason: string | null;
}

export interface RobotMoveIntent {
  robotId: string;
  from: GridPosition;
  to: GridPosition;
}

export interface SimulationTickResult {
  tick: number;
  robots: RobotModel[];
  obstacles: Obstacle[];
  events: SimulationEvent[];
}

export interface SimulationConfig {
  grid: GridDimensions;
  tickRateHz?: number;
}

export interface PendingObstacleChange {
  type: "DISCOVER" | "REMOVE";
  position: GridPosition;
  obstacleType: ObstacleType;
}

export interface SimulationEvent {
  type:
    | "ROBOT_REGISTERED"
    | "COMMAND_ACCEPTED"
    | "COMMAND_REJECTED"
    | "ROBOT_MOVED"
    | "ROBOT_WAITING"
    | "ROBOT_BLOCKED"
    | "ROUTE_RECALCULATED"
    | "ROUTE_UNAVAILABLE"
    | "OBSTACLE_DISCOVERED"
    | "OBSTACLE_REMOVED"
    | "CONFLICT_RESOLVED";
  tick: number;
  robotId?: string;
  message: string;
  metadata?: Record<string, unknown>;
}
