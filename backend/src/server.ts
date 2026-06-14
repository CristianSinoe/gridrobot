import http from "node:http";

import mqtt from "mqtt";

import { createApp } from "./app.js";
import { HealthController } from "./api/controllers/health-controller.js";
import { HistoryController } from "./api/controllers/history-controller.js";
import { ObstacleController } from "./api/controllers/obstacle-controller.js";
import { OperatorController } from "./api/controllers/operator-controller.js";
import { RobotController } from "./api/controllers/robot-controller.js";
import { SessionController } from "./api/controllers/session-controller.js";
import { TaskController } from "./api/controllers/task-controller.js";
import { env } from "./config/env.js";
import { MQTT_TOPICS } from "./config/constants.js";
import { logger } from "./config/logger.js";
import { GridManager } from "./modules/grid/grid-manager.js";
import { DevelopmentBootstrapService } from "./modules/bootstrap/development-bootstrap-service.js";
import { GameLoop } from "./modules/game/game-loop.js";
import { createGameRouter } from "./modules/game/game-router.js";
import { createGameSocketNamespace } from "./modules/game/game-socket-handler.js";
import { GameService } from "./modules/game/game-service.js";
import { GameState } from "./modules/game/game-state.js";
import { ObstacleManager } from "./modules/obstacles/obstacle-manager.js";
import { PathfindingService } from "./modules/pathfinding/pathfinding-service.js";
import { PreviewRouteService } from "./modules/preview-routes/preview-route-service.js";
import { EventLogService } from "./modules/events/event-log-service.js";
import { HealthService } from "./modules/health/health-service.js";
import { MqttBridgeService } from "./modules/mqtt/mqtt-bridge-service.js";
import { OperatorService } from "./modules/operators/operator-service.js";
import { RobotService } from "./modules/robots/robot-service.js";
import { SchedulerService } from "./modules/scheduler/scheduler-service.js";
import { TaskService } from "./modules/tasks/task-service.js";
import { SystemModeService } from "./modules/system/system-mode-service.js";
import { createSocketGateway } from "./modules/websocket/socket-gateway.js";
import { SocketConnectionLimiter } from "./modules/websocket/socket-security.js";
import { WorldVisibilityService } from "./modules/world-visibility/world-visibility-service.js";
import { SessionAccessService } from "./modules/central-access/session-access-service.js";
import { RobotTelemetryService } from "./modules/telemetry/robot-telemetry-service.js";
import { prisma } from "./persistence/prisma.js";

