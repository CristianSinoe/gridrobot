import { CollisionScheduler } from "../collision-scheduler/collision-scheduler.js";
import { GridEngine } from "../grid-engine/grid-engine.js";
import { PathfindingService } from "../pathfinding-service/pathfinding-service.js";
import { RobotRegistry } from "../robot-model/robot-model.js";
import type {
  GridPosition,
  Obstacle,
  PendingObstacleChange,
  RobotCommand,
  RobotModel,
  SimulationConfig,
  SimulationEvent,
  SimulationTickResult
} from "../types.js";

export class SimulationEngine {
  private readonly gridEngine: GridEngine;
  private readonly robotRegistry: RobotRegistry;
  private readonly pathfindingService: PathfindingService;
  private readonly collisionScheduler: CollisionScheduler;
  private readonly obstacles = new Map<string, Obstacle>();
  private readonly pendingCommands: RobotCommand[] = [];
  private readonly pendingObstacleChanges: PendingObstacleChange[] = [];
  private readonly tickIntervalMs: number;
  private timer: NodeJS.Timeout | null = null;
  private runningTick = false;
  private tick = 0;

  public constructor(config: SimulationConfig) {
    this.gridEngine = new GridEngine(config.grid);
    this.robotRegistry = new RobotRegistry(this.gridEngine);
    this.pathfindingService = new PathfindingService(this.gridEngine);
    this.collisionScheduler = new CollisionScheduler(this.gridEngine);
    this.tickIntervalMs = Math.floor(1000 / (config.tickRateHz ?? 20));
  }

  public registerRobot(
    robot: Omit<RobotModel, "path" | "status" | "goal" | "lastUpdatedTick" | "blockedReason">
  ): RobotModel {
    const nextRobot = this.robotRegistry.register(robot);
    return nextRobot;
  }

  public getTick(): number {
    return this.tick;
  }

  public getTickRateHz(): number {
    return Math.floor(1000 / this.tickIntervalMs);
  }

  public getSnapshot(): SimulationTickResult {
    return {
      tick: this.tick,
      robots: this.getRobots(),
      obstacles: this.getObstacles(),
      events: []
    };
  }

  public start(onTick?: (result: SimulationTickResult) => void): void {
    if (this.timer) {
      return;
    }

    this.timer = setInterval(() => {
      if (this.runningTick) {
        return;
      }

      void this.step()
        .then((result) => {
          onTick?.(result);
        })
        .catch(() => {
          return;
        });
    }, this.tickIntervalMs);
  }

  public stop(): void {
    if (!this.timer) {
      return;
    }

    clearInterval(this.timer);
    this.timer = null;
  }

  public queueCommand(command: RobotCommand): void {
    this.pendingCommands.push(command);
  }

  public discoverObstacle(position: GridPosition, type: Obstacle["type"] = "DYNAMIC"): void {
    if (!this.gridEngine.isWithinBounds(position)) {
      throw new Error("Obstacle position is outside of the grid.");
    }

    this.pendingObstacleChanges.push({
      type: "DISCOVER",
      position: { ...position },
      obstacleType: type
    });
  }

  public removeObstacle(position: GridPosition): void {
    this.pendingObstacleChanges.push({
      type: "REMOVE",
      position: { ...position },
      obstacleType: "DYNAMIC"
    });
  }

  public getRobots(): RobotModel[] {
    return this.robotRegistry.list();
  }

  public getObstacles(): Obstacle[] {
    return Array.from(this.obstacles.values()).map((obstacle) => ({
      ...obstacle,
      position: { ...obstacle.position }
    }));
  }

  public async step(): Promise<SimulationTickResult> {
    if (this.runningTick) {
      throw new Error("Simulation tick is already running.");
    }

    this.runningTick = true;
    this.tick += 1;

    try {
      const events: SimulationEvent[] = [];
      this.processObstacleChanges(events);
      this.processCommands(events);
      this.recalculateRoutesForDynamicObstacles(events);
      this.resolveMovement(events);

      return {
        tick: this.tick,
        robots: this.getRobots(),
        obstacles: this.getObstacles(),
        events
      };
    } finally {
      this.runningTick = false;
    }
  }

  private processObstacleChanges(events: SimulationEvent[]): void {
    while (this.pendingObstacleChanges.length > 0) {
      const change = this.pendingObstacleChanges.shift();
      if (!change) {
        continue;
      }

      const key = this.gridEngine.key(change.position);

      if (change.type === "DISCOVER") {
        this.obstacles.set(key, {
          id: key,
          position: { ...change.position },
          type: change.obstacleType,
          discoveredAtTick: this.tick
        });

        events.push({
          type: "OBSTACLE_DISCOVERED",
          tick: this.tick,
          message: `Obstacle discovered at (${change.position.x}, ${change.position.y}).`,
          metadata: { position: change.position, obstacleType: change.obstacleType }
        });
        continue;
      }

      if (this.obstacles.delete(key)) {
        events.push({
          type: "OBSTACLE_REMOVED",
          tick: this.tick,
          message: `Obstacle removed from (${change.position.x}, ${change.position.y}).`,
          metadata: { position: change.position }
        });
      }
    }
  }

