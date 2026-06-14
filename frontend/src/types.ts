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

export interface Task {
  id: string;
  code: string | null;
  name: string;
  type: TaskType;
  status: TaskStatus;
  priority: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
  origin: GridPosition;
  target: GridPosition;
  targetX: number;
  targetY: number;
  robotId: string | null;
  assignedNodeId: string | null;
  assignedOperatorId: string | null;
  loadTypeRequired: "UNIT_LOAD" | "BULK_LOAD";
  requiresRefrigeration: boolean;
  requiresFragileHandling: boolean;
  requiredAmount: number;
  amountUnit: CapacityUnit;
  executionStage: "TO_ORIGIN" | "TO_TARGET";
  recommendedRobots: TaskRobotCandidate[];
  createdAt: string;
  updatedAt: string;
}

export interface TaskRobotCandidate {
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

export interface PreviewRoute {
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

export interface WorldBootstrap {
  width: number;
  height: number;
  robots: RobotState[];
  obstacles: GridPosition[];
  tasks?: Task[];
  previewRoutes?: PreviewRoute[];
}

export interface WorldSnapshot extends WorldBootstrap {
  tick: number;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
}

export type EventType =
  | "ROBOT_STATE"
  | "TASK_CREATED"
  | "TASK_ASSIGNED"
  | "TASK_STARTED"
  | "TASK_COMPLETED"
  | "OBSTACLE_DETECTED"
  | "OBSTACLE_MOVED"
  | "MQTT_MESSAGE_RECEIVED"
  | "ACTUATOR_COMMAND";

export interface EventLogEntry {
  id: string;
  type: EventType;
  source: string;
  topic: string | null;
  robotId: string | null;
  taskId: string | null;
  payload: unknown;
  createdAt: string;
}

export interface RobotTelemetryEntry {
  id: string;
  robotId: string;
  x: number;
  y: number;
  status: RobotStatus;
  speedCellsPerSec: number | null;
  taskId: string | null;
  source: string;
  recordedAt: string;
  createdAt: string;
}

export interface NetworkStatusSnapshot {
  mqttConnectionState: "connected" | "reconnecting" | "disconnected";
}

export type RobotCommandType = "PAUSE" | "RESUME" | "EMERGENCY_STOP" | "SET_SPEED";

export type ViewMode = "central" | "operator";
export type AccessRole = "central" | "operator";
export type OperatorNodeCode = "PC-B01" | "PC-B02" | "PC-B03";

export interface AccessSessionRecord {
  role: AccessRole;
  nodeId: OperatorNodeCode | null;
  operatorId?: string | null;
  operatorUsername?: string | null;
  token: string | null;
}

export interface ActiveSessionView {
  socketId: string | null;
  role: AccessRole;
  nodeId: OperatorNodeCode | null;
  operatorId?: string | null;
  operatorUsername?: string | null;
  connectedAt: string;
  clientIp: string | null;
}

export interface Operator {
  id: string;
  name: string;
  username: string;
  assignedNodeId: OperatorNodeCode | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RobotAdminInput {
  code: string;
  name: string;
  physicalWeightKg: number;
  speedCellsPerSec: number;
  capacityValue: number;
  capacityUnit: CapacityUnit;
  supports: RobotSupport[];
  status: "activo" | "inactivo" | "mantenimiento" | "en_espera" | "averiado";
  isActive: boolean;
}

export interface OperatorAdminInput {
  name: string;
  username: string;
  password?: string;
  assignedNodeId: OperatorNodeCode | null;
  isActive: boolean;
}

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

export interface GameStateSnapshot {
  status: GameStatus;
  grid: {
    width: number;
    height: number;
    tickRateHz: number;
  };
  players: GamePlayer[];
  collectibles: GameCollectible[];
  obstacles: GameObstacle[];
  leaderboard: GameLeaderboardItem[];
  tick: number;
}