const bootstrap = async (): Promise<void> => {
  const mqttClient = mqtt.connect(env.MQTT_URL);
  const eventLogService = new EventLogService(prisma);
  const robotTelemetryService = new RobotTelemetryService(prisma);
  const gridManager = new GridManager({
    width: env.WAREHOUSE_GRID_WIDTH,
    height: env.WAREHOUSE_GRID_HEIGHT
  });
  const obstacleManager = new ObstacleManager(gridManager, prisma, eventLogService, mqttClient);
  const pathfindingService = new PathfindingService(gridManager, obstacleManager);
  const robotService = new RobotService(prisma, pathfindingService);
  const mqttBridgeService = new MqttBridgeService(
    mqttClient,
    eventLogService,
    robotService,
    robotTelemetryService
  );
  const bootstrapService = new DevelopmentBootstrapService(prisma, gridManager);
  await bootstrapService.bootstrap();
  const operatorService = new OperatorService(prisma);
  const taskService = new TaskService(prisma, robotService, gridManager, obstacleManager, eventLogService);
  const previewRouteService = new PreviewRouteService(prisma, robotService, pathfindingService);
  const sessionAccessService = new SessionAccessService(
    env.CENTRAL_DASHBOARD_PASSWORD,
    env.CENTRAL_SESSION_GRACE_MS
  );
  const systemModeService = new SystemModeService();
  const healthService = new HealthService(prisma, mqttBridgeService, systemModeService);
  const socketConnectionLimiter = new SocketConnectionLimiter();

  await obstacleManager.bootstrap();
  await robotService.bootstrap();
  const worldVisibilityService = new WorldVisibilityService(
    gridManager,
    obstacleManager,
    robotService,
    env.OBSTACLE_FOV_RADIUS
  );
  worldVisibilityService.bootstrap();
  const gameService = new GameService(
    new GameState({
      grid: {
        width: env.GAME_GRID_WIDTH,
        height: env.GAME_GRID_HEIGHT,
        tickRateHz: env.GAME_TICK_RATE_HZ
      }
    }),
    robotService,
    {
      initialLives: env.GAME_INITIAL_LIVES,
      maxLives: env.GAME_MAX_LIVES,
      normalItems: env.GAME_NORMAL_ITEMS,
      normalPoints: env.GAME_NORMAL_POINTS,
      bonusPoints: env.GAME_BONUS_POINTS,
      lifeItems: env.GAME_LIFE_ITEMS,
      obstacles: env.GAME_OBSTACLES,
      bonusItems: env.GAME_BONUS_ITEMS,
      invulnerableMs: env.GAME_INVULNERABLE_MS
    }
  );

  const app = createApp({
    healthController: new HealthController(healthService),
    sessionController: new SessionController(sessionAccessService, operatorService, systemModeService),
    robotController: new RobotController(
      robotService,
      sessionAccessService,
      systemModeService,
      mqttBridgeService
    ),
    operatorController: new OperatorController(operatorService, sessionAccessService),
    historyController: new HistoryController(
      eventLogService,
      sessionAccessService,
      robotTelemetryService
    ),
    taskController: new TaskController(
      taskService,
      sessionAccessService,
      robotService,
      previewRouteService,
      systemModeService
    ),
    obstacleController: new ObstacleController(
      obstacleManager,
      robotService,
      worldVisibilityService,
      sessionAccessService,
      previewRouteService,
      systemModeService
    ),
    extraRouter: createGameRouter(
      sessionAccessService,
      systemModeService,
      gameService
    )
  });

  const httpServer = http.createServer(app);
  const io = createSocketGateway(httpServer, {
    sessionAccessService,
    robotService,
    obstacleManager,
    gridManager,
    taskService,
    worldVisibilityService,
      previewRouteService,
      systemModeService,
      gameService,
      socketConnectionLimiter,
      mqttBridgeService
    });
  const gameNamespace = createGameSocketNamespace(io, {
    sessionAccessService,
    systemModeService,
    gameService,
    socketConnectionLimiter
  });
  const unsubscribeAdminGameBroadcast = gameService.subscribe((_eventName, snapshot) => {
    io.emit("game:state", snapshot);
    io.emit("game:leaderboard", snapshot.leaderboard);
  });

  const scheduler = new SchedulerService(
    env.TICK_RATE_HZ,
    sessionAccessService,
    robotService,
    gridManager,
    obstacleManager,
    taskService,
    worldVisibilityService,
    previewRouteService,
    io,
    systemModeService,
    mqttBridgeService
  );
  const gameLoop = new GameLoop(env.GAME_TICK_RATE_HZ, gameService);

  systemModeService.onChange(async (nextMode) => {
    if (nextMode === "GAME") {
      scheduler.pause();
      gameService.resetWorld();
      gameLoop.start();

      for (const socket of io.sockets.sockets.values()) {
        const token =
          typeof socket.handshake.auth.sessionToken === "string" ? socket.handshake.auth.sessionToken : "";
        const session = sessionAccessService.getSessionByToken(token);
        if (!session || session.role === "central") {
          continue;
        }

        socket.emit("gateway:error", {
          message: "El sistema está en modo juego. Esta acción no está disponible."
        });
        socket.disconnect(true);
      }
    } else {
      gameLoop.stop();
      gameService.resetWorld();
      scheduler.resume();
    }

    io.emit("system:modeChanged", { mode: nextMode });
    gameNamespace.emitModeChanged(nextMode);
  });

  scheduler.start();

  const unsubscribeEventLogStream = eventLogService.subscribe((event) => {
    if (
      event.type === "TASK_CREATED" ||
      event.type === "TASK_ASSIGNED" ||
      event.type === "TASK_STARTED" ||
      event.type === "TASK_COMPLETED"
    ) {
      mqttBridgeService.publishTaskEvent(event.taskId ?? "sin-tarea", {
        type: event.type,
        source: event.source,
        robotId: event.robotId,
        payload: event.payload,
        topic: MQTT_TOPICS.tasksEvents
      });
    }

    io.emit("history:event", {
      id: event.id,
      type: event.type,
      source: event.source,
      topic: event.topic,
      robotId: event.robotId,
      taskId: event.taskId,
      payload: event.payload,
      createdAt: event.createdAt.toISOString()
    });
  });

  const unsubscribeMqttStatus = mqttBridgeService.subscribeToStatus((state) => {
    io.emit("network:status", {
      mqttConnectionState: state
    });

    if (state === "connected") {
      for (const robot of robotService.getAll()) {
        if (!robot.isActive || robot.status === "OFFLINE") {
          continue;
        }
        mqttBridgeService.publishRobotTelemetry(robot.id);
      }
    }
  });

  const unsubscribeNetworkEvents = mqttBridgeService.subscribeToNetworkEvents((event) => {
    if (event.robotId) {
      try {
        io.emit("robot:updated", robotService.getById(event.robotId));
      } catch {
        // Ignore stale robot references in monitor stream.
      }
    }
    io.emit("network:event", event);
  });

  httpServer.listen(env.PORT, () => {
    logger.info(`GRIDROBOT backend listening on port ${env.PORT}.`);
  });

  const shutdown = async (): Promise<void> => {
    scheduler.stop();
    gameLoop.stop();
    unsubscribeEventLogStream();
    unsubscribeMqttStatus();
    unsubscribeNetworkEvents();
    unsubscribeAdminGameBroadcast();
    gameNamespace.close();
    io.close();
    mqttClient.end(true);
    await prisma.$disconnect();
    httpServer.close(() => {
      logger.info("GRIDROBOT backend stopped.");
      process.exit(0);
    });
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
};

void bootstrap().catch(async (error: unknown) => {
  logger.error({ err: error }, "Failed to bootstrap GRIDROBOT backend.");
  await prisma.$disconnect();
  process.exit(1);
});
