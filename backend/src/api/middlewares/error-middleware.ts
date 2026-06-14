import type { NextFunction, Request, Response } from "express";
import { isHttpError } from "http-errors";

import { env } from "../../config/env.js";
import { logger } from "../../config/logger.js";

export const errorMiddleware = (
  error: Error,
  _request: Request,
  response: Response,
  _next: NextFunction
): void => {
  void _next;
  logger.error({ err: error }, "Request failed.");

  if (isHttpError(error)) {
    response.status(error.statusCode).json({
      success: false,
      message: error.message
    });
    return;
  }

  response.status(500).json({
    success: false,
    message: env.DEMO_MODE
      ? "No se pudo completar la solicitud en este momento."
      : "Error interno del servidor."
  });
};
