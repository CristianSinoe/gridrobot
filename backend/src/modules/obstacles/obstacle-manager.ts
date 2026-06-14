import type { PrismaClient } from "@prisma/client";
import type { MqttClient } from "mqtt";

import { MQTT_TOPICS } from "../../config/constants.js";
import type { GridPosition } from "../../shared/types.js";
import type { EventLogService } from "../events/event-log-service.js";
import type { GridManager } from "../grid/grid-manager.js";

interface ObstacleState {
  id: string;
  position: GridPosition;
  type: "STATIC" | "DYNAMIC" | "TEMPORARY";
  source: "MANUAL" | "SENSOR" | "SIMULATION" | "SYSTEM";
}

export class ObstacleManager {
  private readonly obstacles = new Map<string, ObstacleState>();

  public constructor(
    private readonly gridManager: GridManager,
    private readonly prisma: PrismaClient,
    private readonly eventLogService?: EventLogService,
    private readonly mqttClient?: MqttClient
  ) {}

  public async bootstrap(): Promise<void> {
    const obstacles = await this.prisma.obstacle.findMany({
      where: { isActive: true },
      orderBy: [{ x: "asc" }, { y: "asc" }]
    });

    this.obstacles.clear();

    for (const obstacle of obstacles) {
      const position = { x: obstacle.x, y: obstacle.y };
      if (this.gridManager.isWithinBounds(position)) {
        this.obstacles.set(this.gridManager.key(position), {
          id: obstacle.id,
          position,
          type: obstacle.type,
          source: obstacle.source
        });
      }
    }
  }

  public getAll(): GridPosition[] {
    return Array.from(this.obstacles.values()).map((obstacle) => obstacle.position);
  }

  public getAllStates(): ObstacleState[] {
    return Array.from(this.obstacles.values());
  }

  public isBlocked(position: GridPosition): boolean {
    return this.obstacles.has(this.gridManager.key(position));
  }

  public async replace(obstacles: GridPosition[]): Promise<GridPosition[]> {
    this.obstacles.clear();

    for (const obstacle of obstacles) {
      if (this.gridManager.isWithinBounds(obstacle)) {
        this.obstacles.set(this.gridManager.key(obstacle), {
          id: `${obstacle.x}:${obstacle.y}`,
          position: obstacle,
          type: "STATIC",
          source: "MANUAL"
        });
      }
    }

    await this.prisma.$transaction([
      this.prisma.obstacle.updateMany({
        data: { isActive: false }
      }),
      ...this.getAll().map((obstacle) =>
        this.prisma.obstacle.upsert({
          where: {
            x_y: {
              x: obstacle.x,
              y: obstacle.y
            }
          },
          create: {
            x: obstacle.x,
            y: obstacle.y,
            type: "STATIC",
            source: "MANUAL",
            isActive: true
          },
          update: {
            type: "STATIC",
            source: "MANUAL",
            isActive: true
          }
        })
      )
    ]);

    this.publish();
    return this.getAll();
  }

  public async upsert(
    position: GridPosition,
    options?: {
      type?: "STATIC" | "DYNAMIC" | "TEMPORARY";
      source?: "MANUAL" | "SENSOR" | "SIMULATION" | "SYSTEM";
    }
  ): Promise<GridPosition[]> {
    if (!this.gridManager.isWithinBounds(position)) {
      return this.getAll();
    }

    const persisted = await this.prisma.obstacle.upsert({
      where: {
        x_y: {
          x: position.x,
          y: position.y
        }
      },
      create: {
        x: position.x,
        y: position.y,
        type: options?.type ?? "STATIC",
        source: options?.source ?? "MANUAL",
        isActive: true
      },
      update: {
        type: options?.type ?? "STATIC",
        source: options?.source ?? "MANUAL",
        isActive: true
      }
    });
    this.obstacles.set(this.gridManager.key(position), {
      id: persisted.id,
      position,
      type: persisted.type,
      source: persisted.source
    });
    await this.eventLogService?.record({
      type: "OBSTACLE_DETECTED",
      source: "obstacle-manager",
      topic: MQTT_TOPICS.obstacles,
      payload: {
        obstacleId: persisted.id,
        x: position.x,
        y: position.y,
        type: persisted.type,
        source: persisted.source
      }
    });
    this.publish();
    return this.getAll();
  }

  public async remove(position: GridPosition): Promise<GridPosition[]> {
    this.obstacles.delete(this.gridManager.key(position));
    await this.prisma.obstacle.updateMany({
      where: {
        x: position.x,
        y: position.y
      },
      data: {
        isActive: false
      }
    });
    this.publish();
    return this.getAll();
  }

  public async moveDynamicObstacles(
    robotPositions: GridPosition[],
    moveChance: number
  ): Promise<Array<{ from: GridPosition; to: GridPosition }>> {
    const moved: Array<{ from: GridPosition; to: GridPosition }> = [];
    const robotKeys = new Set(robotPositions.map((position) => this.gridManager.key(position)));
    const dynamicObstacles = this.getAllStates().filter((obstacle) => obstacle.type === "DYNAMIC");

    for (const obstacle of dynamicObstacles) {
      if (Math.random() > moveChance) {
        continue;
      }

      const candidates = this.gridManager
        .getNeighbors(obstacle.position)
        .filter((candidate) => !robotKeys.has(this.gridManager.key(candidate)))
        .filter((candidate) => {
          const candidateKey = this.gridManager.key(candidate);
          return !this.obstacles.has(candidateKey) || candidateKey === this.gridManager.key(obstacle.position);
        });

      if (candidates.length === 0) {
        continue;
      }

      const nextPosition = candidates[Math.floor(Math.random() * candidates.length)];
      if (!nextPosition) {
        continue;
      }

      const previousKey = this.gridManager.key(obstacle.position);
      const nextKey = this.gridManager.key(nextPosition);

      if (previousKey === nextKey) {
        continue;
      }

      const conflictingPersistedObstacle = await this.prisma.obstacle.findFirst({
        where: {
          id: { not: obstacle.id },
          x: nextPosition.x,
          y: nextPosition.y
        },
        select: {
          id: true,
          isActive: true
        }
      });

      if (conflictingPersistedObstacle) {
        continue;
      }

      try {
        await this.prisma.obstacle.update({
          where: { id: obstacle.id },
          data: {
            x: nextPosition.x,
            y: nextPosition.y,
            source: "SIMULATION",
            detectedAt: new Date(),
            clearedAt: null
          }
        });
      } catch {
        continue;
      }

      this.obstacles.delete(previousKey);
      this.obstacles.set(nextKey, {
        ...obstacle,
        position: nextPosition
      });

      moved.push({
        from: obstacle.position,
        to: nextPosition
      });

      await this.eventLogService?.record({
        type: "OBSTACLE_MOVED",
        source: "obstacle-manager",
        topic: MQTT_TOPICS.obstacles,
        payload: {
          obstacleId: obstacle.id,
          from: {
            x: obstacle.position.x,
            y: obstacle.position.y
          },
          to: {
            x: nextPosition.x,
            y: nextPosition.y
          }
        }
      });
    }

    if (moved.length > 0) {
      this.publish();
    }

    return moved;
  }

  private publish(): void {
    if (!this.mqttClient) {
      return;
    }

    this.mqttClient.publish(
      MQTT_TOPICS.obstacles,
      JSON.stringify({
        obstacles: this.getAll(),
        publishedAt: new Date().toISOString()
      })
    );
  }
}
