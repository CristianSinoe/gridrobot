import type { Request, Response } from "express";
import { z } from "zod";

import { badRequest } from "../../shared/errors.js";
import type { SessionAccessService } from "../../modules/central-access/session-access-service.js";
import type { OperatorService } from "../../modules/operators/operator-service.js";
import type { SystemModeService } from "../../modules/system/system-mode-service.js";
import { assertWarehouseModeForNonAdmin } from "../../modules/system/system-mode-guards.js";

const centralLoginSchema = z.object({
  password: z.string().min(1)
});

const operatorLoginSchema = z.object({
  nodeId: z.enum(["PC-B01", "PC-B02", "PC-B03"]),
  username: z.string().min(1),
  password: z.string().min(1)
});

const tokenHeaderSchema = z.object({
  token: z.string().min(1)
});

const releaseSessionSchema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("central")
  }),
  z.object({
    role: z.literal("operator"),
    nodeId: z.enum(["PC-B01", "PC-B02", "PC-B03"])
  })
]);

export class SessionController {
  public constructor(
    private readonly sessionAccessService: SessionAccessService,
    private readonly operatorService: OperatorService,
    private readonly systemModeService: SystemModeService
  ) {}

  public status = (_request: Request, response: Response): void => {
    this.assertCentralRequest(_request);
    response.json(this.sessionAccessService.getStatus());
  };

  public loginCentral = (request: Request, response: Response): void => {
    const payload = centralLoginSchema.parse(request.body);
    const session = this.sessionAccessService.loginCentral(payload.password, request.ip ?? null);
    response.status(201).json(session);
  };

  public loginOperator = async (request: Request, response: Response): Promise<void> => {
    assertWarehouseModeForNonAdmin(request, this.sessionAccessService, this.systemModeService);
    const payload = operatorLoginSchema.parse(request.body);
    const operator = await this.operatorService.authenticate(
      payload.nodeId,
      payload.username,
      payload.password
    );
    const session = this.sessionAccessService.loginOperator(
      payload.nodeId,
      operator,
      request.ip ?? null
    );
    response.status(201).json(session);
  };

  public logout = (request: Request, response: Response): void => {
    const payload = tokenHeaderSchema.parse({
      token: request.header("x-session-token")
    });

    this.sessionAccessService.releaseByToken(payload.token);
    response.status(204).send();
  };

  public release = (request: Request, response: Response): void => {
    this.assertCentralRequest(request);
    const payload = releaseSessionSchema.parse(request.body);

    this.sessionAccessService.releaseByLock(
      payload.role,
      payload.role === "operator" ? payload.nodeId : null
    );
    response.status(204).send();
  };

  private assertCentralRequest(request: Request): void {
    const token = request.header("x-session-token");
    const session = token ? this.sessionAccessService.getSessionByToken(token) : null;
    if (!session || session.role !== "central") {
      throw badRequest("Solo el Panel Central puede administrar sesiones.");
    }
  }
}
