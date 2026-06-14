import type {
  CapacityUnit,
  PrismaClient,
  Robot,
  RobotStatus as PrismaRobotStatus,
  RobotSupportCapability
} from "@prisma/client";

import { env } from "../../config/env.js";
import { badRequest, notFound } from "../../shared/errors.js";
import type { GridPosition, RobotState } from "../../shared/types.js";
import type { PathfindingService } from "../pathfinding/pathfinding-service.js";

interface ActiveTaskShape {
  id: string;
  originX: number;
  originY: number;
  targetX: number;
  targetY: number;
  executionStage: "TO_ORIGIN" | "TO_TARGET";
}

type BootstrappedRobot = Robot & {
  tasks: ActiveTaskShape[];
  node: { code: string } | null;
};

interface RobotAdminInput {
  code: string;
  name: string;
  physicalWeightKg: number;
  speedCellsPerSec: number;
  capacityValue: number;
  capacityUnit: CapacityUnit;
  supports: RobotSupportCapability[];
  status: string;
  isActive: boolean;
}

export class RobotService {
  private readonly robots = new Map<string, RobotState>();
  private readonly movementProgress = new Map<string, number>();
  private readonly pausedTargets = new Map<string, { target: GridPosition; taskId: string | null }>();

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly pathfindingService: PathfindingService
  ) {}

  public async bootstrap(): Promise<void> {
    const robots = await this.prisma.robot.findMany({
      orderBy: { code: "asc" },
      include: {
        tasks: {
          where: { status: { in: ["ASSIGNED", "ASSIGNED_PENDING_START", "REASSIGNED", "IN_PROGRESS"] } },
          orderBy: { updatedAt: "desc" },
          take: 1
        },
        node: {
          select: { code: true }
        }
      }
    });

    this.robots.clear();

    for (const robot of robots as BootstrappedRobot[]) {
      this.robots.set(
        robot.id,
        this.toRuntimeState(robot, robot.tasks[0] ?? null, robot.node?.code ?? null)
      );
    }
  }

  public getAll(): RobotState[] {
    return Array.from(this.robots.values());
  }

  public getById(robotId: string): RobotState {
    const robot = this.robots.get(robotId);
    if (!robot) {
      throw notFound(`No se encontro el robot ${robotId}.`);
    }

    return robot;
  }

  public async create(input: RobotAdminInput): Promise<RobotState> {
    const activeMap = await this.prisma.gridMap.findFirst({
      where: { isActive: true },
      orderBy: { updatedAt: "desc" }
    });

    if (!activeMap) {
      throw badRequest("No hay un mapa activo para registrar nuevos robots.");
    }

    const position = await this.findAvailableSpawnPosition(activeMap.id, activeMap.width, activeMap.height);
    const created = await this.prisma.robot.create({
      data: {
        code: input.code.trim().toUpperCase(),
        name: input.name.trim(),
        status: this.resolveRobotStatus(input.status, input.isActive),
        catalogStatus: input.status,
        isActive: input.isActive,
        physicalWeightKg: input.physicalWeightKg,
        speedCellsPerSec: input.speedCellsPerSec,
        capacityValue: input.capacityValue,
        capacityUnit: input.capacityUnit,
        supports: input.supports,
        currentMapId: activeMap.id,
        x: position.x,
        y: position.y
      }
    });

    const state = this.toRuntimeState(created, null, null);
    this.robots.set(state.id, state);
    return state;
  }

  public async update(robotId: string, input: RobotAdminInput): Promise<RobotState> {
    const current = await this.prisma.robot.findUnique({
      where: { id: robotId },
      include: {
        tasks: {
          where: { status: { in: ["ASSIGNED", "ASSIGNED_PENDING_START", "REASSIGNED", "IN_PROGRESS"] } },
          orderBy: { updatedAt: "desc" },
          take: 1
        },
        node: {
          select: { code: true }
        }
      }
    });

    if (!current) {
      throw notFound(`No se encontro el robot ${robotId}.`);
    }

    const updated = await this.prisma.robot.update({
      where: { id: robotId },
      data: {
        code: input.code.trim().toUpperCase(),
        name: input.name.trim(),
        status:
          current.status === "MOVING" || current.status === "BLOCKED"
            ? current.status
            : this.resolveRobotStatus(input.status, input.isActive),
        catalogStatus: input.status,
        isActive: input.isActive,
        physicalWeightKg: input.physicalWeightKg,
        speedCellsPerSec: input.speedCellsPerSec,
        capacityValue: input.capacityValue,
        capacityUnit: input.capacityUnit,
        supports: input.supports
      }
    });

    const state = this.toRuntimeState(updated, current.tasks[0] ?? null, current.node?.code ?? null);
    this.robots.set(state.id, state);
    return state;
  }

  public async updateStatus(robotId: string, status: string, isActive: boolean): Promise<RobotState> {
    const current = await this.prisma.robot.findUnique({
      where: { id: robotId },
      include: {
        tasks: {
          where: { status: { in: ["ASSIGNED", "ASSIGNED_PENDING_START", "REASSIGNED", "IN_PROGRESS"] } },
          orderBy: { updatedAt: "desc" },
          take: 1
        },
        node: {
          select: { code: true }
        }
      }
    });

    if (!current) {
      throw notFound(`No se encontro el robot ${robotId}.`);
    }

    const updated = await this.prisma.robot.update({
      where: { id: robotId },
      data: {
        status:
          current.status === "MOVING" || current.status === "BLOCKED"
            ? current.status
            : this.resolveRobotStatus(status, isActive),
        catalogStatus: status,
        isActive
      }
    });

    const state = this.toRuntimeState(updated, current.tasks[0] ?? null, current.node?.code ?? null);
    this.robots.set(state.id, state);
    return state;
  }

  public async assignRoute(
    robotId: string,
    target: GridPosition,
    taskId?: string,
    reason = "PLANNED"
  ): Promise<RobotState> {
    const robot = this.getById(robotId);
    const path = this.pathfindingService.findPath(robot.position, target);

    const nextState: RobotState = {
      ...robot,
      targetPosition: target,
      path,
      status: path.length > 1 ? "MOVING" : "IDLE",
      taskId: taskId ?? robot.taskId,
      updatedAt: new Date().toISOString()
    };

    this.robots.set(robotId, nextState);
    this.pausedTargets.delete(robotId);
    this.movementProgress.set(robotId, 0);

    await this.prisma.robot.update({
      where: { id: robotId },
      data: {
        status: nextState.status,
        targetX: target.x,
        targetY: target.y
      }
    });

    await this.persistRoute(robotId, taskId ?? null, path, reason);

    return nextState;
  }

  public async tick(tickRateHz: number): Promise<RobotState[]> {
    const nextStates: RobotState[] = [];

    for (const robot of this.robots.values()) {
      if (robot.status !== "MOVING" || robot.path.length <= 1 || !robot.targetPosition) {
        nextStates.push(robot);
        continue;
      }

      const currentProgress = this.movementProgress.get(robot.id) ?? 0;
      const speedCellsPerSec = Math.max((robot.speedCellsPerSec ?? 1) * env.ROBOT_SPEED_MULTIPLIER, 0.1);
      const accumulatedProgress = currentProgress + speedCellsPerSec / tickRateHz;
      const stepsToAdvance = Math.floor(accumulatedProgress);

      if (stepsToAdvance < 1) {
        this.movementProgress.set(robot.id, accumulatedProgress);
        nextStates.push(robot);
        continue;
      }

      let remainingProgress = accumulatedProgress - stepsToAdvance;
      let path = robot.path;
      let nextPosition = robot.position;
      let stepsTaken = 0;

      while (stepsTaken < stepsToAdvance && path.length > 1) {
        const [, ...remainingPath] = path;
        nextPosition = remainingPath[0] ?? nextPosition;
        path = remainingPath.length > 0 ? remainingPath : [nextPosition];
        stepsTaken += 1;
      }

      const completed = path.length <= 1;

      const nextState: RobotState = {
        ...robot,
        position: nextPosition,
        path,
        status: completed ? "IDLE" : "MOVING",
        targetPosition: completed ? null : robot.targetPosition,
        taskId: robot.taskId,
        updatedAt: new Date().toISOString()
      };

      this.robots.set(robot.id, nextState);
      if (completed) {
        remainingProgress = 0;
        this.movementProgress.delete(robot.id);
        this.pausedTargets.delete(robot.id);
      } else {
        this.movementProgress.set(robot.id, remainingProgress);
      }
      nextStates.push(nextState);
    }

    if (nextStates.length > 0) {
      await this.persistStates(nextStates);
    }

    return nextStates;
  }

  public async recalculateRoutesForObstacles(): Promise<RobotState[]> {
    const changedRobots: RobotState[] = [];

    for (const robot of this.robots.values()) {
      if (!robot.targetPosition || robot.status !== "MOVING") {
        continue;
      }

      let nextState: RobotState;

      try {
        const path = this.pathfindingService.findPath(robot.position, robot.targetPosition);
        nextState = {
          ...robot,
          path,
          status: path.length > 1 ? "MOVING" : "IDLE",
          updatedAt: new Date().toISOString()
        };
        await this.persistRoute(robot.id, robot.taskId, path, "RECALCULATED");
      } catch {
        nextState = {
          ...robot,
          path: [robot.position],
          status: "BLOCKED",
          updatedAt: new Date().toISOString()
        };
      }

      this.robots.set(robot.id, nextState);
      this.movementProgress.set(robot.id, 0);
      changedRobots.push(nextState);
    }

    if (changedRobots.length > 0) {
      await this.persistStates(changedRobots);
    }

    return changedRobots;
  }

  public async markFailure(robotId: string): Promise<RobotState> {
    const robot = this.getById(robotId);
    const nextState: RobotState = {
      ...robot,
      path: [robot.position],
      targetPosition: null,
      status: "OFFLINE",
      taskId: null,
      catalogStatus: "averiado",
      isActive: false,
      updatedAt: new Date().toISOString()
    };

    this.robots.set(robotId, nextState);
    this.pausedTargets.delete(robotId);
    this.movementProgress.delete(robotId);

    await this.prisma.robot.update({
      where: { id: robotId },
      data: {
        status: "OFFLINE",
        targetX: null,
        targetY: null,
        catalogStatus: "averiado",
        isActive: false
      }
    });

    return nextState;
  }

  public async clearTaskControl(
    robotId: string,
    status: RobotState["status"] = "WAITING"
  ): Promise<RobotState> {
    const robot = this.getById(robotId);
    const nextState: RobotState = {
      ...robot,
      path: [robot.position],
      targetPosition: null,
      status,
      taskId: null,
      updatedAt: new Date().toISOString()
    };

    this.robots.set(robotId, nextState);
    this.pausedTargets.delete(robotId);
    this.movementProgress.delete(robotId);

    await this.prisma.robot.update({
      where: { id: robotId },
      data: {
        status: nextState.status,
        targetX: null,
        targetY: null
      }
    });

    return nextState;
  }

  public canReceiveCommand(robotId: string): void {
    const robot = this.getById(robotId);
    if (!robot.isActive || robot.status === "OFFLINE") {
      throw badRequest("No se puede enviar un comando a un robot desconectado.");
    }
  }

  public async applyExternalStatus(
    robotId: string,
    input: {
      status?: "IDLE" | "MOVING" | "WAITING" | "BLOCKED" | "OFFLINE";
      speedCellsPerSec?: number | null;
      reason?: string | null;
    }
  ): Promise<RobotState> {
    const robot = this.getById(robotId);
    const nextSpeed =
      typeof input.speedCellsPerSec === "number" ? input.speedCellsPerSec : robot.speedCellsPerSec;
    const nextState = await this.resolveExternalRobotState(robot, {
      status: input.status ?? robot.status,
      speedCellsPerSec: nextSpeed
    });

    this.robots.set(robotId, nextState);
    await this.prisma.robot.update({
      where: { id: robotId },
      data: this.buildPersistenceUpdate(nextState)
    });

    return nextState;
  }

  public async applyExternalTelemetry(
    robotId: string,
    input: {
      speedCellsPerSec?: number | null;
      x?: number;
      y?: number;
      status?: "IDLE" | "MOVING" | "WAITING" | "BLOCKED" | "OFFLINE";
    }
  ): Promise<RobotState> {
    const robot = this.getById(robotId);
    const nextState = await this.resolveExternalRobotState(robot, {
      position:
        typeof input.x === "number" && typeof input.y === "number"
          ? { x: input.x, y: input.y }
          : robot.position,
      status: input.status ?? robot.status,
      speedCellsPerSec:
        typeof input.speedCellsPerSec === "number" ? input.speedCellsPerSec : robot.speedCellsPerSec
    });

    this.robots.set(robotId, nextState);
    await this.prisma.robot.update({
      where: { id: robotId },
      data: {
        ...this.buildPersistenceUpdate(nextState),
        lastSeenAt: new Date()
      }
    });

    return nextState;
  }

  public setState(robot: RobotState): void {
    this.robots.set(robot.id, robot);
    if (robot.status !== "MOVING") {
      this.movementProgress.delete(robot.id);
    }
    if (robot.status === "IDLE" || !robot.targetPosition) {
      this.pausedTargets.delete(robot.id);
    }
  }

  public hasPausedRoute(robotId: string): boolean {
    return this.pausedTargets.has(robotId);
  }

  private async persistStates(robots: RobotState[]): Promise<void> {
    await this.prisma.$transaction(
      robots.map((robot) =>
        this.prisma.robot.update({
          where: { id: robot.id },
          data: {
            x: robot.position.x,
            y: robot.position.y,
            targetX: robot.targetPosition?.x ?? null,
            targetY: robot.targetPosition?.y ?? null,
            status: robot.status
          }
        })
      )
    );
  }

  private buildPersistenceUpdate(robot: RobotState): {
    x: number;
    y: number;
    targetX: number | null;
    targetY: number | null;
    status: RobotState["status"];
    speedCellsPerSec?: number | null;
  } {
    return {
      x: robot.position.x,
      y: robot.position.y,
      targetX: robot.targetPosition?.x ?? null,
      targetY: robot.targetPosition?.y ?? null,
      status: robot.status,
      ...(robot.speedCellsPerSec !== undefined ? { speedCellsPerSec: robot.speedCellsPerSec } : {})
    };
  }

  private async resolveExternalRobotState(
    robot: RobotState,
    input: {
      position?: GridPosition;
      status: RobotState["status"];
      speedCellsPerSec?: number | null;
    }
  ): Promise<RobotState> {
    const nextPosition = input.position ?? robot.position;
    const nextSpeed = typeof input.speedCellsPerSec === "number" ? input.speedCellsPerSec : robot.speedCellsPerSec;
    const preservedTarget = robot.targetPosition ?? this.pausedTargets.get(robot.id)?.target ?? null;
    const currentProgress = this.movementProgress.get(robot.id) ?? 0;

    if ((input.status === "WAITING" || input.status === "BLOCKED") && preservedTarget) {
      this.pausedTargets.set(robot.id, {
        target: preservedTarget,
        taskId: robot.taskId
      });
      this.movementProgress.set(robot.id, currentProgress);
      return {
        ...robot,
        position: nextPosition,
        path:
          robot.path.length > 1
            ? [
                nextPosition,
                ...robot.path.slice(1).filter((step, index, path) => {
                  if (step.x === nextPosition.x && step.y === nextPosition.y) {
                    return false;
                  }

                  const previous = path[index - 1];
                  return !previous || previous.x !== step.x || previous.y !== step.y;
                })
              ]
            : [nextPosition],
        targetPosition: preservedTarget,
        status: input.status,
        speedCellsPerSec: nextSpeed,
        updatedAt: new Date().toISOString()
      };
    }

    if (
      input.status === "MOVING" &&
      preservedTarget &&
      (this.pausedTargets.has(robot.id) || robot.status === "WAITING" || robot.status === "BLOCKED")
    ) {
      try {
        const path = this.pathfindingService.findPath(nextPosition, preservedTarget);
        this.pausedTargets.delete(robot.id);
        this.movementProgress.set(robot.id, currentProgress);
        return {
          ...robot,
          position: nextPosition,
          path,
          targetPosition: path.length > 1 ? preservedTarget : null,
          status: path.length > 1 ? "MOVING" : "IDLE",
          speedCellsPerSec: nextSpeed,
          updatedAt: new Date().toISOString()
        };
      } catch {
        this.pausedTargets.set(robot.id, {
          target: preservedTarget,
          taskId: robot.taskId
        });
        this.movementProgress.set(robot.id, currentProgress);
        return {
          ...robot,
          position: nextPosition,
          path: [nextPosition],
          targetPosition: preservedTarget,
          status: "BLOCKED",
          speedCellsPerSec: nextSpeed,
          updatedAt: new Date().toISOString()
        };
      }
    }

    if (input.status === "IDLE") {
      this.pausedTargets.delete(robot.id);
      this.movementProgress.delete(robot.id);
    }

    return {
      ...robot,
      position: nextPosition,
      status: input.status,
      speedCellsPerSec: nextSpeed,
      updatedAt: new Date().toISOString()
    };
  }

  private async persistRoute(
    robotId: string,
    taskId: string | null,
    path: GridPosition[],
    invalidationReason: string
  ): Promise<void> {
    const start = path[0];
    const goal = path[path.length - 1];
    if (!start || !goal) {
      return;
    }

    const latestRoute = await this.prisma.route.findFirst({
      where: { robotId },
      orderBy: { version: "desc" }
    });

    const route = await this.prisma.route.create({
      data: {
        robotId,
        taskId,
        status: "ACTIVE",
        version: (latestRoute?.version ?? 0) + 1,
        startX: start.x,
        startY: start.y,
        goalX: goal.x,
        goalY: goal.y,
        estimatedCost: Math.max(0, path.length - 1),
        invalidationReason
      }
    });

    await this.prisma.routeStep.createMany({
      data: path.map((step, index) => ({
        routeId: route.id,
        stepIndex: index,
        x: step.x,
        y: step.y
      }))
    });
  }

  private toRuntimeState(
    robot: Pick<
      Robot,
      | "id"
      | "code"
      | "name"
      | "x"
      | "y"
      | "status"
      | "catalogStatus"
      | "isActive"
      | "physicalWeightKg"
      | "speedCellsPerSec"
      | "capacityValue"
      | "capacityUnit"
      | "supports"
      | "updatedAt"
    >,
    activeTask: ActiveTaskShape | null,
    assignedNodeCode: string | null
  ): RobotState {
    return {
      id: robot.id,
      code: robot.code,
      name: robot.name ?? robot.code,
      position: { x: robot.x, y: robot.y },
      targetPosition: activeTask ? this.resolveTaskTarget(robot as BootstrappedRobot, activeTask) : null,
      path: [{ x: robot.x, y: robot.y }],
      status: robot.status,
      taskId: activeTask?.id ?? null,
      catalogStatus: robot.catalogStatus,
      isActive: robot.isActive,
      physicalWeightKg: robot.physicalWeightKg ?? null,
      speedCellsPerSec: robot.speedCellsPerSec ?? null,
      capacityValue: robot.capacityValue ?? null,
      capacityUnit: robot.capacityUnit ?? null,
      supports: robot.supports,
      assignedNodeCode,
      updatedAt: robot.updatedAt.toISOString()
    };
  }

  private resolveTaskTarget(
    robot: Pick<Robot, "x" | "y">,
    task: ActiveTaskShape
  ): GridPosition {
    if (task.executionStage === "TO_ORIGIN" && (robot.x !== task.originX || robot.y !== task.originY)) {
      return { x: task.originX, y: task.originY };
    }

    return { x: task.targetX, y: task.targetY };
  }

  private resolveRobotStatus(status: string, isActive: boolean): PrismaRobotStatus {
    if (!isActive || status === "inactivo" || status === "mantenimiento" || status === "averiado") {
      return "OFFLINE";
    }

    return status === "en_espera" ? "WAITING" : "IDLE";
  }

  private async findAvailableSpawnPosition(
    currentMapId: string,
    width: number,
    height: number
  ): Promise<GridPosition> {
    const robots = await this.prisma.robot.findMany({
      where: { currentMapId },
      select: { x: true, y: true }
    });
    const occupied = new Set(robots.map((robot) => `${robot.x}:${robot.y}`));

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        if (!occupied.has(`${x}:${y}`)) {
          return { x, y };
        }
      }
    }

    throw badRequest("No hay posiciones libres en el mapa activo para registrar otro robot.");
  }
}
