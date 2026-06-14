import type { RequestHandler } from "express";

import { env } from "../../config/env.js";

interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
  message?: string;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const DEFAULT_MESSAGE = "Demasiadas solicitudes. Intenta nuevamente en unos segundos.";

export const createRateLimitMiddleware = ({
  maxRequests,
  windowMs,
  message = DEFAULT_MESSAGE
}: RateLimitOptions): RequestHandler => {
  const entries = new Map<string, RateLimitEntry>();

  return (request, response, next) => {
    if (!env.RATE_LIMIT_ENABLED) {
      next();
      return;
    }

    const key = request.ip || request.socket.remoteAddress || "unknown";
    const now = Date.now();
    const current = entries.get(key);

    if (!current || current.resetAt <= now) {
      entries.set(key, {
        count: 1,
        resetAt: now + windowMs
      });
      next();
      return;
    }

    if (current.count >= maxRequests) {
      response.status(429).json({
        success: false,
        message
      });
      return;
    }

    current.count += 1;
    entries.set(key, current);
    next();
  };
};
