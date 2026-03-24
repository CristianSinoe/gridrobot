import { Router } from "express";

import { getHealth } from "./controllers/health-controller.js";
import type { ObstacleController } from "./controllers/obstacle-controller.js";
import type { RobotController } from "./controllers/robot-controller.js";
import type { SessionController } from "./controllers/session-controller.js";
import type { TaskController } from "./controllers/task-controller.js";
import { asyncHandler } from "./middlewares/async-handler.js";

export interface RouteControllers {
  sessionController: SessionController;
  robotController: RobotController;
  taskController: TaskController;
  obstacleController: ObstacleController;
}

export const createRoutes = (controllers: RouteControllers): Router => {
  const router = Router();

  router.get("/health", getHealth);
  router.get("/sessions", controllers.sessionController.status);
  router.post("/sessions/central/login", controllers.sessionController.loginCentral);
  router.post("/sessions/operator/login", controllers.sessionController.loginOperator);
  router.post("/sessions/logout", controllers.sessionController.logout);
  router.post("/sessions/release", controllers.sessionController.release);
  router.get("/robots", controllers.robotController.list);
  router.get("/tasks", asyncHandler(controllers.taskController.list));
  router.post("/tasks", asyncHandler(controllers.taskController.create));
  router.post("/tasks/:taskId/assign", asyncHandler(controllers.taskController.assign));
  router.post("/tasks/:taskId/start", asyncHandler(controllers.taskController.start));
  router.post("/tasks/:taskId/cancel", asyncHandler(controllers.taskController.cancelPreparation));
  router.get("/obstacles", controllers.obstacleController.list);
  router.post("/obstacles", asyncHandler(controllers.obstacleController.upsert));
  router.delete("/obstacles", asyncHandler(controllers.obstacleController.remove));

  return router;
};
