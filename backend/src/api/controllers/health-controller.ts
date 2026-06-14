import type { Request, Response } from "express";

import type { HealthService } from "../../modules/health/health-service.js";

export class HealthController {
  public constructor(private readonly healthService: HealthService) {}

  public getHealth = async (_request: Request, response: Response): Promise<void> => {
    const snapshot = await this.healthService.getSnapshot();
    response.status(snapshot.status === "ok" ? 200 : 503).json(snapshot);
  };
}
