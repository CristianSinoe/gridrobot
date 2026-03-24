import type { PrismaClient } from "@prisma/client";

import type { GridPosition } from "../../shared/types.js";
import { GridManager } from "../grid/grid-manager.js";

class SeededRandom {
  private state: number;

  public constructor(seed: number) {
    this.state = seed >>> 0;
  }

  public next(): number {
    this.state = (1664525 * this.state + 1013904223) >>> 0;
    return this.state / 0x100000000;
  }

  public nextInt(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }
}

export class ObstacleGeneratorService {
  private readonly random: SeededRandom;

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly gridManager: GridManager,
    seed: number
  ) {
    this.random = new SeededRandom(seed);
  }

  public async ensureInitialObstacles(
    count: number,
    blockedPositions: GridPosition[]
  ): Promise<void> {
    const existingCount = await this.prisma.obstacle.count({
      where: { isActive: true }
    });

    if (existingCount > 0) {
      return;
    }

    const reserved = new Set(blockedPositions.map((position) => this.gridManager.key(position)));
    const generated: GridPosition[] = [];

    for (let attempt = 0; generated.length < count && attempt < 5000; attempt += 1) {
      const position = {
        x: this.random.nextInt(this.gridManager.getDimensions().width),
        y: this.random.nextInt(this.gridManager.getDimensions().height)
      };

      const key = this.gridManager.key(position);
      if (reserved.has(key)) {
        continue;
      }

      reserved.add(key);
      generated.push(position);
    }

    if (generated.length === 0) {
      return;
    }

    await this.prisma.obstacle.createMany({
      data: generated.map((position) => ({
        x: position.x,
        y: position.y,
        type: "DYNAMIC",
        source: "SIMULATION",
        isActive: true
      }))
    });
  }
}
