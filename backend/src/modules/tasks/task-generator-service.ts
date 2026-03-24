import type { CapacityUnit, PrismaClient, Robot, RobotSupportCapability, Task } from "@prisma/client";

import type { GridPosition } from "../../shared/types.js";
import { GridManager } from "../grid/grid-manager.js";

interface DeterministicRandom {
  next(): number;
  nextInt(maxExclusive: number): number;
}

class SeededRandom implements DeterministicRandom {
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

const TASK_TYPES = [
  "MOVE_BOXES",
  "MOVE_BOTTLES",
  "MOVE_SAND",
  "MOVE_GRAVEL",
  "MOVE_LIQUID_BULK",
  "MOVE_COLD_PRODUCTS",
  "MOVE_FRAGILE_PRODUCTS"
] as const;

const LOAD_CAPABILITIES: RobotSupportCapability[] = ["BULK_LOAD", "UNIT_LOAD"];

export class TaskGeneratorService {
  private readonly random: DeterministicRandom;

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly gridManager: GridManager,
    seed: number
  ) {
    this.random = new SeededRandom(seed);
  }

  public async createCompatibleTaskForRobot(
    robot: Robot,
    blockedPositions: GridPosition[]
  ): Promise<Task> {
    const reserved = new Set(blockedPositions.map((position) => this.gridManager.key(position)));
    const origin = this.pickAvailableCell(reserved);
    reserved.add(this.gridManager.key(origin));
    const target = this.pickAvailableCell(reserved);

    const requiresFragileHandling = robot.supports.includes("FRAGILE");
    const requiresRefrigeration = robot.supports.includes("REFRIGERATED") && this.random.next() > 0.5;
    const loadTypeRequired = robot.supports.includes("BULK_LOAD") && robot.capacityUnit === "kg"
      ? this.pickOne<RobotSupportCapability>(LOAD_CAPABILITIES.filter((value) => robot.supports.includes(value)))
      : "UNIT_LOAD";

    const requiredAmount = Math.max(
      1,
      Math.min(
        robot.capacityValue ?? 1,
        Math.floor((robot.capacityValue ?? 1) * (0.45 + this.random.next() * 0.4))
      )
    );

    const type = this.pickTaskType(loadTypeRequired, requiresRefrigeration, requiresFragileHandling);

    return this.prisma.task.create({
      data: {
        code: `TASK-${Date.now()}-${Math.floor(this.random.next() * 10000)}`,
        name: `${type.replaceAll("_", " ")} ${origin.x},${origin.y} -> ${target.x},${target.y}`,
        description: `Auto-generated task for ${robot.code}`,
        type,
        status: "PENDING",
        priority: this.pickPriority(requiredAmount),
        executionStage: "TO_ORIGIN",
        originX: origin.x,
        originY: origin.y,
        targetX: target.x,
        targetY: target.y,
        loadTypeRequired,
        requiresRefrigeration,
        requiresFragileHandling,
        requiredAmount,
        amountUnit: robot.capacityUnit as CapacityUnit,
        robotId: null
      }
    });
  }

  private pickAvailableCell(reserved: Set<string>): GridPosition {
    for (let attempt = 0; attempt < 3000; attempt += 1) {
      const position = {
        x: this.random.nextInt(this.gridManager.getDimensions().width),
        y: this.random.nextInt(this.gridManager.getDimensions().height)
      };

      if (!reserved.has(this.gridManager.key(position))) {
        return position;
      }
    }

    throw new Error("Unable to generate a non-blocked task position.");
  }

  private pickPriority(requiredAmount: number): "LOW" | "NORMAL" | "HIGH" | "CRITICAL" {
    if (requiredAmount >= 150) {
      return "CRITICAL";
    }

    if (requiredAmount >= 90) {
      return "HIGH";
    }

    if (requiredAmount >= 40) {
      return "NORMAL";
    }

    return "LOW";
  }

  private pickTaskType(
    loadTypeRequired: RobotSupportCapability,
    requiresRefrigeration: boolean,
    requiresFragileHandling: boolean
  ): (typeof TASK_TYPES)[number] {
    if (requiresRefrigeration && requiresFragileHandling) {
      return this.pickOne(["MOVE_COLD_PRODUCTS", "MOVE_BOTTLES"]);
    }

    if (requiresRefrigeration) {
      return "MOVE_COLD_PRODUCTS";
    }

    if (requiresFragileHandling) {
      return this.pickOne(["MOVE_FRAGILE_PRODUCTS", "MOVE_BOTTLES"]);
    }

    if (loadTypeRequired === "BULK_LOAD") {
      return this.pickOne(["MOVE_SAND", "MOVE_GRAVEL", "MOVE_LIQUID_BULK"]);
    }

    return this.pickOne(["MOVE_BOXES", "MOVE_BOTTLES"]);
  }

  private pickOne<T>(values: readonly T[]): T {
    return values[this.random.nextInt(values.length)] as T;
  }
}
