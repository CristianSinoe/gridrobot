import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";

import type { SessionAccessService } from "../central-access/session-access-service.js";
import type { GameService } from "./game-service.js";
import type { SystemModeService } from "../system/system-mode-service.js";
import { assertCentralSession } from "../system/system-mode-guards.js";

const modeSchema = z.object({
  mode: z.enum(["WAREHOUSE", "GAME"])
});

export const createGameRouter = (
  sessionAccessService: SessionAccessService,
  systemModeService: SystemModeService,
  gameService: GameService
): Router => {
  const router = Router();

  router.get("/system/mode", (_request: Request, response: Response) => {
    response.json({ mode: systemModeService.getMode() });
  });

  router.post("/system/mode", async (request: Request, response: Response) => {
    assertCentralSession(request, sessionAccessService, "Solo el Panel Central puede cambiar el modo del sistema.");
    const payload = modeSchema.parse(request.body);
    const mode = await systemModeService.setMode(payload.mode);
    response.json({ mode });
  });

  router.get("/game/state", (_request: Request, response: Response) => {
    response.json(gameService.getState());
  });

  return router;
};
