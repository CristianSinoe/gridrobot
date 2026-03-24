import type {
  CapacityUnit,
  RobotStatus,
  RobotSupport,
  Task,
  TaskStatus,
  TaskType
} from "../types";

export const robotStatusText: Record<RobotStatus, string> = {
  IDLE: "Inactivo",
  MOVING: "En movimiento",
  WAITING: "En espera",
  BLOCKED: "Bloqueado",
  OFFLINE: "Desconectado"
};

export const taskStatusText: Record<TaskStatus, string> = {
  PENDING: "Pendiente",
  ASSIGNED: "Tomada",
  REASSIGNED: "Reasignada",
  IN_PROGRESS: "En viaje",
  WAITING_ASSISTANCE: "Esperando asistencia",
  COMPLETED: "Completada",
  FAILED: "Fallida",
  CANCELLED: "Cancelada"
};

export const taskTypeText: Record<TaskType, string> = {
  MOVE_BOXES: "Mover cajas",
  MOVE_BOTTLES: "Mover botellas",
  MOVE_SAND: "Mover arena",
  MOVE_GRAVEL: "Mover grava",
  MOVE_LIQUID_BULK: "Mover carga liquida",
  MOVE_COLD_PRODUCTS: "Mover productos refrigerados",
  MOVE_FRAGILE_PRODUCTS: "Mover productos fragiles"
};

export const supportText: Record<RobotSupport, string> = {
  UNIT_LOAD: "carga unitaria",
  BULK_LOAD: "carga a granel",
  NON_FRAGILE: "no fragil",
  FRAGILE: "fragil",
  REFRIGERATED: "refrigerado"
};

export const capacityUnitText: Record<CapacityUnit, string> = {
  units: "unidades",
  kg: "kg"
};

export const connectionStateText: Record<"connecting" | "connected" | "disconnected", string> = {
  connecting: "conectando",
  connected: "conectado",
  disconnected: "desconectado"
};

export const priorityText: Record<Task["priority"], string> = {
  LOW: "Baja",
  NORMAL: "Normal",
  HIGH: "Alta",
  CRITICAL: "Critica"
};

export const executionStageText: Record<Task["executionStage"], string> = {
  TO_ORIGIN: "Hacia el origen",
  TO_TARGET: "Hacia el objetivo"
};

export const loadTypeText: Record<Task["loadTypeRequired"], string> = {
  UNIT_LOAD: "carga unitaria",
  BULK_LOAD: "carga a granel"
};

export const formatCapacity = (value: number | null, unit: CapacityUnit | null): string => {
  if (value === null || unit === null) {
    return "-";
  }

  return `${value} ${capacityUnitText[unit]}`;
};

export const formatPosition = (x: number, y: number): string => `(${x}, ${y})`;
