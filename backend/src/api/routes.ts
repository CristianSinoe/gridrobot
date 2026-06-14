import { Router } from "express";

import type { HealthController } from "./controllers/health-controller.js";
import type { ObstacleController } from "./controllers/obstacle-controller.js";
import type { OperatorController } from "./controllers/operator-controller.js";
import type { HistoryController } from "./controllers/history-controller.js";
import type { RobotController } from "./controllers/robot-controller.js";
import type { SessionController } from "./controllers/session-controller.js";
import type { TaskController } from "./controllers/task-controller.js";
import { asyncHandler } from "./middlewares/async-handler.js";
import { createRateLimitMiddleware } from "./middlewares/rate-limit-middleware.js";
import { env } from "../config/env.js";

export interface RouteControllers {
  healthController: HealthController;
  sessionController: SessionController;
  robotController: RobotController;
  operatorController: OperatorController;
  historyController: HistoryController;
  taskController: TaskController;
  obstacleController: ObstacleController;
  extraRouter?: Router;
}

export const createRoutes = (controllers: RouteControllers): Router => {
  const router = Router();
  const loginRateLimiter = createRateLimitMiddleware({
    maxRequests: env.LOGIN_RATE_LIMIT_MAX,
    windowMs: env.RATE_LIMIT_WINDOW_MS
  });

  router.get("/health", asyncHandler(controllers.healthController.getHealth));
  router.get("/sessions", controllers.sessionController.status);
  router.post("/sessions/central/login", loginRateLimiter, controllers.sessionController.loginCentral);
  router.post("/sessions/operator/login", loginRateLimiter, asyncHandler(controllers.sessionController.loginOperator));
  router.post("/sessions/logout", controllers.sessionController.logout);
  router.post("/sessions/release", controllers.sessionController.release);
  router.get("/robots", controllers.robotController.list);
  router.post("/robots", asyncHandler(controllers.robotController.create));
  router.put("/robots/:robotId", asyncHandler(controllers.robotController.update));
  router.patch("/robots/:robotId/status", asyncHandler(controllers.robotController.updateStatus));
  router.post("/robots/:robotId/commands", asyncHandler(controllers.robotController.sendCommand));
  router.get("/operators", asyncHandler(controllers.operatorController.list));
  router.post("/operators", asyncHandler(controllers.operatorController.create));
  router.put("/operators/:operatorId", asyncHandler(controllers.operatorController.update));
  router.patch("/operators/:operatorId/status", asyncHandler(controllers.operatorController.updateStatus));
  router.get("/tasks", asyncHandler(controllers.taskController.list));
  router.post("/tasks", asyncHandler(controllers.taskController.create));
  router.post("/tasks/:taskId/assign", asyncHandler(controllers.taskController.assign));
  router.post("/tasks/:taskId/start", asyncHandler(controllers.taskController.start));
  router.post("/tasks/:taskId/cancel", asyncHandler(controllers.taskController.cancelPreparation));
  router.get("/obstacles", controllers.obstacleController.list);
  router.post("/obstacles", asyncHandler(controllers.obstacleController.upsert));
  router.delete("/obstacles", asyncHandler(controllers.obstacleController.remove));
  router.get("/history/events", asyncHandler(controllers.historyController.listEvents));
  router.get("/history/robots/:robotId", asyncHandler(controllers.historyController.listRobotEvents));
  router.get("/history/tasks/:taskId", asyncHandler(controllers.historyController.listTaskEvents));
  router.get("/history/telemetry", asyncHandler(controllers.historyController.listTelemetry));
  router.get("/history/telemetry/:robotId", asyncHandler(controllers.historyController.listRobotTelemetry));

  return router;
};
