import crypto from "node:crypto";

import { badRequest } from "../../shared/errors.js";
import type { OperatorView } from "../../shared/types.js";
import { OPERATOR_NODE_CODES, type OperatorNodeCode as RobotCatalogOperatorNodeCode } from "../robots/robot-catalog.js";

export type SessionRole = "central" | "operator";
export type OperatorNodeCode = RobotCatalogOperatorNodeCode;

export interface ActiveSession {
  token: string;
  role: SessionRole;
  nodeId: OperatorNodeCode | null;
  operatorId: string | null;
  operatorUsername: string | null;
  socketId: string | null;
  connectedAt: string;
  clientIp: string | null;
  reservedAt: number;
}

const VALID_OPERATOR_NODES = new Set<OperatorNodeCode>(OPERATOR_NODE_CODES);

export class SessionAccessService {
  private readonly sessions = new Map<string, ActiveSession>();
  private readonly sessionByToken = new Map<string, string>();

  public constructor(
    private readonly centralPassword: string,
    private readonly reservationGraceMs: number
  ) {}

  public loginCentral(password: string, clientIp: string | null): ActiveSession {
    if (password !== this.centralPassword) {
      throw badRequest("La contraseña del Panel Central es incorrecta.");
    }

    return this.reserveSession("central", null, clientIp);
  }

  public loginOperator(
    nodeId: string,
    operator: Pick<OperatorView, "id" | "username">,
    clientIp: string | null
  ): ActiveSession {
    if (!VALID_OPERATOR_NODES.has(nodeId as OperatorNodeCode)) {
      throw badRequest("El nodo secundario seleccionado no es valido.");
    }

    return this.reserveSession(
      "operator",
      nodeId as OperatorNodeCode,
      clientIp,
      operator.id,
      operator.username
    );
  }

  public attachSocket(token: string, socketId: string, clientIp: string | null): ActiveSession | null {
    this.pruneExpiredReservations();

    const lockKey = this.sessionByToken.get(token);
    if (!lockKey) {
      return null;
    }

    const session = this.sessions.get(lockKey);
    if (!session) {
      this.sessionByToken.delete(token);
      return null;
    }

    const nextSession: ActiveSession = {
      ...session,
      socketId,
      clientIp: clientIp ?? session.clientIp,
      connectedAt: new Date().toISOString()
    };

    this.sessions.set(lockKey, nextSession);
    return nextSession;
  }

  public getSessionByToken(token: string): ActiveSession | null {
    this.pruneExpiredReservations();

    const lockKey = this.sessionByToken.get(token);
    if (!lockKey) {
      return null;
    }

    return this.sessions.get(lockKey) ?? null;
  }

  public releaseByToken(token: string): void {
    const lockKey = this.sessionByToken.get(token);
    if (!lockKey) {
      return;
    }

    this.destroySession(lockKey);
  }

  public releaseBySocket(socketId: string): void {
    for (const [lockKey, session] of this.sessions.entries()) {
      if (session.socketId === socketId) {
        this.destroySession(lockKey);
        return;
      }
    }
  }

  public releaseByLock(role: SessionRole, nodeId: OperatorNodeCode | null): void {
    this.destroySession(this.toLockKey(role, nodeId));
  }

  public getStatus() {
    this.pruneExpiredReservations();

    return Array.from(this.sessions.values()).map((session) => ({
      socketId: session.socketId,
      role: session.role,
      nodeId: session.nodeId,
      operatorId: session.operatorId,
      operatorUsername: session.operatorUsername,
      connectedAt: session.connectedAt,
      clientIp: session.clientIp
    }));
  }

  private reserveSession(
    role: SessionRole,
    nodeId: OperatorNodeCode | null,
    clientIp: string | null,
    operatorId: string | null = null,
    operatorUsername: string | null = null
  ): ActiveSession {
    this.pruneExpiredReservations();

    const lockKey = this.toLockKey(role, nodeId);
    if (this.sessions.has(lockKey)) {
      throw badRequest(
        role === "central"
          ? "El Panel Central ya esta en uso en otra computadora."
          : `El nodo ${nodeId ?? ""} ya esta en uso en otra computadora secundaria.`
      );
    }

    const session: ActiveSession = {
      token: crypto.randomUUID(),
      role,
      nodeId,
      operatorId,
      operatorUsername,
      socketId: null,
      connectedAt: new Date().toISOString(),
      clientIp,
      reservedAt: Date.now()
    };

    this.sessions.set(lockKey, session);
    this.sessionByToken.set(session.token, lockKey);

    return session;
  }

  private destroySession(lockKey: string): void {
    const session = this.sessions.get(lockKey);
    if (!session) {
      return;
    }

    this.sessionByToken.delete(session.token);
    this.sessions.delete(lockKey);
  }

  private pruneExpiredReservations(): void {
    const now = Date.now();

    for (const [lockKey, session] of this.sessions.entries()) {
      if (session.socketId === null && now - session.reservedAt > this.reservationGraceMs) {
        this.destroySession(lockKey);
      }
    }
  }

  private toLockKey(role: SessionRole, nodeId: OperatorNodeCode | null): string {
    return role === "central" ? "central" : `operator:${nodeId}`;
  }
}
