import type { Request, Response } from "express";
import { z } from "zod";

import type { SessionAccessService } from "../../modules/central-access/session-access-service.js";
import type { OperatorService } from "../../modules/operators/operator-service.js";
import { assertCentralSession } from "../../modules/system/system-mode-guards.js";

const operatorPayloadSchema = z.object({
  name: z.string().trim().min(1),
  username: z.string().trim().min(1),
  password: z.string().trim().min(4).optional(),
  assignedNodeId: z.enum(["PC-B01", "PC-B02", "PC-B03"]).nullable(),
  isActive: z.boolean()
});

const operatorStatusSchema = z.object({
  isActive: z.boolean()
});

export class OperatorController {
  public constructor(
    private readonly operatorService: OperatorService,
    private readonly sessionAccessService: SessionAccessService
  ) {}

  public list = async (request: Request, response: Response): Promise<void> => {
    assertCentralSession(request, this.sessionAccessService, "Solo el Panel Central puede gestionar operadores.");
    response.json(await this.operatorService.list());
  };

  public create = async (request: Request, response: Response): Promise<void> => {
    assertCentralSession(request, this.sessionAccessService, "Solo el Panel Central puede crear operadores.");
    const payload = operatorPayloadSchema.extend({
      password: z.string().trim().min(4)
    }).parse(request.body);
    response.status(201).json(await this.operatorService.create(payload));
  };

  public update = async (request: Request, response: Response): Promise<void> => {
    assertCentralSession(request, this.sessionAccessService, "Solo el Panel Central puede editar operadores.");
    const params = z.object({ operatorId: z.string().uuid() }).parse(request.params);
    const payload = operatorPayloadSchema.parse(request.body);
    response.json(
      await this.operatorService.update(params.operatorId, {
        name: payload.name,
        username: payload.username,
        assignedNodeId: payload.assignedNodeId,
        isActive: payload.isActive,
        ...(payload.password ? { password: payload.password } : {})
      })
    );
  };

  public updateStatus = async (request: Request, response: Response): Promise<void> => {
    assertCentralSession(request, this.sessionAccessService, "Solo el Panel Central puede cambiar el estado de operadores.");
    const params = z.object({ operatorId: z.string().uuid() }).parse(request.params);
    const payload = operatorStatusSchema.parse(request.body);
    response.json(await this.operatorService.updateStatus(params.operatorId, payload.isActive));
  };
}
