import type { GridPosition, RobotState } from "../../shared/types.js";
import type { GridManager } from "../grid/grid-manager.js";
import type { ObstacleManager } from "../obstacles/obstacle-manager.js";
import type { RobotService } from "../robots/robot-service.js";

export class WorldVisibilityService {
  private readonly discoveredByRobot = new Map<string, Set<string>>();
  private readonly officiallyDiscovered = new Set<string>();

  public constructor(
    private readonly gridManager: GridManager,
    private readonly obstacleManager: ObstacleManager,
    private readonly robotService: RobotService,
    private readonly fovRadius: number
  ) {}

  public bootstrap(): void {
    this.refreshDiscoveries();
  }

  public refreshDiscoveries(): GridPosition[] {
    const discoveredNow: GridPosition[] = [];

    for (const robot of this.robotService.getAll()) {
      const robotDiscoveries = this.ensureRobotDiscoveries(robot.id);

      for (const position of this.getFovCells(robot.position)) {
        if (!this.obstacleManager.isBlocked(position)) {
          continue;
        }

        const key = this.gridManager.key(position);
        if (!robotDiscoveries.has(key)) {
          robotDiscoveries.add(key);
        }

        if (!this.officiallyDiscovered.has(key)) {
          this.officiallyDiscovered.add(key);
          discoveredNow.push(position);
        }
      }
    }

    return discoveredNow;
  }

  public getVisibleObstaclesForRobot(robotId: string): GridPosition[] {
    const visibleKeys = this.discoveredByRobot.get(robotId);
    if (!visibleKeys) {
      return [];
    }

    return this.obstacleManager.getAll().filter((position) => visibleKeys.has(this.gridManager.key(position)));
  }

  public getOfficiallyDiscoveredObstacles(): GridPosition[] {
    return this.obstacleManager
      .getAll()
      .filter((position) => this.officiallyDiscovered.has(this.gridManager.key(position)));
  }

  public handleObstacleRemoved(position: GridPosition): void {
    const key = this.gridManager.key(position);
    this.officiallyDiscovered.delete(key);

    for (const discoveries of this.discoveredByRobot.values()) {
      discoveries.delete(key);
    }
  }

  public handleObstacleMoved(from: GridPosition, to: GridPosition): void {
    this.handleObstacleRemoved(from);

    const toKey = this.gridManager.key(to);
    for (const discoveries of this.discoveredByRobot.values()) {
      discoveries.delete(toKey);
    }

    this.officiallyDiscovered.delete(toKey);
  }

  private ensureRobotDiscoveries(robotId: string): Set<string> {
    const existing = this.discoveredByRobot.get(robotId);
    if (existing) {
      return existing;
    }

    const next = new Set<string>();
    this.discoveredByRobot.set(robotId, next);
    return next;
  }

  private getFovCells(center: GridPosition): GridPosition[] {
    const cells: GridPosition[] = [];

    for (let y = center.y - this.fovRadius; y <= center.y + this.fovRadius; y += 1) {
      for (let x = center.x - this.fovRadius; x <= center.x + this.fovRadius; x += 1) {
        const candidate = { x, y };
        if (this.gridManager.isWithinBounds(candidate)) {
          cells.push(candidate);
        }
      }
    }

    return cells;
  }
}
