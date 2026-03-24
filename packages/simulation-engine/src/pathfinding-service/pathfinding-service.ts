import { GridEngine } from "../grid-engine/grid-engine.js";
import type { GridPosition } from "../types.js";

interface FindPathOptions {
  blockedPositions?: GridPosition[];
  reservedPositions?: GridPosition[];
}

interface QueueNode {
  position: GridPosition;
  priority: number;
}

export class PathfindingService {
  public constructor(private readonly gridEngine: GridEngine) {}

  public findPath(
    start: GridPosition,
    goal: GridPosition,
    options: FindPathOptions = {}
  ): GridPosition[] {
    if (!this.gridEngine.isWithinBounds(start) || !this.gridEngine.isWithinBounds(goal)) {
      throw new Error("Path endpoints must be within the grid.");
    }

    const blocked = new Set(
      [...(options.blockedPositions ?? []), ...(options.reservedPositions ?? [])].map((position) =>
        this.gridEngine.key(position)
      )
    );

    blocked.delete(this.gridEngine.key(start));

    if (blocked.has(this.gridEngine.key(goal))) {
      throw new Error("Path destination is blocked.");
    }

    const openSet: QueueNode[] = [{ position: start, priority: 0 }];
    const cameFrom = new Map<string, GridPosition>();
    const gScore = new Map<string, number>([[this.gridEngine.key(start), 0]]);

    while (openSet.length > 0) {
      openSet.sort((a, b) => a.priority - b.priority);
      const current = openSet.shift();

      if (!current) {
        break;
      }

      if (this.gridEngine.equals(current.position, goal)) {
        return this.reconstructPath(cameFrom, goal);
      }

      for (const neighbor of this.gridEngine.neighbors(current.position)) {
        const neighborKey = this.gridEngine.key(neighbor);
        if (blocked.has(neighborKey)) {
          continue;
        }

        const tentativeGScore = (gScore.get(this.gridEngine.key(current.position)) ?? Infinity) + 1;
        if (tentativeGScore >= (gScore.get(neighborKey) ?? Infinity)) {
          continue;
        }

        cameFrom.set(neighborKey, current.position);
        gScore.set(neighborKey, tentativeGScore);
        openSet.push({
          position: neighbor,
          priority: tentativeGScore + this.gridEngine.distance(neighbor, goal)
        });
      }
    }

    throw new Error("No valid path found.");
  }

  private reconstructPath(
    cameFrom: Map<string, GridPosition>,
    goal: GridPosition
  ): GridPosition[] {
    const path: GridPosition[] = [goal];
    let current: GridPosition | undefined = goal;

    while (current) {
      const previous = cameFrom.get(this.gridEngine.key(current));
      if (!previous) {
        break;
      }

      path.unshift(previous);
      current = previous;
    }

    return path;
  }
}
