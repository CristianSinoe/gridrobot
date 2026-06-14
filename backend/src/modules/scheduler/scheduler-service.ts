import type { Server as SocketIOServer } from "socket.io";

import { env } from "../../config/env.js";
import type { SessionAccessService } from "../central-access/session-access-service.js";
import type { RobotService } from "../robots/robot-service.js";
import type { GridManager } from "../grid/grid-manager.js";
import type { ObstacleManager } from "../obstacles/obstacle-manager.js";
import type { TaskService } from "../tasks/task-service.js";
import type { WorldVisibilityService } from "../world-visibility/world-visibility-service.js";
import type { SystemModeService } from "../system/system-mode-service.js";
import {
  buildWorldPayload,
  emitObstaclesToAllViewers,
  emitPreviewRoutesToAllViewers,
  emitTasksToAllViewers,
  getFocusedRobotIdForSocket
} from "../websocket/socket-gateway.js";
import type { PreviewRouteService } from "../preview-routes/preview-route-service.js";
import type { MqttBridgeService } from "../mqtt/mqtt-bridge-service.js";

export class SchedulerService {
  private timer: NodeJS.Timeout | null = null;
  private tick = 0;
  private isRunningTick = false;
  private isPaused = false;

  public constructor(
    private readonly tickRateHz: number,
    private readonly sessionAccessService: SessionAccessService,
    private readonly robotService: RobotService,
    private readonly gridManager: GridManager,
    private readonly obstacleManager: ObstacleManager,
    private readonly taskService: TaskService,
    private readonly worldVisibilityService: WorldVisibilityService,
    private readonly previewRouteService: PreviewRouteService,
    private readonly io: SocketIOServer,
    private readonly systemModeService: SystemModeService,
    private readonly mqttBridgeService: MqttBridgeService
  ) {}

  public start(): void {
    if (this.timer) {
      return;
    }

    const intervalMs = Math.floor(1000 / this.tickRateHz);
    this.timer = setInterval(() => {
      void this.runTick();
    }, intervalMs);
  }

  public stop(): void {
    if (!this.timer) {
      return;
    }

    clearInterval(this.timer);
    this.timer = null;
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    this.isPaused = false;
  }

  private async runTick(): Promise<void> {
    if (this.isRunningTick || this.isPaused || this.systemModeService.isGameMode()) {
      return;
    }

    this.isRunningTick = true;

    try {
      this.tick += 1;
      const dependencies = {
        sessionAccessService: this.sessionAccessService,
        robotService: this.robotService,
        obstacleManager: this.obstacleManager,
        gridManager: this.gridManager,
        taskService: this.taskService,
        worldVisibilityService: this.worldVisibilityService,
        previewRouteService: this.previewRouteService
      };
      await this.robotService.tick(this.tickRateHz);
      await this.taskService.handleRobotProgress();

      if (
        env.DYNAMIC_OBSTACLES_ENABLED &&
        (this.tick === 1 || this.tick % env.DYNAMIC_OBSTACLE_TICK_INTERVAL === 0)
      ) {
        const movedObstacles = await this.obstacleManager.moveDynamicObstacles(
          this.robotService.getAll().map((robot) => robot.position),
          env.DYNAMIC_OBSTACLE_MOVE_CHANCE
        );

        if (movedObstacles.length > 0) {
          movedObstacles.forEach((movement) =>
            this.worldVisibilityService.handleObstacleMoved(movement.from, movement.to)
          );
          await this.robotService.recalculateRoutesForObstacles();
          await this.previewRouteService.recalculateAll();
          await emitPreviewRoutesToAllViewers(this.io, dependencies);
        }
      }

      if (env.ROBOT_FAILURES_ENABLED) {
        const failures = await this.taskService.simulateRandomFailures(
          this.tick,
          env.ROBOT_FAILURE_CHANCE_PER_TICK,
          env.ROBOT_FAILURE_MIN_TICKS_BETWEEN_EVENTS
        );

        if (failures.tasks.length > 0) {
          await emitTasksToAllViewers(this.io, dependencies);
          await emitPreviewRoutesToAllViewers(this.io, dependencies);
        }
      }

      if (this.tick === 1 || this.tick % this.tickRateHz === 0) {
        await this.taskService.ensureAutomaticTasks();
      }

      if (this.tick === 1 || this.tick % (this.tickRateHz * 2) === 0) {
        this.robotService
          .getAll()
          .filter((robot) => robot.isActive && robot.status !== "OFFLINE")
          .forEach((robot) => this.mqttBridgeService.publishRobotTelemetry(robot.id));
      }

      const discoveries = this.worldVisibilityService.refreshDiscoveries();

      for (const socket of this.io.sockets.sockets.values()) {
        const token =
          typeof socket.handshake.auth.sessionToken === "string" ? socket.handshake.auth.sessionToken : "";
        const session = this.sessionAccessService.getSessionByToken(token);
        if (!session) {
          continue;
        }

        const payload = await buildWorldPayload(
          dependencies,
          session.role === "central"
            ? { role: "central", nodeId: null, robotId: null }
            : {
                role: "operator",
                nodeId: session.nodeId!,
                robotId: getFocusedRobotIdForSocket(socket.id)
              },
          this.tick,
          false
        );
        socket.emit("world:snapshot", payload);
      }

      if (discoveries.length > 0) {
        await emitObstaclesToAllViewers(this.io, dependencies);
      }

      if (this.tick === 1 || this.tick % this.tickRateHz === 0) {
        await emitTasksToAllViewers(this.io, dependencies);
      }
    } finally {
      this.isRunningTick = false;
    }
  }
}
