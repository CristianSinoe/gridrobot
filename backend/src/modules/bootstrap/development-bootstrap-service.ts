import type { PrismaClient, Robot, RobotSupportCapability } from "@prisma/client";
import { hash } from "bcryptjs";

import { logger } from "../../config/logger.js";
import type { GridPosition } from "../../shared/types.js";
import type { GridManager } from "../grid/grid-manager.js";
import { ObstacleGeneratorService } from "../obstacles/obstacle-generator-service.js";
import { FIXED_RUNTIME_ASSIGNMENTS, ROBOT_CATALOG } from "../robots/robot-catalog.js";
import { TaskGeneratorService } from "../tasks/task-generator-service.js";

export class DevelopmentBootstrapService {
  private readonly obstacleGeneratorService: ObstacleGeneratorService;
  private readonly taskGeneratorService: TaskGeneratorService;

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly gridManager: GridManager
  ) {
    this.obstacleGeneratorService = new ObstacleGeneratorService(prisma, gridManager, 20260316);
    this.taskGeneratorService = new TaskGeneratorService(prisma, gridManager, 20260317);
  }

  public async bootstrap(): Promise<void> {
    const nodes = await this.ensureNodes();
    await this.ensureOperators(nodes);
    const activeMap = await this.ensureGridMap();
    await this.ensureGridCells(activeMap.id);
    const robots = await this.ensureRobotCatalog(nodes);

    const reservedPositions = robots.map((robot) => ({ x: robot.x, y: robot.y }));
    await this.ensureInitialTasks(robots, reservedPositions);

    const tasks = await this.prisma.task.findMany({
      where: { status: { in: ["PENDING", "ASSIGNED", "REASSIGNED", "IN_PROGRESS", "WAITING_ASSISTANCE"] } },
      select: { originX: true, originY: true, targetX: true, targetY: true }
    });

    const taskReserved = tasks.flatMap((task) => [
      { x: task.originX, y: task.originY },
      { x: task.targetX, y: task.targetY }
    ]);

    await this.obstacleGeneratorService.ensureInitialObstacles(42, [
      ...reservedPositions,
      ...taskReserved
    ]);

    logger.info("Development bootstrap completed.");
  }

  private async ensureNodes() {
    const nodeDefinitions = [
      { code: "PC-A01", name: "Central Server", role: "CENTRAL_SERVER" as const },
      { code: "PC-B01", name: "Operator B01", role: "OPERATOR_CLIENT" as const },
      { code: "PC-B02", name: "Operator B02", role: "OPERATOR_CLIENT" as const },
      { code: "PC-B03", name: "Operator B03", role: "OPERATOR_CLIENT" as const }
    ];

    await Promise.all(
      nodeDefinitions.map((node) =>
        this.prisma.node.upsert({
          where: { code: node.code },
          update: {
            name: node.name,
            role: node.role,
            status: "ONLINE"
          },
          create: {
            code: node.code,
            name: node.name,
            role: node.role,
            status: "ONLINE"
          }
        })
      )
    );

    return this.prisma.node.findMany();
  }

  private async ensureGridMap() {
    const { width, height } = this.gridManager.getDimensions();

    return this.prisma.gridMap.upsert({
      where: { code: "GRIDROBOT-DEFAULT" },
      update: {
        name: "GRIDROBOT Default Map",
        width,
        height,
        isActive: true
      },
      create: {
        code: "GRIDROBOT-DEFAULT",
        name: "GRIDROBOT Default Map",
        width,
        height,
        isActive: true
      }
    });
  }

  private async ensureOperators(nodes: { id: string; code: string }[]): Promise<void> {
    const nodeByCode = new Map(nodes.map((node) => [node.code, node.id]));
    const demoOperators = [
      { name: "Operador B01", username: "operador.b01", password: "gridbot_b01", assignedNodeCode: "PC-B01" },
      { name: "Operador B02", username: "operador.b02", password: "gridbot_b02", assignedNodeCode: "PC-B02" },
      { name: "Operador B03", username: "operador.b03", password: "gridbot_b03", assignedNodeCode: "PC-B03" }
    ];

    for (const operator of demoOperators) {
      const passwordHash = await hash(operator.password, 10);
      await this.prisma.operator.upsert({
        where: { username: operator.username },
        update: {
          name: operator.name,
          passwordHash,
          assignedNodeId: nodeByCode.get(operator.assignedNodeCode) ?? null,
          isActive: true
        },
        create: {
          name: operator.name,
          username: operator.username,
          passwordHash,
          assignedNodeId: nodeByCode.get(operator.assignedNodeCode) ?? null,
          isActive: true
        }
      });
    }
  }

  private async ensureGridCells(mapId: string): Promise<void> {
    const { width, height } = this.gridManager.getDimensions();
    const existing = await this.prisma.gridCell.count({
      where: { mapId }
    });

    if (existing >= width * height) {
      return;
    }

    await this.prisma.gridCell.deleteMany({ where: { mapId } });

    const cells = Array.from({ length: height }, (_, y) =>
      Array.from({ length: width }, (_, x) => ({
        mapId,
        x,
        y,
        cellType: "FLOOR",
        isBlocked: false,
        traversalCost: 1
      }))
    ).flat();

    for (let index = 0; index < cells.length; index += 200) {
      await this.prisma.gridCell.createMany({
        data: cells.slice(index, index + 200)
      });
    }
  }

  private async ensureRobotCatalog(nodes: { id: string; code: string }[]): Promise<Robot[]> {
    const { width, height } = this.gridManager.getDimensions();
    const fixedAssignments = new Map<string, string>(
      FIXED_RUNTIME_ASSIGNMENTS.map((entry) => [entry.robotCode, entry.nodeCode])
    );
    const nodeByCode = new Map(nodes.map((node) => [node.code, node.id]));
    const activeMap = await this.prisma.gridMap.findUniqueOrThrow({
      where: { code: "GRIDROBOT-DEFAULT" }
    });

    const spawnPositions: Record<string, GridPosition> = {
      R03: { x: 4, y: 4 },
      R11: { x: 10, y: 12 },
      R16: { x: 22, y: 8 }
    };

    for (const [index, robot] of ROBOT_CATALOG.entries()) {
      const fallbackPosition = {
        x: (index * 3) % width,
        y: Math.floor((index * 3) / width) % height
      };
      const position = spawnPositions[robot.code] ?? fallbackPosition;
      const assignedNodeCode = fixedAssignments.get(robot.code);

      await this.prisma.robot.upsert({
        where: { code: robot.code },
        update: {
          name: robot.name,
          status: assignedNodeCode ? "IDLE" : robot.isActive ? "WAITING" : "OFFLINE",
          catalogStatus: robot.status,
          isActive: robot.isActive,
          physicalWeightKg: robot.physicalWeightKg,
          speedCellsPerSec: robot.speedCellsPerSec,
          capacityValue: robot.capacityValue,
          capacityUnit: robot.capacityUnit,
          supports: robot.supports as unknown as RobotSupportCapability[],
          nodeId: assignedNodeCode ? nodeByCode.get(assignedNodeCode) ?? null : null,
          currentMapId: activeMap.id,
          x: position.x,
          y: position.y
        },
        create: {
          code: robot.code,
          name: robot.name,
          status: assignedNodeCode ? "IDLE" : robot.isActive ? "WAITING" : "OFFLINE",
          catalogStatus: robot.status,
          isActive: robot.isActive,
          physicalWeightKg: robot.physicalWeightKg,
          speedCellsPerSec: robot.speedCellsPerSec,
          capacityValue: robot.capacityValue,
          capacityUnit: robot.capacityUnit,
          supports: robot.supports as unknown as RobotSupportCapability[],
          nodeId: assignedNodeCode ? nodeByCode.get(assignedNodeCode) ?? null : null,
          currentMapId: activeMap.id,
          x: position.x,
          y: position.y
        }
      });
    }

    return this.prisma.robot.findMany({
      where: { currentMapId: activeMap.id },
      orderBy: { code: "asc" }
    });
  }

  private async ensureInitialTasks(robots: Robot[], blockedPositions: GridPosition[]): Promise<void> {
    const existing = await this.prisma.task.count({
      where: { status: { in: ["PENDING", "ASSIGNED_PENDING_START"] } }
    });

    if (existing >= 10) {
      return;
    }

    const missing = 10 - existing;
    for (let index = 0; index < missing; index += 1) {
      const task = await this.taskGeneratorService.createAutomaticTask(blockedPositions);
      blockedPositions.push(
        { x: task.originX, y: task.originY },
        { x: task.targetX, y: task.targetY }
      );
    }
  }
}
