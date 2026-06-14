import type { Request, Response } from "express";
import { z } from "zod";

import type { SessionAccessService } from "../../modules/central-access/session-access-service.js";
import type { MqttBridgeService } from "../../modules/mqtt/mqtt-bridge-service.js";
import type { RobotService } from "../../modules/robots/robot-service.js";
import type { SystemModeService } from "../../modules/system/system-mode-service.js";
import { assertCentralSession, assertWarehouseModeForNonAdmin } from "../../modules/system/system-mode-guards.js";

const robotPayloadSchema = z.object({
  code: z.string().trim().min(1),
  name: z.string().trim().min(1),
  physicalWeightKg: z.number().positive(),
  speedCellsPerSec: z.number().positive(),
  capacityValue: z.number().int().positive(),
  capacityUnit: z.enum(["units", "kg"]),
  supports: z.array(
    z.enum(["UNIT_LOAD", "BULK_LOAD", "NON_FRAGILE", "FRAGILE", "REFRIGERATED"])
  ).min(1),
  status: z.enum(["activo", "inactivo", "mantenimiento", "en_espera", "averiado"]),
  isActive: z.boolean()
});

const robotStatusSchema = z.object({
  status: z.enum(["activo", "inactivo", "mantenimiento", "en_espera", "averiado"]),
  isActive: z.boolean()
});

const robotCommandSchema = z.object({
  command: z.enum(["PAUSE", "RESUME", "EMERGENCY_STOP", "SET_SPEED"]),
  speedCellsPerSec: z.number().positive().optional()
}).superRefine((payload, context) => {
  if (payload.command === "SET_SPEED" && typeof payload.speedCellsPerSec !== "number") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["speedCellsPerSec"],
      message: "Debe indicar una velocidad para el comando SET_SPEED."
    });
  }
});

export class RobotController {
  public constructor(
    private readonly robotService: RobotService,
    private readonly sessionAccessService: SessionAccessService,
    private readonly systemModeService: SystemModeService,
    private readonly mqttBridgeService: MqttBridgeService
  ) {}

  public list = (request: Request, response: Response): void => {
    assertWarehouseModeForNonAdmin(request, this.sessionAccessService, this.systemModeService);
    response.json(this.robotService.getAll());
  };

  public create = async (request: Request, response: Response): Promise<void> => {
    assertCentralSession(request, this.sessionAccessService, "Solo el Panel Central puede crear robots.");
    const payload = robotPayloadSchema.parse(request.body);
    response.status(201).json(await this.robotService.create(payload));
  };

  public update = async (request: Request, response: Response): Promise<void> => {
    assertCentralSession(request, this.sessionAccessService, "Solo el Panel Central puede editar robots.");
    const params = z.object({ robotId: z.string().uuid() }).parse(request.params);
    const payload = robotPayloadSchema.parse(request.body);
    response.json(await this.robotService.update(params.robotId, payload));
  };

  public updateStatus = async (request: Request, response: Response): Promise<void> => {
    assertCentralSession(request, this.sessionAccessService, "Solo el Panel Central puede cambiar el estado de robots.");
    const params = z.object({ robotId: z.string().uuid() }).parse(request.params);
    const payload = robotStatusSchema.parse(request.body);
    response.json(await this.robotService.updateStatus(params.robotId, payload.status, payload.isActive));
  };

  public sendCommand = async (request: Request, response: Response): Promise<void> => {
    assertCentralSession(request, this.sessionAccessService, "Solo el Panel Central puede enviar comandos a robots.");
    const params = z.object({ robotId: z.string().uuid() }).parse(request.params);
    const payload = robotCommandSchema.parse(request.body);
    await this.mqttBridgeService.publishCommand(params.robotId, payload.command, {
      ...(typeof payload.speedCellsPerSec === "number" ? { speedCellsPerSec: payload.speedCellsPerSec } : {})
    });
    response.status(202).json({
      success: true,
      message: `Comando ${payload.command} enviado correctamente.`
    });
  };
}
