import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  ALLOWED_ORIGINS: z.string().optional(),
  PUBLIC_HOST_IP: z.string().default("192.168.100.12"),
  FRONTEND_PORT: z.coerce.number().int().positive().default(5173),
  DATABASE_URL: z.string().min(1),
  MQTT_URL: z.string().min(1).default("mqtt://localhost:1883"),
  TICK_RATE_HZ: z.coerce.number().int().positive().default(20),
  CENTRAL_DASHBOARD_PASSWORD: z.string().min(1).default("gridrobot_admin_2026"),
  OBSTACLE_FOV_RADIUS: z.coerce.number().int().nonnegative().default(3),
  CENTRAL_SESSION_GRACE_MS: z.coerce.number().int().positive().default(45000),
  DYNAMIC_OBSTACLES_ENABLED: z
    .string()
    .optional()
    .transform((value) => value !== "false"),
  DYNAMIC_OBSTACLE_MOVE_CHANCE: z.coerce.number().min(0).max(1).default(0.08),
  DYNAMIC_OBSTACLE_TICK_INTERVAL: z.coerce.number().int().positive().default(10),
  ROBOT_FAILURES_ENABLED: z
    .string()
    .optional()
    .transform((value) => value === "true"),
  ROBOT_FAILURE_CHANCE_PER_TICK: z.coerce.number().min(0).max(1).default(0.002),
  ROBOT_FAILURE_MIN_TICKS_BETWEEN_EVENTS: z.coerce.number().int().nonnegative().default(200)
});

const parsed = envSchema.parse(process.env);

const defaultOrigins = [
  `http://localhost:${parsed.FRONTEND_PORT}`,
  `http://127.0.0.1:${parsed.FRONTEND_PORT}`,
  `http://${parsed.PUBLIC_HOST_IP}:${parsed.FRONTEND_PORT}`
];

export const env = {
  ...parsed,
  allowedOrigins: parsed.ALLOWED_ORIGINS
    ? parsed.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean)
    : defaultOrigins
};
