import { hash, compare } from "bcryptjs";
import type { Operator, PrismaClient } from "@prisma/client";

import { badRequest, notFound } from "../../shared/errors.js";
import type { OperatorView } from "../../shared/types.js";
import { OPERATOR_NODE_CODES, type OperatorNodeCode } from "../robots/robot-catalog.js";

const HASH_ROUNDS = 10;
const VALID_OPERATOR_NODES = new Set<string>(OPERATOR_NODE_CODES);

interface OperatorInput {
  name: string;
  username: string;
  password?: string;
  assignedNodeId: OperatorNodeCode | null;
  isActive: boolean;
}

export class OperatorService {
  public constructor(private readonly prisma: PrismaClient) {}

  public async list(): Promise<OperatorView[]> {
    const operators = await this.prisma.operator.findMany({
      include: {
        assignedNode: {
          select: { code: true }
        }
      },
      orderBy: [{ isActive: "desc" }, { username: "asc" }]
    });

    return operators.map((operator) => this.toView(operator));
  }

  public async create(input: OperatorInput): Promise<OperatorView> {
    if (!input.password || input.password.trim().length < 4) {
      throw badRequest("La contraseña del operador debe tener al menos 4 caracteres.");
    }

    const assignedNodeId = await this.resolveAssignedNodeId(input.assignedNodeId);
    const normalizedUsername = this.normalizeUsername(input.username);
    const passwordHash = await hash(input.password, HASH_ROUNDS);

    const operator = await this.prisma.operator.create({
      include: {
        assignedNode: {
          select: { code: true }
        }
      },
      data: {
        name: input.name.trim(),
        username: normalizedUsername,
        passwordHash,
        assignedNodeId,
        isActive: input.isActive
      }
    });

    return this.toView(operator);
  }

  public async update(operatorId: string, input: OperatorInput): Promise<OperatorView> {
    await this.ensureExists(operatorId);

    const assignedNodeId = await this.resolveAssignedNodeId(input.assignedNodeId);
    const normalizedUsername = this.normalizeUsername(input.username);
    const nextPasswordHash =
      input.password && input.password.trim().length > 0 ? await hash(input.password, HASH_ROUNDS) : undefined;

    const operator = await this.prisma.operator.update({
      include: {
        assignedNode: {
          select: { code: true }
        }
      },
      where: { id: operatorId },
      data: {
        name: input.name.trim(),
        username: normalizedUsername,
        assignedNodeId,
        isActive: input.isActive,
        ...(nextPasswordHash ? { passwordHash: nextPasswordHash } : {})
      }
    });

    return this.toView(operator);
  }

  public async updateStatus(operatorId: string, isActive: boolean): Promise<OperatorView> {
    await this.ensureExists(operatorId);

    const operator = await this.prisma.operator.update({
      include: {
        assignedNode: {
          select: { code: true }
        }
      },
      where: { id: operatorId },
      data: { isActive }
    });

    return this.toView(operator);
  }

  public async authenticate(nodeCode: string, username: string, password: string): Promise<OperatorView> {
    if (!VALID_OPERATOR_NODES.has(nodeCode)) {
      throw badRequest("El nodo secundario seleccionado no es valido.");
    }

    const operator = await this.prisma.operator.findUnique({
      where: { username: this.normalizeUsername(username) },
      include: {
        assignedNode: {
          select: { code: true }
        }
      }
    });

    if (!operator) {
      throw badRequest("El usuario del operador no existe.");
    }

    if (!operator.isActive) {
      throw badRequest("El operador seleccionado esta inactivo.");
    }

    const passwordMatches = await compare(password, operator.passwordHash);
    if (!passwordMatches) {
      throw badRequest("La contraseña del operador es incorrecta.");
    }

    if (operator.assignedNode?.code && operator.assignedNode.code !== nodeCode) {
      throw badRequest(`El operador ${operator.username} solo puede iniciar sesion en ${operator.assignedNode.code}.`);
    }

    return this.toView(operator);
  }

  private normalizeUsername(username: string): string {
    const normalized = username.trim().toLowerCase();
    if (!normalized) {
      throw badRequest("El usuario del operador es obligatorio.");
    }

    return normalized;
  }

  private async resolveAssignedNodeId(nodeCode: OperatorNodeCode | null): Promise<string | null> {
    if (!nodeCode) {
      return null;
    }

    if (!VALID_OPERATOR_NODES.has(nodeCode)) {
      throw badRequest("El nodo asignado al operador no es valido.");
    }

    const node = await this.prisma.node.findUnique({
      where: { code: nodeCode },
      select: { id: true }
    });

    if (!node) {
      throw badRequest("El nodo asignado al operador no existe en la base de datos.");
    }

    return node.id;
  }

  private async ensureExists(operatorId: string): Promise<void> {
    const exists = await this.prisma.operator.findUnique({
      where: { id: operatorId },
      select: { id: true }
    });

    if (!exists) {
      throw notFound(`No se encontro el operador ${operatorId}.`);
    }
  }

  private toView(
    operator: Pick<Operator, "id" | "name" | "username" | "isActive" | "createdAt" | "updatedAt"> & {
      assignedNode?: { code: string } | null;
    }
  ): OperatorView {
    return {
      id: operator.id,
      name: operator.name,
      username: operator.username,
      assignedNodeId: (operator.assignedNode?.code ?? null) as OperatorNodeCode | null,
      isActive: operator.isActive,
      createdAt: operator.createdAt.toISOString(),
      updatedAt: operator.updatedAt.toISOString()
    };
  }
}
