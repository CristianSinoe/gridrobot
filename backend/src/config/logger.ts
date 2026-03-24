import pino from "pino";

import { env } from "./env.js";

const loggerOptions =
  env.NODE_ENV === "production"
    ? {
        level: "info" as const
      }
    : {
        level: "debug" as const,
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true
          }
        }
      };

export const logger = pino(loggerOptions);
