import type { PrismaClient, Robot, Task } from "@prisma/client";

import { notFound } from "../../shared/errors.js";
import type { GridPosition, RobotState } from "../../shared/types.js";
import { PathfindingService } from "../pathfinding/pathfinding-service.js";

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

export class RobotService {
  private readonly robots = new Map<string, RobotState>();

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly pathfindingService: PathfindingService
  ) {}

  public async bootstrap(): Promise<void> {
    const robots = await this.prisma.robot.findMany({
      orderBy: { code: "asc" },
      include: {
        tasks: {
          where: { status: { in: ["ASSIGNED", "REASSIGNED", "IN_PROGRESS"] } },
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
      const activeTask = robot.tasks[0];

      this.robots.set(robot.id, {
        id: robot.id,
        code: robot.code,
        name: robot.name ?? robot.code,
        position: { x: robot.x, y: robot.y },
        targetPosition: activeTask ? this.resolveTaskTarget(robot, activeTask) : null,
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
        assignedNodeCode: robot.node?.code ?? null,
        updatedAt: robot.updatedAt.toISOString()
      });
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

  public async tick(): Promise<RobotState[]> {
    const nextStates: RobotState[] = [];

    for (const robot of this.robots.values()) {
      if (robot.path.length <= 1 || !robot.targetPosition) {
        nextStates.push(robot);
        continue;
      }

      const [, ...remainingPath] = robot.path;
      const nextPosition = remainingPath[0] ?? robot.position;
      const completed = remainingPath.length <= 1;

      const nextState: RobotState = {
        ...robot,
        position: nextPosition,
        path: remainingPath.length > 0 ? remainingPath : [nextPosition],
        status: completed ? "IDLE" : "MOVING",
        targetPosition: completed ? null : robot.targetPosition,
        taskId: robot.taskId,
        updatedAt: new Date().toISOString()
      };

      this.robots.set(robot.id, nextState);
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
      if (!robot.targetPosition) {
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

  public setState(robot: RobotState): void {
    this.robots.set(robot.id, robot);
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

  private resolveTaskTarget(robot: BootstrappedRobot, task: ActiveTaskShape): GridPosition {
    if (task.executionStage === "TO_ORIGIN" && (robot.x !== task.originX || robot.y !== task.originY)) {
      return { x: task.originX, y: task.originY };
    }

    return { x: task.targetX, y: task.targetY };
  }
}
