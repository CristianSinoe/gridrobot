import type { Robot, Task } from "@prisma/client";

import type { RobotSupport } from "../robots/robot-catalog.js";

export class TaskCompatibilityService {
  public isRobotCompatible(robot: Robot, task: Task): boolean {
    const supports = robot.supports as unknown as RobotSupport[];

    const supportsUnit =
      task.loadTypeRequired === "UNIT_LOAD" && supports.includes("UNIT_LOAD");
    const supportsBulk =
      task.loadTypeRequired === "BULK_LOAD" && supports.includes("BULK_LOAD");

    const loadCompatible = supportsUnit || supportsBulk;
    if (!loadCompatible) {
      return false;
    }

    if (task.requiresRefrigeration && !supports.includes("REFRIGERATED")) {
      return false;
    }

    if (task.requiresFragileHandling && !supports.includes("FRAGILE")) {
      return false;
    }

    if (robot.capacityUnit !== task.amountUnit) {
      return false;
    }

    if ((robot.capacityValue ?? 0) < task.requiredAmount) {
      return false;
    }

    return robot.isActive && robot.catalogStatus !== "mantenimiento";
  }
}
