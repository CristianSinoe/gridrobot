export type RobotStatus = "IDLE" | "MOVING" | "WAITING" | "BLOCKED" | "OFFLINE";
export type TaskStatus =
  | "PENDING"
  | "ASSIGNED"
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
  availabilityLabel: string;
  reservationLabel: string | null;
  priorityLabel: string | null;
  isAvailable: boolean;
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

export interface WorldBootstrap extends Omit<WorldSnapshot, "tick"> {}
