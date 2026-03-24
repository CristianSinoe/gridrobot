import type { PrismaClient } from "@prisma/client";

import type { GridPosition, PreviewRouteView } from "../../shared/types.js";
import type { PathfindingService } from "../pathfinding/pathfinding-service.js";
import type { RobotService } from "../robots/robot-service.js";

export class PreviewRouteService {
  private readonly previewsByTaskId = new Map<string, PreviewRouteView>();

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly robotService: RobotService,
    private readonly pathfindingService: PathfindingService
  ) {}

  public getAll(): PreviewRouteView[] {
    return Array.from(this.previewsByTaskId.values());
  }

  public getForNode(nodeId: string | null): PreviewRouteView[] {
    return this.getAll().filter((preview) => preview.nodeId === nodeId);
  }

  public clearByTask(taskId: string): boolean {
    return this.previewsByTaskId.delete(taskId);
  }

  public clearByNode(nodeId: string | null): boolean {
    let changed = false;

    for (const preview of this.previewsByTaskId.values()) {
      if (preview.nodeId === nodeId) {
        this.previewsByTaskId.delete(preview.taskId);
        changed = true;
      }
    }

    return changed;
  }

  public async upsertPreview(taskId: string, robotId: string, nodeId: string | null): Promise<PreviewRouteView> {
    this.clearByNode(nodeId);

    const preview = await this.buildPreview(taskId, robotId, nodeId);
    this.previewsByTaskId.set(taskId, preview);
    return preview;
  }

  public async recalculateAll(): Promise<PreviewRouteView[]> {
    const nextEntries = await Promise.all(
      this.getAll().map((preview) => this.buildPreview(preview.taskId, preview.robotId, preview.nodeId))
    );

    this.previewsByTaskId.clear();
    nextEntries.forEach((preview) => {
      this.previewsByTaskId.set(preview.taskId, preview);
    });

    return nextEntries;
  }

  private async buildPreview(
    taskId: string,
    robotId: string,
    nodeId: string | null
  ): Promise<PreviewRouteView> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId }
    });
    const robot = this.robotService.getById(robotId);

    const fallback = {
      taskId,
      robotId,
      nodeId,
      origin: task ? { x: task.originX, y: task.originY } : robot.position,
      target: task ? { x: task.targetX, y: task.targetY } : robot.position,
      path: [robot.position],
      status: "INVALID" as const,
      message: "La ruta previa ya no es valida en el estado actual del mundo.",
      updatedAt: new Date().toISOString()
    };

    if (!task || (task.status !== "ASSIGNED" && task.status !== "REASSIGNED")) {
      return fallback;
    }

    const origin = { x: task.originX, y: task.originY };
    const target = { x: task.targetX, y: task.targetY };

    try {
      const toOrigin = this.pathfindingService.findPath(robot.position, origin);
      const toTarget = this.pathfindingService.findPath(origin, target);
      const path = this.mergePaths(toOrigin, toTarget);

      return {
        taskId,
        robotId,
        nodeId,
        origin,
        target,
        path,
        status: "READY",
        message: null,
        updatedAt: new Date().toISOString()
      };
    } catch (error) {
      return {
        ...fallback,
        origin,
        target,
        message:
          error instanceof Error
            ? `La ruta previa no esta disponible: ${error.message}`
            : fallback.message
      };
    }
  }

  private mergePaths(firstLeg: GridPosition[], secondLeg: GridPosition[]): GridPosition[] {
    if (firstLeg.length === 0) {
      return secondLeg;
    }

    if (secondLeg.length === 0) {
      return firstLeg;
    }

    const [, ...remainingSecondLeg] = secondLeg;
    return [...firstLeg, ...remainingSecondLeg];
  }
}
