import cors from "cors";
import express, { type RequestHandler } from "express";
import type { Router } from "express";
import pinoHttpModule from "pino-http";

import { createRoutes } from "./api/routes.js";
import { errorMiddleware } from "./api/middlewares/error-middleware.js";
import { createRateLimitMiddleware } from "./api/middlewares/rate-limit-middleware.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { buildCorsOptions } from "./config/network.js";
import type { HealthController } from "./api/controllers/health-controller.js";
import type { ObstacleController } from "./api/controllers/obstacle-controller.js";
import type { OperatorController } from "./api/controllers/operator-controller.js";
import type { HistoryController } from "./api/controllers/history-controller.js";
import type { RobotController } from "./api/controllers/robot-controller.js";
import type { SessionController } from "./api/controllers/session-controller.js";
import type { TaskController } from "./api/controllers/task-controller.js";

export interface AppControllers {
  healthController: HealthController;
  sessionController: SessionController;
  robotController: RobotController;
  operatorController: OperatorController;
  historyController: HistoryController;
  taskController: TaskController;
  obstacleController: ObstacleController;
  extraRouter?: Router;
}

export const createApp = (controllers: AppControllers) => {
  const app = express();
  const pinoHttp =
    (typeof pinoHttpModule === "function"
      ? pinoHttpModule
      : "default" in pinoHttpModule
        ? pinoHttpModule.default
        : null) as ((options: { logger: typeof logger }) => RequestHandler) | null;

  if (env.TRUST_PROXY) {
    app.set("trust proxy", true);
  }

  app.use(
    cors(buildCorsOptions())
  );
  app.use(express.json());
  if (pinoHttp) {
    app.use(pinoHttp({ logger }));
  }
  app.use(
    "/api",
    createRateLimitMiddleware({
      maxRequests: env.RATE_LIMIT_MAX,
      windowMs: env.RATE_LIMIT_WINDOW_MS
    })
  );
  app.use("/api", createRoutes(controllers));
  if (controllers.extraRouter) {
    app.use("/api", controllers.extraRouter);
  }
  app.use(errorMiddleware);

  return app;
};
