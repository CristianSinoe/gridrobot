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

  public getForOperator(nodeId: string, focusedRobotId: string | null): PreviewRouteView[] {
    const previews = this.getAll();
    const ownPreview =
      previews.find((preview) => preview.nodeId === nodeId && (!focusedRobotId || preview.robotId === focusedRobotId)) ??
      previews.find((preview) => preview.nodeId === nodeId) ??
      null;

    if (!ownPreview) {
      return [];
    }

    const visiblePreviews = new Map<string, PreviewRouteView>();
    visiblePreviews.set(ownPreview.taskId, ownPreview);

    ownPreview.conflictRobotIds.forEach((robotId) => {
      if (robotId === ownPreview.robotId) {
        return;
      }

      const relatedPreview = previews.find((preview) => preview.robotId === robotId);
      if (relatedPreview) {
        visiblePreviews.set(relatedPreview.taskId, relatedPreview);
      }
    });

    return Array.from(visiblePreviews.values());
  }

  public clearByTask(taskId: string): boolean {
    const changed = this.previewsByTaskId.delete(taskId);
    if (changed) {
      this.rebuildConflictMetadata();
    }

    return changed;
  }

  public clearByNode(nodeId: string | null): boolean {
    let changed = false;

    for (const preview of this.previewsByTaskId.values()) {
      if (preview.nodeId === nodeId) {
        this.previewsByTaskId.delete(preview.taskId);
        changed = true;
      }
    }

    if (changed) {
      this.rebuildConflictMetadata();
    }

    return changed;
  }

  public async upsertPreview(taskId: string, robotId: string, nodeId: string | null): Promise<PreviewRouteView> {
    this.clearByNode(nodeId);

    const preview = await this.buildPreview(taskId, robotId, nodeId);
    this.previewsByTaskId.set(taskId, preview);
    this.rebuildConflictMetadata();
    return this.previewsByTaskId.get(taskId) ?? preview;
  }

  public async recalculateAll(): Promise<PreviewRouteView[]> {
    const nextEntries = await Promise.all(
      this.getAll().map((preview) => this.buildPreview(preview.taskId, preview.robotId, preview.nodeId))
    );

    this.previewsByTaskId.clear();
    nextEntries.forEach((preview) => {
      this.previewsByTaskId.set(preview.taskId, preview);
    });

    this.rebuildConflictMetadata();

    return this.getAll();
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
      conflictCells: [],
      conflictRobotIds: [],
      conflictNodeIds: [],
      status: "INVALID" as const,
      message: "La ruta previa ya no es valida en el estado actual del mundo.",
      updatedAt: new Date().toISOString()
    };

    if (
      !task ||
      (
        task.status !== "ASSIGNED_PENDING_START" &&
        task.status !== "ASSIGNED" &&
        task.status !== "REASSIGNED"
      )
    ) {
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
        conflictCells: [],
        conflictRobotIds: [],
        conflictNodeIds: [],
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

  private rebuildConflictMetadata(): void {
    const previews = Array.from(this.previewsByTaskId.values());
    const cellParticipants = new Map<
      string,
      Array<{ taskId: string; robotId: string; nodeId: string | null; cell: GridPosition }>
    >();

    previews.forEach((preview) => {
      if (preview.status !== "READY") {
        return;
      }

      const visitedCells = new Set<string>();
      preview.path.forEach((cell) => {
        const key = `${cell.x}:${cell.y}`;
        if (visitedCells.has(key)) {
          return;
        }

        visitedCells.add(key);
        const participants = cellParticipants.get(key) ?? [];
        participants.push({
          taskId: preview.taskId,
          robotId: preview.robotId,
          nodeId: preview.nodeId,
          cell
        });
        cellParticipants.set(key, participants);
      });
    });

    previews.forEach((preview) => {
      const conflictCells = new Map<string, GridPosition>();
      const conflictRobotIds = new Set<string>();
      const conflictNodeIds = new Set<string>();

      if (preview.status === "READY") {
        const visitedCells = new Set<string>();
        preview.path.forEach((cell) => {
          const key = `${cell.x}:${cell.y}`;
          if (visitedCells.has(key)) {
            return;
          }

          visitedCells.add(key);
          const participants = cellParticipants.get(key) ?? [];
          const otherParticipants = participants.filter((participant) => participant.taskId !== preview.taskId);
          if (otherParticipants.length === 0) {
            return;
          }

          conflictCells.set(key, cell);
          participants.forEach((participant) => {
            conflictRobotIds.add(participant.robotId);
            if (participant.nodeId) {
              conflictNodeIds.add(participant.nodeId);
            }
          });
        });
      }

      this.previewsByTaskId.set(preview.taskId, {
        ...preview,
        conflictCells: Array.from(conflictCells.values()),
        conflictRobotIds: Array.from(conflictRobotIds),
        conflictNodeIds: Array.from(conflictNodeIds)
      });
    });
  }
}
