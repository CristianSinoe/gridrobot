import type { Request } from "express";

import { badRequest, locked } from "../../shared/errors.js";
import type { SystemMode } from "../../shared/types.js";
import type { SessionAccessService } from "../central-access/session-access-service.js";
import type { ActiveSession } from "../central-access/session-access-service.js";
import type { SystemModeService } from "./system-mode-service.js";

const GAME_LOCK_MESSAGE =
  "El sistema está en modo juego. La operación de almacén está bloqueada temporalmente.";

export const assertWarehouseMode = (
  systemModeService: SystemModeService,
  message = "El modo juego esta activo. Vuelva a Modo almacén para usar esta operación."
): void => {
  if (systemModeService.isGameMode()) {
    throw badRequest(message);
  }
};

export const resolveRequestSession = (
  request: Request,
  sessionAccessService: SessionAccessService
): ActiveSession => {
  const token = request.header("x-session-token");
  const session = token ? sessionAccessService.getSessionByToken(token) : null;
  if (!session) {
    throw badRequest("La sesion activa no es valida.");
  }

  return session;
};

export const resolveOptionalRequestSession = (
  request: Request,
  sessionAccessService: SessionAccessService
): ActiveSession | null => {
  const token = request.header("x-session-token");
  return token ? sessionAccessService.getSessionByToken(token) : null;
};

export const assertCentralSession = (
  request: Request,
  sessionAccessService: SessionAccessService,
  message: string
): ActiveSession => {
  const session = resolveRequestSession(request, sessionAccessService);
  if (session.role !== "central") {
    throw badRequest(message);
  }

  return session;
};

export const parseSystemMode = (mode: string): SystemMode => {
  if (mode !== "WAREHOUSE" && mode !== "GAME") {
    throw badRequest("El modo solicitado no es valido.");
  }

  return mode;
};

export const assertWarehouseModeForNonAdmin = (
  request: Request,
  sessionAccessService: SessionAccessService,
  systemModeService: SystemModeService,
  message = GAME_LOCK_MESSAGE
): void => {
  if (systemModeService.isWarehouseMode()) {
    return;
  }

  const session = resolveOptionalRequestSession(request, sessionAccessService);
  if (session?.role === "central") {
    return;
  }

  throw locked(message);
};

export const getGameModeLockMessage = (): string => GAME_LOCK_MESSAGE;
