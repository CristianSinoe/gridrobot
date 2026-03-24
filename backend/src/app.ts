import cors from "cors";
import express, { type RequestHandler } from "express";
import pinoHttpModule from "pino-http";

import { createRoutes } from "./api/routes.js";
import { errorMiddleware } from "./api/middlewares/error-middleware.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import type { ObstacleController } from "./api/controllers/obstacle-controller.js";
import type { RobotController } from "./api/controllers/robot-controller.js";
import type { SessionController } from "./api/controllers/session-controller.js";
import type { TaskController } from "./api/controllers/task-controller.js";

export interface AppControllers {
  sessionController: SessionController;
  robotController: RobotController;
  taskController: TaskController;
  obstacleController: ObstacleController;
}

export const createApp = (controllers: AppControllers) => {
  const app = express();
  const pinoHttp =
    (typeof pinoHttpModule === "function"
      ? pinoHttpModule
      : "default" in pinoHttpModule
        ? pinoHttpModule.default
        : null) as ((options: { logger: typeof logger }) => RequestHandler) | null;

  app.use(
    cors({
      origin: env.allowedOrigins,
      credentials: true
    })
  );
  app.use(express.json());
  if (pinoHttp) {
    app.use(pinoHttp({ logger }));
  }
  app.use("/api", createRoutes(controllers));
  app.use(errorMiddleware);

  return app;
};