  private processCommands(events: SimulationEvent[]): void {
    while (this.pendingCommands.length > 0) {
      const command = this.pendingCommands.shift();
      if (!command) {
        continue;
      }

      const robot = this.robotRegistry.get(command.robotId);

      try {
        const path = this.pathfindingService.findPath(robot.position, command.target, {
          blockedPositions: this.getObstaclePositions(),
          reservedPositions: this.getOccupiedPositions(robot.id)
        });

        this.robotRegistry.setRoute(robot.id, command.target, path, this.tick);
        events.push({
          type: "COMMAND_ACCEPTED",
          tick: this.tick,
          robotId: robot.id,
          message: `Accepted route command for ${robot.name}.`,
          metadata: { target: command.target, pathLength: path.length }
        });
      } catch (error) {
        this.robotRegistry.block(robot.id, error instanceof Error ? error.message : "Route rejected.", this.tick);
        events.push({
          type: "COMMAND_REJECTED",
          tick: this.tick,
          robotId: robot.id,
          message: error instanceof Error ? error.message : "Command rejected."
        });
      }
    }
  }

  private recalculateRoutesForDynamicObstacles(events: SimulationEvent[]): void {
    const blockedPositions = this.getObstaclePositions();

    for (const robot of this.robotRegistry.list()) {
      if (!robot.goal) {
        continue;
      }

      const pathHasBlockedCell = robot.path.slice(1).some((node) =>
        blockedPositions.some((obstacle) => this.gridEngine.equals(obstacle, node))
      );

      if (!pathHasBlockedCell) {
        continue;
      }

      try {
        const recalculatedPath = this.pathfindingService.findPath(robot.position, robot.goal, {
          blockedPositions,
          reservedPositions: this.getOccupiedPositions(robot.id)
        });

        this.robotRegistry.setRoute(robot.id, robot.goal, recalculatedPath, this.tick);
        events.push({
          type: "ROUTE_RECALCULATED",
          tick: this.tick,
          robotId: robot.id,
          message: `Route recalculated for ${robot.name}.`,
          metadata: { pathLength: recalculatedPath.length }
        });
      } catch (error) {
        this.robotRegistry.block(
          robot.id,
          error instanceof Error ? error.message : "Route unavailable.",
          this.tick
        );
        events.push({
          type: "ROUTE_UNAVAILABLE",
          tick: this.tick,
          robotId: robot.id,
          message: error instanceof Error ? error.message : "No alternate route available."
        });
      }
    }
  }

  private resolveMovement(events: SimulationEvent[]): void {
    const intents = this.robotRegistry
      .list()
      .map((robot) => this.robotRegistry.buildMoveIntent(robot.id))
      .filter((intent): intent is NonNullable<typeof intent> => intent !== null)
      .filter((intent) => !this.isBlockedByObstacle(intent.to));

    const blockedByObstacle = this.robotRegistry
      .list()
      .map((robot) => this.robotRegistry.buildMoveIntent(robot.id))
      .filter((intent): intent is NonNullable<typeof intent> => intent !== null)
      .filter((intent) => this.isBlockedByObstacle(intent.to));

    for (const intent of blockedByObstacle) {
      this.robotRegistry.wait(intent.robotId, this.tick, "Obstacle detected on next cell.");
      events.push({
        type: "ROBOT_WAITING",
        tick: this.tick,
        robotId: intent.robotId,
        message: "Robot paused because the next cell is now blocked."
      });
    }

    const decisions = this.collisionScheduler.resolve(intents);

    for (const denied of decisions.waiting) {
      this.robotRegistry.wait(denied.robotId, this.tick, denied.reason);
      events.push({
        type: "CONFLICT_RESOLVED",
        tick: this.tick,
        robotId: denied.robotId,
        message: denied.reason
      });
    }

    for (const move of decisions.allowed) {
      const robot = this.robotRegistry.applyMove(move.robotId, this.tick);
      events.push({
        type: "ROBOT_MOVED",
        tick: this.tick,
        robotId: robot.id,
        message: `${robot.name} moved to (${robot.position.x}, ${robot.position.y}).`,
        metadata: { position: robot.position }
      });
    }
  }

  private getObstaclePositions(): GridPosition[] {
    return this.getObstacles().map((obstacle) => obstacle.position);
  }

  private getOccupiedPositions(excludedRobotId?: string): GridPosition[] {
    return this.robotRegistry
      .list()
      .filter((robot) => robot.id !== excludedRobotId)
      .map((robot) => robot.position);
  }

  private isBlockedByObstacle(position: GridPosition): boolean {
    return this.obstacles.has(this.gridEngine.key(position));
  }
}
