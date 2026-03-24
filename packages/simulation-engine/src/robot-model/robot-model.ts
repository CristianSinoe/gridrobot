import type { GridPosition, RobotModel, RobotMoveIntent } from "../types.js";
import { GridEngine } from "../grid-engine/grid-engine.js";

export class RobotRegistry {
  private readonly robots = new Map<string, RobotModel>();

  public constructor(private readonly gridEngine: GridEngine) {}

  public register(
    robot: Omit<RobotModel, "path" | "status" | "goal" | "lastUpdatedTick" | "blockedReason">
  ): RobotModel {
    if (!this.gridEngine.isWithinBounds(robot.position)) {
      throw new Error(`Robot ${robot.id} has an invalid starting position.`);
    }

    if (this.robots.has(robot.id)) {
      throw new Error(`Robot ${robot.id} is already registered.`);
    }

    const nextRobot: RobotModel = {
      ...robot,
      position: { ...robot.position },
      goal: null,
      path: [{ ...robot.position }],
      status: "IDLE",
      lastUpdatedTick: 0,
      blockedReason: null
    };

    this.robots.set(nextRobot.id, nextRobot);
    return nextRobot;
  }

  public list(): RobotModel[] {
    return Array.from(this.robots.values()).map((robot) => ({
      ...robot,
      position: { ...robot.position },
      goal: robot.goal ? { ...robot.goal } : null,
      path: robot.path.map((node) => ({ ...node }))
    }));
  }

  public get(robotId: string): RobotModel {
    const robot = this.robots.get(robotId);
    if (!robot) {
      throw new Error(`Robot ${robotId} was not found.`);
    }

    return robot;
  }

  public setRoute(
    robotId: string,
    goal: GridPosition,
    path: GridPosition[],
    tick: number
  ): RobotModel {
    const robot = this.get(robotId);
    const nextRobot: RobotModel = {
      ...robot,
      goal: { ...goal },
      path: path.map((node) => ({ ...node })),
      status: path.length > 1 ? "MOVING" : "IDLE",
      blockedReason: null,
      lastUpdatedTick: tick
    };

    this.robots.set(robotId, nextRobot);
    return nextRobot;
  }

  public block(robotId: string, reason: string, tick: number): RobotModel {
    const robot = this.get(robotId);
    const nextRobot: RobotModel = {
      ...robot,
      status: "BLOCKED",
      blockedReason: reason,
      path: [robot.position],
      lastUpdatedTick: tick
    };

    this.robots.set(robotId, nextRobot);
    return nextRobot;
  }

  public wait(robotId: string, tick: number, reason?: string): RobotModel {
    const robot = this.get(robotId);
    const nextRobot: RobotModel = {
      ...robot,
      status: robot.goal ? "WAITING" : "IDLE",
      blockedReason: reason ?? null,
      lastUpdatedTick: tick
    };

    this.robots.set(robotId, nextRobot);
    return nextRobot;
  }

  public buildMoveIntent(robotId: string): RobotMoveIntent | null {
    const robot = this.get(robotId);

    if (robot.path.length <= 1) {
      return null;
    }

    return {
      robotId,
      from: robot.position,
      to: robot.path[1] ?? robot.position
    };
  }

  public applyMove(robotId: string, tick: number): RobotModel {
    const robot = this.get(robotId);
    const [, ...remainingPath] = robot.path;
    const nextPosition = remainingPath[0] ?? robot.position;
    const completed = remainingPath.length <= 1;

    const nextRobot: RobotModel = {
      ...robot,
      position: { ...nextPosition },
      path: remainingPath.length > 0 ? remainingPath : [nextPosition],
      goal: completed ? null : robot.goal,
      status: completed ? "IDLE" : "MOVING",
      blockedReason: null,
      lastUpdatedTick: tick
    };

    this.robots.set(robotId, nextRobot);
    return nextRobot;
  }
}
