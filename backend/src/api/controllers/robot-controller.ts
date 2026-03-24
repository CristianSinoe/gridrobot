import type { Request, Response } from "express";

import type { RobotService } from "../../modules/robots/robot-service.js";

export class RobotController {
  public constructor(private readonly robotService: RobotService) {}

  public list = (_request: Request, response: Response): void => {
    response.json(this.robotService.getAll());
  };
}
