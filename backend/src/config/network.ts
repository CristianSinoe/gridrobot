import type { CorsOptions } from "cors";

import { env } from "./env.js";

const privateIpv4Pattern =
  /^(localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})$/i;

const normalizeOrigin = (origin: string): string | null => {
  try {
    return new URL(origin).origin;
  } catch {
    return null;
  }
};

const getHostnameFromOrigin = (origin: string): string | null => {
  try {
    return new URL(origin).hostname;
  } catch {
    return null;
  }
};

export const isPrivateNetworkOrigin = (origin: string): boolean => {
  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) {
    return false;
  }

  const hostname = getHostnameFromOrigin(normalizedOrigin);
  return hostname ? privateIpv4Pattern.test(hostname) : false;
};

export const isAllowedOrigin = (origin?: string | null): boolean => {
  if (!origin) {
    return true;
  }

  const normalizedOrigin = normalizeOrigin(origin);
  if (!normalizedOrigin) {
    return false;
  }

  if (env.allowedOrigins.includes(normalizedOrigin)) {
    return true;
  }

  if (env.DEMO_MODE && env.publicBaseOrigin && normalizedOrigin === env.publicBaseOrigin) {
    return true;
  }

  if (env.ALLOW_PRIVATE_NETWORK_ORIGINS && isPrivateNetworkOrigin(normalizedOrigin)) {
    return true;
  }

  return false;
};

export const buildCorsOptions = (): CorsOptions => ({
  credentials: true,
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Origen no autorizado por la política CORS."));
  }
});

export const resolveClientIp = (
  forwardedForHeader?: string | string[] | undefined,
  fallbackAddress?: string | null
): string => {
  if (Array.isArray(forwardedForHeader)) {
    const firstEntry = forwardedForHeader[0]?.split(",")[0]?.trim();
    if (firstEntry) {
      return firstEntry;
    }
  }

  if (typeof forwardedForHeader === "string") {
    const firstEntry = forwardedForHeader.split(",")[0]?.trim();
    if (firstEntry) {
      return firstEntry;
    }
  }

  return fallbackAddress?.trim() || "unknown";
};
