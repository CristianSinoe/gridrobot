import { badRequest } from "../../shared/errors.js";
import type { GridPosition } from "../../shared/types.js";
import type { GridManager } from "../grid/grid-manager.js";
import type { ObstacleManager } from "../obstacles/obstacle-manager.js";

interface QueueNode {
  position: GridPosition;
  priority: number;
}

export class PathfindingService {
  public constructor(
    private readonly gridManager: GridManager,
    private readonly obstacleManager: ObstacleManager
  ) {}

  public findPath(start: GridPosition, goal: GridPosition): GridPosition[] {
    if (!this.gridManager.isWithinBounds(start) || !this.gridManager.isWithinBounds(goal)) {
      throw badRequest("Los extremos de la ruta deben estar dentro de la cuadricula.");
    }

    if (this.obstacleManager.isBlocked(goal)) {
      throw badRequest("La celda objetivo esta bloqueada por un obstaculo.");
    }

    const openSet: QueueNode[] = [{ position: start, priority: 0 }];
    const cameFrom = new Map<string, GridPosition>();
    const gScore = new Map<string, number>([[this.gridManager.key(start), 0]]);

    while (openSet.length > 0) {
      openSet.sort((a, b) => a.priority - b.priority);
      const current = openSet.shift();

      if (!current) {
        break;
      }

      if (this.gridManager.equals(current.position, goal)) {
        return this.reconstructPath(cameFrom, goal);
      }

      for (const neighbor of this.gridManager.getNeighbors(current.position)) {
        if (this.obstacleManager.isBlocked(neighbor)) {
          continue;
        }

        const neighborKey = this.gridManager.key(neighbor);
        const tentativeScore = (gScore.get(this.gridManager.key(current.position)) ?? Infinity) + 1;

        if (tentativeScore < (gScore.get(neighborKey) ?? Infinity)) {
          cameFrom.set(neighborKey, current.position);
          gScore.set(neighborKey, tentativeScore);
          openSet.push({
            position: neighbor,
            priority: tentativeScore + this.heuristic(neighbor, goal)
          });
        }
      }
    }

    throw badRequest("No se pudo encontrar una ruta valida.");
  }

  private heuristic(a: GridPosition, b: GridPosition): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  private reconstructPath(
    cameFrom: Map<string, GridPosition>,
    goal: GridPosition
  ): GridPosition[] {
    const path: GridPosition[] = [goal];
    let current: GridPosition | undefined = goal;

    while (current) {
      const previous = cameFrom.get(this.gridManager.key(current));
      if (!previous) {
        break;
      }

      path.unshift(previous);
      current = previous;
    }

    return path;
  }
}
