import type { Request, Response } from "express";
import { z } from "zod";

import { logger } from "../../config/logger.js";
import type { SessionAccessService } from "../../modules/central-access/session-access-service.js";
import type { PreviewRouteService } from "../../modules/preview-routes/preview-route-service.js";
import type { RobotService } from "../../modules/robots/robot-service.js";
import type { SystemModeService } from "../../modules/system/system-mode-service.js";
import {
  assertWarehouseModeForNonAdmin,
  resolveRequestSession
} from "../../modules/system/system-mode-guards.js";
import type { TaskService } from "../../modules/tasks/task-service.js";

const createTaskSchema = z.object({
  name: z.string().min(1),
  target: z.object({
    x: z.number().int().nonnegative(),
    y: z.number().int().nonnegative()
  }),
  robotId: z.string().uuid().optional()
});

const assignTaskSchema = z.object({
  robotId: z.string().uuid()
});

export class TaskController {
  public constructor(
    private readonly taskService: TaskService,
    private readonly sessionAccessService: SessionAccessService,
    private readonly robotService: RobotService,
    private readonly previewRouteService: PreviewRouteService,
    private readonly systemModeService: SystemModeService
  ) {}

  public list = async (request: Request, response: Response): Promise<void> => {
    const query = z
      .object({
        robotId: z.string().uuid().optional()
      })
      .parse(request.query);
    this.resolveSession(request);
    const robotId = query.robotId;
    const tasks = await this.taskService.list(robotId);
    response.json(tasks);
  };

  public create = async (request: Request, response: Response): Promise<void> => {
    assertWarehouseModeForNonAdmin(request, this.sessionAccessService, this.systemModeService);
    const payload = createTaskSchema.parse(request.body);
    const task = await this.taskService.create({
      name: payload.name,
      target: payload.target,
      ...(payload.robotId ? { robotId: payload.robotId } : {})
    });
    response.status(201).json(task);
  };

  public assign = async (request: Request, response: Response): Promise<void> => {
    assertWarehouseModeForNonAdmin(request, this.sessionAccessService, this.systemModeService);
    const params = z.object({ taskId: z.string().uuid() }).parse(request.params);
    const payload = assignTaskSchema.parse(request.body);
    const session = this.resolveSession(request);
    const task = await this.taskService.assign(
      params.taskId,
      payload.robotId,
      session.role === "operator" ? session.nodeId : null,
      session.role === "operator" ? session.operatorId : null
    );
    try {
      await this.previewRouteService.upsertPreview(
        params.taskId,
        payload.robotId,
        session.role === "operator" ? session.nodeId : null
      );
    } catch (error) {
      logger.warn(
        {
          err: error,
          taskId: params.taskId,
          robotId: payload.robotId,
          sessionRole: session.role,
          nodeId: session.nodeId
        },
        "No se pudo generar la ruta previa al asignar la tarea."
      );
    }
    response.json(task);
  };

  public start = async (request: Request, response: Response): Promise<void> => {
    assertWarehouseModeForNonAdmin(request, this.sessionAccessService, this.systemModeService);
    const params = z.object({ taskId: z.string().uuid() }).parse(request.params);
    this.resolveSession(request);
    const robotId = this.resolveCentralRobotId(request);
    const task = await this.taskService.start(params.taskId, robotId);
    this.previewRouteService.clearByTask(params.taskId);
    response.json(task);
  };

  public cancelPreparation = async (request: Request, response: Response): Promise<void> => {
    assertWarehouseModeForNonAdmin(request, this.sessionAccessService, this.systemModeService);
    const params = z.object({ taskId: z.string().uuid() }).parse(request.params);
    const session = this.resolveSession(request);
    const task = await this.taskService.cancelPreparation(
      params.taskId,
      session.role === "operator" ? session.nodeId : null
    );
    this.previewRouteService.clearByTask(params.taskId);
    response.json(task);
  };

  private resolveSession(request: Request) {
    return resolveRequestSession(request, this.sessionAccessService);
  }
  private resolveCentralRobotId(request: Request): string {
    const payload = assignTaskSchema.parse(request.body);
    return payload.robotId;
  }
}
