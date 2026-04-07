import http from "node:http";

import mqtt from "mqtt";

import { createApp } from "./app.js";
import { ObstacleController } from "./api/controllers/obstacle-controller.js";
import { RobotController } from "./api/controllers/robot-controller.js";
import { SessionController } from "./api/controllers/session-controller.js";
import { TaskController } from "./api/controllers/task-controller.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { GridManager } from "./modules/grid/grid-manager.js";
import { DevelopmentBootstrapService } from "./modules/bootstrap/development-bootstrap-service.js";
import { ObstacleManager } from "./modules/obstacles/obstacle-manager.js";
import { PathfindingService } from "./modules/pathfinding/pathfinding-service.js";
import { PreviewRouteService } from "./modules/preview-routes/preview-route-service.js";
import { RobotService } from "./modules/robots/robot-service.js";
import { SchedulerService } from "./modules/scheduler/scheduler-service.js";
import { TaskService } from "./modules/tasks/task-service.js";
import { createSocketGateway } from "./modules/websocket/socket-gateway.js";
import { WorldVisibilityService } from "./modules/world-visibility/world-visibility-service.js";
import { SessionAccessService } from "./modules/central-access/session-access-service.js";
import { prisma } from "./persistence/prisma.js";

const bootstrap = async (): Promise<void> => {
  const mqttClient = mqtt.connect(env.MQTT_URL);
  const gridManager = new GridManager({ width: 40, height: 25 });
  const bootstrapService = new DevelopmentBootstrapService(prisma, gridManager);
  await bootstrapService.bootstrap();
  const obstacleManager = new ObstacleManager(gridManager, prisma, mqttClient);
  const pathfindingService = new PathfindingService(gridManager, obstacleManager);
  const robotService = new RobotService(prisma, pathfindingService);
  const taskService = new TaskService(prisma, robotService, gridManager, obstacleManager);
  const previewRouteService = new PreviewRouteService(prisma, robotService, pathfindingService);
  const sessionAccessService = new SessionAccessService(
    env.CENTRAL_DASHBOARD_PASSWORD,
    env.CENTRAL_SESSION_GRACE_MS
  );

  await obstacleManager.bootstrap();
  await robotService.bootstrap();
  const worldVisibilityService = new WorldVisibilityService(
    gridManager,
    obstacleManager,
    robotService,
    env.OBSTACLE_FOV_RADIUS
  );
  worldVisibilityService.bootstrap();

  const app = createApp({
    sessionController: new SessionController(sessionAccessService),
    robotController: new RobotController(robotService),
    taskController: new TaskController(taskService, sessionAccessService, robotService, previewRouteService),
    obstacleController: new ObstacleController(
      obstacleManager,
      robotService,
      worldVisibilityService,
      sessionAccessService,
      previewRouteService
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
    previewRouteService
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
    io
  );

  scheduler.start();

  httpServer.listen(env.PORT, () => {
    logger.info(`GRIDROBOT backend listening on port ${env.PORT}.`);
  });

  const shutdown = async (): Promise<void> => {
    scheduler.stop();
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
