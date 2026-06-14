export type RobotStatus = "IDLE" | "MOVING" | "WAITING" | "BLOCKED" | "OFFLINE";
export type SystemMode = "WAREHOUSE" | "GAME";
export type TaskStatus =
  | "PENDING"
  | "ASSIGNED"
  | "ASSIGNED_PENDING_START"
  | "REASSIGNED"
  | "IN_PROGRESS"
  | "WAITING_ASSISTANCE"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED";
export type ObstacleType = "STATIC" | "DYNAMIC";
export type CapacityUnit = "units" | "kg";
export type RobotSupport =
  | "UNIT_LOAD"
  | "BULK_LOAD"
  | "NON_FRAGILE"
  | "FRAGILE"
  | "REFRIGERATED";
export type TaskType =
  | "MOVE_BOXES"
  | "MOVE_BOTTLES"
  | "MOVE_SAND"
  | "MOVE_GRAVEL"
  | "MOVE_LIQUID_BULK"
  | "MOVE_COLD_PRODUCTS"
  | "MOVE_FRAGILE_PRODUCTS";

export interface GridPosition {
  x: number;
  y: number;
}

export interface RobotState {
  id: string;
  code: string;
  name: string;
  position: GridPosition;
  targetPosition: GridPosition | null;
  path: GridPosition[];
  status: RobotStatus;
  taskId: string | null;
  catalogStatus: string;
  isActive: boolean;
  physicalWeightKg: number | null;
  speedCellsPerSec: number | null;
  capacityValue: number | null;
  capacityUnit: CapacityUnit | null;
  supports: RobotSupport[];
  assignedNodeCode: string | null;
  updatedAt: string;
}

export interface TaskView {
  id: string;
  code: string | null;
  name: string;
  type: TaskType;
  status: TaskStatus;
  priority: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
  origin: GridPosition;
  target: GridPosition;
  robotId: string | null;
  assignedNodeId: string | null;
  assignedOperatorId: string | null;
  loadTypeRequired: "UNIT_LOAD" | "BULK_LOAD";
  requiresRefrigeration: boolean;
  requiresFragileHandling: boolean;
  requiredAmount: number;
  amountUnit: CapacityUnit;
  executionStage: "TO_ORIGIN" | "TO_TARGET";
  recommendedRobots: TaskRobotCandidateView[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskRobotCandidateView {
  robotId: string;
  robotCode: string;
  robotName: string;
  nodeId: string | null;
  distanceToOrigin: number;
  capacityLabel: string;
  supports: RobotSupport[];
  availabilityLabel: string;
  reservationLabel: string | null;
  priorityLabel: string | null;
  isAvailable: boolean;
}

export interface OperatorView {
  id: string;
  name: string;
  username: string;
  assignedNodeId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PreviewRouteView {
  taskId: string;
  robotId: string;
  nodeId: string | null;
  origin: GridPosition;
  target: GridPosition;
  path: GridPosition[];
  conflictCells: GridPosition[];
  conflictRobotIds: string[];
  conflictNodeIds: string[];
  status: "READY" | "INVALID";
  message: string | null;
  updatedAt: string;
}

export interface WorldSnapshot {
  tick: number;
  width: number;
  height: number;
  robots: RobotState[];
  obstacles: GridPosition[];
  tasks?: TaskView[];
  previewRoutes?: PreviewRouteView[];
}

export type WorldBootstrap = Omit<WorldSnapshot, "tick">;

export type GameStatus = "IDLE" | "RUNNING" | "PAUSED" | "FINISHED";
export type GameDirection = "UP" | "DOWN" | "LEFT" | "RIGHT";
export type GameCollectibleType = "POINT" | "BONUS" | "LIFE";

export interface GamePlayer {
  id: string;
  name: string;
  robotId?: string;
  color: string;
  position: GridPosition;
  direction: GameDirection;
  nextDirection?: GameDirection;
  score: number;
  lives: number;
  alive: boolean;
  connected: boolean;
  invulnerableUntil?: number;
  joinedAt: string;
}

export interface GameCollectible {
  id: string;
  type: GameCollectibleType;
  position: GridPosition;
  value: number;
}

export interface GameObstacle {
  id: string;
  position: GridPosition;
}

export interface GameLeaderboardItem {
  playerId: string;
  name: string;
  color: string;
  score: number;
  lives: number;
  alive: boolean;
  connected: boolean;
  joinedAt: string;
  statusLabel: "Vivo" | "Eliminado" | "Desconectado";
}

export interface GameGridConfig {
  width: number;
  height: number;
  tickRateHz: number;
}

export interface GameStateSnapshot {
  status: GameStatus;
  grid: GameGridConfig;
  players: GamePlayer[];
  collectibles: GameCollectible[];
  obstacles: GameObstacle[];
  leaderboard: GameLeaderboardItem[];
  tick: number;
}
