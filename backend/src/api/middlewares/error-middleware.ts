import type { NextFunction, Request, Response } from "express";
import { isHttpError } from "http-errors";

import { logger } from "../../config/logger.js";

export const errorMiddleware = (
  error: Error,
  _request: Request,
  response: Response,
  _next: NextFunction
): void => {
  logger.error({ err: error }, "Request failed.");

  if (isHttpError(error)) {
    response.status(error.statusCode).json({
      message: error.message
    });
    return;
  }

  response.status(500).json({
    message: "Internal server error."
  });
};
