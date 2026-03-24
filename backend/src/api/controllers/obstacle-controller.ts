import type { Request, Response } from "express";
import { z } from "zod";

import { badRequest } from "../../shared/errors.js";
import type { SessionAccessService } from "../../modules/central-access/session-access-service.js";
import type { ObstacleManager } from "../../modules/obstacles/obstacle-manager.js";
import type { RobotService } from "../../modules/robots/robot-service.js";
import type { WorldVisibilityService } from "../../modules/world-visibility/world-visibility-service.js";

const obstacleSchema = z.object({
  x: z.number().int().nonnegative(),
  y: z.number().int().nonnegative()
});

export class ObstacleController {
  public constructor(
    private readonly obstacleManager: ObstacleManager,
    private readonly robotService: RobotService,
    private readonly worldVisibilityService: WorldVisibilityService,
    private readonly sessionAccessService: SessionAccessService
  ) {}

  public list = (_request: Request, response: Response): void => {
    response.json(this.obstacleManager.getAll());
  };

  public upsert = async (request: Request, response: Response): Promise<void> => {
    this.assertCentralSession(request);
    const payload = obstacleSchema.parse(request.body);
    const obstacles = await this.obstacleManager.upsert(payload);
    const changedRobots = await this.robotService.recalculateRoutesForObstacles();
    this.worldVisibilityService.refreshDiscoveries();

    response.status(201).json({
      obstacles,
      changedRobots
    });
  };

  public remove = async (request: Request, response: Response): Promise<void> => {
    this.assertCentralSession(request);
    const payload = obstacleSchema.parse(request.body);
    const obstacles = await this.obstacleManager.remove(payload);
    const changedRobots = await this.robotService.recalculateRoutesForObstacles();
    this.worldVisibilityService.handleObstacleRemoved(payload);

    response.json({
      obstacles,
      changedRobots
    });
  };

  private assertCentralSession(request: Request): void {
    const token = request.header("x-session-token");
    const session = token ? this.sessionAccessService.getSessionByToken(token) : null;
    if (!session || session.role !== "central") {
      throw badRequest("Solo el Panel Central puede modificar obstaculos.");
    }
  }
}
