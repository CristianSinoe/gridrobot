import type { Request, Response } from "express";
import { z } from "zod";

import type { EventType } from "@prisma/client";

import type { SessionAccessService } from "../../modules/central-access/session-access-service.js";
import type { EventLogService } from "../../modules/events/event-log-service.js";
import type { RobotTelemetryService } from "../../modules/telemetry/robot-telemetry-service.js";
import { assertCentralSession } from "../../modules/system/system-mode-guards.js";

const eventsQuerySchema = z.object({
  type: z
    .enum([
      "ROBOT_STATE",
      "TASK_CREATED",
      "TASK_ASSIGNED",
      "TASK_STARTED",
      "TASK_COMPLETED",
      "OBSTACLE_DETECTED",
      "OBSTACLE_MOVED",
      "MQTT_MESSAGE_RECEIVED",
      "ACTUATOR_COMMAND"
    ])
    .optional(),
  source: z.string().trim().min(1).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().uuid().optional()
});

const telemetryQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25)
});

export class HistoryController {
  public constructor(
    private readonly eventLogService: EventLogService,
    private readonly sessionAccessService: SessionAccessService,
    private readonly robotTelemetryService: RobotTelemetryService
  ) {}

  public listEvents = async (request: Request, response: Response): Promise<void> => {
    assertCentralSession(request, this.sessionAccessService, "Solo el Panel Central puede consultar el histórico.");
    const query = eventsQuerySchema.parse(request.query);
    const events = await this.eventLogService.list({
      limit: query.limit,
      ...(query.type ? { type: query.type as EventType } : {}),
      ...(query.source ? { source: query.source } : {}),
      ...(query.from ? { from: new Date(query.from) } : {}),
      ...(query.to ? { to: new Date(query.to) } : {}),
      ...(query.cursor ? { cursor: query.cursor } : {})
    });
    response.json(events);
  };

  public listRobotEvents = async (request: Request, response: Response): Promise<void> => {
    assertCentralSession(request, this.sessionAccessService, "Solo el Panel Central puede consultar el histórico.");
    const params = z.object({ robotId: z.string().uuid() }).parse(request.params);
    const query = eventsQuerySchema.parse(request.query);
    const events = await this.eventLogService.list({
      robotId: params.robotId,
      limit: query.limit,
      ...(query.type ? { type: query.type as EventType } : {}),
      ...(query.source ? { source: query.source } : {}),
      ...(query.from ? { from: new Date(query.from) } : {}),
      ...(query.to ? { to: new Date(query.to) } : {}),
      ...(query.cursor ? { cursor: query.cursor } : {})
    });
    response.json(events);
  };

  public listTaskEvents = async (request: Request, response: Response): Promise<void> => {
    assertCentralSession(request, this.sessionAccessService, "Solo el Panel Central puede consultar el histórico.");
    const params = z.object({ taskId: z.string().uuid() }).parse(request.params);
    const query = eventsQuerySchema.parse(request.query);
    const events = await this.eventLogService.list({
      taskId: params.taskId,
      limit: query.limit,
      ...(query.type ? { type: query.type as EventType } : {}),
      ...(query.source ? { source: query.source } : {}),
      ...(query.from ? { from: new Date(query.from) } : {}),
      ...(query.to ? { to: new Date(query.to) } : {}),
      ...(query.cursor ? { cursor: query.cursor } : {})
    });
    response.json(events);
  };

  public listTelemetry = async (request: Request, response: Response): Promise<void> => {
    assertCentralSession(request, this.sessionAccessService, "Solo el Panel Central puede consultar la telemetría histórica.");
    const query = telemetryQuerySchema.parse(request.query);
    const telemetry = await this.robotTelemetryService.list({
      limit: query.limit,
      ...(query.from ? { from: new Date(query.from) } : {}),
      ...(query.to ? { to: new Date(query.to) } : {})
    });
    response.json(telemetry);
  };

  public listRobotTelemetry = async (request: Request, response: Response): Promise<void> => {
    assertCentralSession(request, this.sessionAccessService, "Solo el Panel Central puede consultar la telemetría histórica.");
    const params = z.object({ robotId: z.string().uuid() }).parse(request.params);
    const query = telemetryQuerySchema.parse(request.query);
    const telemetry = await this.robotTelemetryService.list({
      robotId: params.robotId,
      limit: query.limit,
      ...(query.from ? { from: new Date(query.from) } : {}),
      ...(query.to ? { to: new Date(query.to) } : {})
    });
    response.json(telemetry);
  };
}
