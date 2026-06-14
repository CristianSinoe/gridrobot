import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const safeBoolean = (defaultValue: boolean) =>
  z.preprocess((value) => {
    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value !== "string") {
      return defaultValue;
    }

    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "on"].includes(normalized)) {
      return true;
    }

    if (["false", "0", "no", "off"].includes(normalized)) {
      return false;
    }

    return defaultValue;
  }, z.boolean().default(defaultValue));

const safePositiveInt = (defaultValue: number) =>
  z.preprocess((value) => {
    const raw = typeof value === "string" ? value.trim() : value;
    const parsed = typeof raw === "number" ? raw : Number(raw);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return defaultValue;
    }

    return parsed;
  }, z.coerce.number().int().positive().default(defaultValue));

const safeNonNegativeInt = (defaultValue: number) =>
  z.preprocess((value) => {
    const raw = typeof value === "string" ? value.trim() : value;
    const parsed = typeof raw === "number" ? raw : Number(raw);

    if (!Number.isFinite(parsed) || parsed < 0) {
      return defaultValue;
    }

    return parsed;
  }, z.coerce.number().int().nonnegative().default(defaultValue));

const safePositiveNumber = (defaultValue: number) =>
  z.preprocess((value) => {
    const raw = typeof value === "string" ? value.trim() : value;
    const parsed = typeof raw === "number" ? raw : Number(raw);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return defaultValue;
    }

    return parsed;
  }, z.coerce.number().positive().default(defaultValue));

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  ALLOWED_ORIGINS: z.string().optional(),
  DEMO_MODE: safeBoolean(false),
  PUBLIC_BASE_URL: z.string().trim().optional(),
  GAME_ONLY_REDIRECT: safeBoolean(true),
  ALLOW_PRIVATE_NETWORK_ORIGINS: safeBoolean(false),
  RATE_LIMIT_ENABLED: safeBoolean(true),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  LOGIN_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  SOCKET_MAX_CONNECTIONS_PER_IP: z.coerce.number().int().positive().default(3),
  TRUST_PROXY: safeBoolean(true),
  PUBLIC_HOST_IP: z.string().default("192.168.100.12"),
  FRONTEND_PORT: z.coerce.number().int().positive().default(5173),
  DATABASE_URL: z.string().min(1),
  MQTT_URL: z.string().min(1).default("mqtt://localhost:1883"),
  MQTT_INTERNAL_SIMULATOR_ENABLED: safeBoolean(true),
  TICK_RATE_HZ: z.coerce.number().int().positive().default(20),
  ROBOT_SPEED_MULTIPLIER: safePositiveNumber(1.35),
  CENTRAL_DASHBOARD_PASSWORD: z.string().min(1).default("gridrobot_admin_2026"),
  OPERATOR_PC_B01_PASSWORD: z.string().min(1).default("gridrobot_b01_2026"),
  OPERATOR_PC_B02_PASSWORD: z.string().min(1).default("gridrobot_b02_2026"),
  OPERATOR_PC_B03_PASSWORD: z.string().min(1).default("gridrobot_b03_2026"),
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
  ROBOT_FAILURE_MIN_TICKS_BETWEEN_EVENTS: z.coerce.number().int().nonnegative().default(200),
  WAREHOUSE_GRID_WIDTH: safePositiveInt(40),
  WAREHOUSE_GRID_HEIGHT: safePositiveInt(40),
  GAME_GRID_WIDTH: safePositiveInt(10),
  GAME_GRID_HEIGHT: safePositiveInt(10),
  GAME_TICK_RATE_HZ: safePositiveInt(2),
  GAME_INITIAL_LIVES: safePositiveInt(3),
  GAME_MAX_LIVES: safePositiveInt(3),
  GAME_NORMAL_POINTS: safePositiveInt(10),
  GAME_BONUS_POINTS: safePositiveInt(25),
  GAME_LIFE_ITEMS: safeNonNegativeInt(1),
  GAME_NORMAL_ITEMS: safeNonNegativeInt(5),
  GAME_BONUS_ITEMS: safeNonNegativeInt(2),
  GAME_OBSTACLES: safeNonNegativeInt(8),
  GAME_INVULNERABLE_MS: safePositiveInt(2000)
});

const parsed = envSchema.parse(process.env);

const defaultOrigins = [
  `http://localhost:${parsed.FRONTEND_PORT}`,
  `http://127.0.0.1:${parsed.FRONTEND_PORT}`,
  `http://${parsed.PUBLIC_HOST_IP}:${parsed.FRONTEND_PORT}`,
  parsed.PUBLIC_BASE_URL?.trim() || null
].filter((origin): origin is string => Boolean(origin));

const allowedOrigins = parsed.ALLOWED_ORIGINS
  ? parsed.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean)
  : defaultOrigins;

const publicBaseUrl = parsed.PUBLIC_BASE_URL?.trim() || null;
const publicBaseOrigin = (() => {
  if (!publicBaseUrl) {
    return null;
  }

  try {
    return new URL(publicBaseUrl).origin;
  } catch {
    return null;
  }
})();

const frontendBaseUrl = publicBaseOrigin ?? `http://${parsed.PUBLIC_HOST_IP}:${parsed.FRONTEND_PORT}`;

export const env = {
  ...parsed,
  PUBLIC_BASE_URL: publicBaseUrl,
  allowedOrigins,
  publicBaseOrigin,
  frontendBaseUrl
};
