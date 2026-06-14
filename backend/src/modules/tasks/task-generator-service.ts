import type {
  CapacityUnit,
  PrismaClient,
  Robot,
  RobotSupportCapability,
  Task,
  TaskPriority
} from "@prisma/client";

import { badRequest } from "../../shared/errors.js";
import type { GridPosition } from "../../shared/types.js";
import type { GridManager } from "../grid/grid-manager.js";

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

interface RobotProfile {
  supports: RobotSupportCapability[];
  capacityUnit: CapacityUnit | null;
  capacityValue: number | null;
}

export class TaskGeneratorService {
  private readonly random: DeterministicRandom;

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly gridManager: GridManager,
    seed: number
  ) {
    this.random = new SeededRandom(seed);
  }

  public async createAutomaticTask(blockedPositions: GridPosition[]): Promise<Task> {
    const robots = await this.prisma.robot.findMany({
      where: {
        isActive: true,
        status: { notIn: ["OFFLINE", "BLOCKED"] }
      },
      orderBy: { code: "asc" }
    });

    if (robots.length === 0) {
      throw badRequest("No hay robots activos para generar tareas automáticas.");
    }

    for (let attempt = 0; attempt < 50; attempt += 1) {
      const robot = robots[this.random.nextInt(robots.length)]!;
      const taskBlueprint = this.buildTaskBlueprint(robot);
      if (!taskBlueprint) {
        continue;
      }

      const reserved = new Set(blockedPositions.map((position) => this.gridManager.key(position)));
      const origin = this.pickAvailableCell(reserved);
      reserved.add(this.gridManager.key(origin));
      const target = this.pickAvailableCell(reserved);

      if (origin.x === target.x && origin.y === target.y) {
        continue;
      }

      const compatibleRobots = robots.filter((candidate) => this.canHandleBlueprint(candidate, taskBlueprint));
      if (compatibleRobots.length === 0) {
        continue;
      }

      return this.prisma.task.create({
        data: {
          code: `TASK-${Date.now()}-${Math.floor(this.random.next() * 10000)}`,
          name: `${taskBlueprint.type.replaceAll("_", " ")} ${origin.x},${origin.y} -> ${target.x},${target.y}`,
          description: `Tarea automática compatible con ${compatibleRobots.length} robots.`,
          type: taskBlueprint.type,
          status: "PENDING",
          priority: taskBlueprint.priority,
          executionStage: "TO_ORIGIN",
          originX: origin.x,
          originY: origin.y,
          targetX: target.x,
          targetY: target.y,
          loadTypeRequired: taskBlueprint.loadTypeRequired,
          requiresRefrigeration: taskBlueprint.requiresRefrigeration,
          requiresFragileHandling: taskBlueprint.requiresFragileHandling,
          requiredAmount: taskBlueprint.requiredAmount,
          amountUnit: taskBlueprint.amountUnit,
          robotId: null
        }
      });
    }

    throw badRequest("No se pudo generar una tarea automática válida para la flota actual.");
  }

  private buildTaskBlueprint(robot: Robot): {
    type: Task["type"];
    priority: TaskPriority;
    loadTypeRequired: RobotSupportCapability;
    requiresRefrigeration: boolean;
    requiresFragileHandling: boolean;
    requiredAmount: number;
    amountUnit: CapacityUnit;
  } | null {
    const profile: RobotProfile = {
      supports: robot.supports,
      capacityUnit: robot.capacityUnit,
      capacityValue: robot.capacityValue
    };

    if (!profile.capacityUnit || !profile.capacityValue) {
      return null;
    }

    const loadOptions = ["UNIT_LOAD", "BULK_LOAD"].filter((support) =>
      profile.supports.includes(support as RobotSupportCapability)
    ) as RobotSupportCapability[];

    if (loadOptions.length === 0) {
      return null;
    }

    const loadTypeRequired = loadOptions[this.random.nextInt(loadOptions.length)]!;
    const requiresFragileHandling = loadTypeRequired === "UNIT_LOAD" && profile.supports.includes("FRAGILE") && this.random.next() > 0.45;
    const requiresRefrigeration = loadTypeRequired === "UNIT_LOAD" && profile.supports.includes("REFRIGERATED") && this.random.next() > 0.55;
    const capacityBase = Math.max(1, profile.capacityValue);
    const requiredAmount = Math.max(1, Math.min(capacityBase, Math.floor(capacityBase * (0.35 + this.random.next() * 0.55))));
    const priority = this.pickPriority(requiredAmount, capacityBase);

    return {
      type: this.pickTaskType(loadTypeRequired, requiresRefrigeration, requiresFragileHandling),
      priority,
      loadTypeRequired,
      requiresRefrigeration,
      requiresFragileHandling,
      requiredAmount,
      amountUnit: profile.capacityUnit
    };
  }

  private canHandleBlueprint(robot: Robot, blueprint: {
    loadTypeRequired: RobotSupportCapability;
    requiresRefrigeration: boolean;
    requiresFragileHandling: boolean;
    requiredAmount: number;
    amountUnit: CapacityUnit;
  }): boolean {
    if (!robot.isActive || robot.status === "OFFLINE" || robot.status === "BLOCKED") {
      return false;
    }

    if (!robot.supports.includes(blueprint.loadTypeRequired)) {
      return false;
    }

    if (blueprint.requiresFragileHandling && !robot.supports.includes("FRAGILE")) {
      return false;
    }

    if (blueprint.requiresRefrigeration && !robot.supports.includes("REFRIGERATED")) {
      return false;
    }

    if (robot.capacityUnit !== blueprint.amountUnit) {
      return false;
    }

    return (robot.capacityValue ?? 0) >= blueprint.requiredAmount;
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

    throw badRequest("No se encontró una celda libre para generar la tarea automática.");
  }

  private pickPriority(requiredAmount: number, capacityBase: number): TaskPriority {
    const ratio = requiredAmount / Math.max(1, capacityBase);

    if (ratio >= 0.85) {
      return "CRITICAL";
    }

    if (ratio >= 0.65) {
      return "HIGH";
    }

    if (ratio >= 0.4) {
      return "NORMAL";
    }

    return "LOW";
  }

  private pickTaskType(
    loadTypeRequired: RobotSupportCapability,
    requiresRefrigeration: boolean,
    requiresFragileHandling: boolean
  ): Task["type"] {
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
