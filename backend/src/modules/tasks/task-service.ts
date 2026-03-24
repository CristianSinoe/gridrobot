import type { PrismaClient, Task } from "@prisma/client";

import { badRequest, notFound } from "../../shared/errors.js";
import type { GridPosition, TaskRobotCandidateView, TaskView } from "../../shared/types.js";
import { GridManager } from "../grid/grid-manager.js";
import { ObstacleManager } from "../obstacles/obstacle-manager.js";
import { RobotService } from "../robots/robot-service.js";
import { FIXED_RUNTIME_ASSIGNMENTS } from "../robots/robot-catalog.js";
import { TaskCompatibilityService } from "./task-compatibility-service.js";
import { TaskGeneratorService } from "./task-generator-service.js";

export class TaskService {
  private readonly compatibilityService = new TaskCompatibilityService();
  private readonly taskGeneratorService: TaskGeneratorService;
  private readonly lastFailureTickByRobot = new Map<string, number>();

  public constructor(
    private readonly prisma: PrismaClient,
    private readonly robotService: RobotService,
    private readonly gridManager: GridManager,
    private readonly obstacleManager: ObstacleManager
  ) {
    this.taskGeneratorService = new TaskGeneratorService(prisma, gridManager, 20260317);
  }

  public async list(robotId?: string): Promise<TaskView[]> {
    if (!robotId) {
      const tasks = await this.prisma.task.findMany({
        orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }]
      });

      return Promise.all(tasks.map((task) => this.toTaskView(task)));
    }

    const robot = await this.prisma.robot.findUnique({ where: { id: robotId } });
    if (!robot) {
      throw notFound(`No se encontro el robot ${robotId}.`);
    }

    const tasks = await this.prisma.task.findMany({
      where: {
        OR: [
          { robotId },
          { status: "PENDING" },
          { status: "WAITING_ASSISTANCE" }
        ]
      },
      orderBy: [{ status: "asc" }, { priority: "desc" }, { createdAt: "desc" }]
    });

    return Promise.all(
      tasks
        .filter((task) => task.robotId === robotId || this.compatibilityService.isRobotCompatible(robot, task))
        .map((task) => this.toTaskView(task))
    );
  }

  public async create(input: {
    name: string;
    target: GridPosition;
    robotId?: string;
  }): Promise<TaskView> {
    const task = await this.prisma.task.create({
      data: {
        code: `MANUAL-${Date.now()}`,
        name: input.name,
        type: "MOVE_BOXES",
        originX: 0,
        originY: 0,
        targetX: input.target.x,
        targetY: input.target.y,
        loadTypeRequired: "UNIT_LOAD",
        requiresRefrigeration: false,
        requiresFragileHandling: false,
        requiredAmount: 1,
        amountUnit: "units",
        robotId: input.robotId ?? null
      }
    });

    return this.toTaskView(task);
  }

  public async assign(taskId: string, robotId: string, assignedByNodeCode?: string | null): Promise<TaskView> {
    const [task, robot] = await Promise.all([
      this.prisma.task.findUnique({ where: { id: taskId } }),
      this.prisma.robot.findUnique({ where: { id: robotId } })
    ]);

    if (!task) {
      throw notFound(`No se encontro la tarea ${taskId}.`);
    }

    if (!robot) {
      throw notFound(`No se encontro el robot ${robotId}.`);
    }

    if (task.status !== "PENDING" && task.status !== "WAITING_ASSISTANCE") {
      throw badRequest("Esta tarea ya no esta disponible.");
    }

    if (!this.compatibilityService.isRobotCompatible(robot, task)) {
      throw badRequest(`El robot ${robot.code} no es compatible con la tarea ${task.code ?? task.id}.`);
    }

    const reservedRobotTask = await this.findRobotReservation(robotId, taskId);
    if (reservedRobotTask) {
      throw badRequest(this.getRobotReservationMessage(robot.code, reservedRobotTask));
    }

    const assignedByNode = assignedByNodeCode
      ? await this.prisma.node.findUnique({
          where: { code: assignedByNodeCode }
        })
      : null;

    if (assignedByNode?.id) {
      const existingPreparedTask = await this.prisma.task.findFirst({
        where: {
          id: { not: taskId },
          status: { in: ["ASSIGNED", "REASSIGNED"] },
          assignments: {
            some: {
              assignedByNodeId: assignedByNode.id
            }
          }
        }
      });

      if (existingPreparedTask) {
        throw badRequest("Este operador ya tiene un viaje preparado. Inicie o libere ese viaje antes de preparar otro.");
      }
    }

    await this.prisma.$transaction(async (tx) => {
      const lockedTask = await tx.task.findUnique({
        where: { id: taskId }
      });

      if (!lockedTask || !["PENDING", "WAITING_ASSISTANCE"].includes(lockedTask.status)) {
        throw badRequest("Esta tarea ya fue tomada por otro operador.");
      }

      const competingTask = await tx.task.findFirst({
        where: {
          id: { not: taskId },
          robotId,
          status: { in: ["ASSIGNED", "REASSIGNED", "IN_PROGRESS"] }
        },
        include: {
          assignments: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: {
              assignedByNode: {
                select: { code: true }
              }
            }
          }
        }
      });

      if (competingTask) {
        throw badRequest(this.getRobotReservationMessage(robot.code, competingTask));
      }

      await tx.task.update({
        where: { id: taskId },
        data: {
          robotId,
          status: lockedTask.status === "WAITING_ASSISTANCE" ? "REASSIGNED" : "ASSIGNED"
        }
      });

      await tx.taskAssignment.upsert({
        where: {
          taskId_robotId: {
            taskId,
            robotId
          }
        },
        create: {
          taskId,
          robotId,
          assignedByNodeId: assignedByNode?.id ?? null,
          acceptedAt: new Date()
        },
        update: {
          assignedByNodeId: assignedByNode?.id ?? null,
          acceptedAt: new Date(),
          startedAt: null,
          completedAt: null
        }
      });
    });

    const assignedTask = await this.prisma.task.findUniqueOrThrow({ where: { id: taskId } });
    return this.toTaskView(assignedTask);
  }

  public async start(taskId: string, robotId: string): Promise<TaskView> {
    const [task, robot] = await Promise.all([
      this.prisma.task.findUnique({ where: { id: taskId } }),
      this.prisma.robot.findUnique({ where: { id: robotId } })
    ]);

    if (!task) {
      throw notFound(`No se encontro la tarea ${taskId}.`);
    }

    if (!robot) {
      throw notFound(`No se encontro el robot ${robotId}.`);
    }

    if (task.robotId !== robotId) {
      throw badRequest("La tarea no esta tomada por este robot.");
    }

    if (task.status !== "ASSIGNED" && task.status !== "REASSIGNED") {
      throw badRequest("Solo las tareas tomadas pueden iniciar viaje.");
    }

    if (!robot.isActive || robot.status === "OFFLINE" || robot.catalogStatus === "mantenimiento") {
      throw badRequest("El robot seleccionado ya no esta disponible para iniciar el viaje.");
    }

    const nextExecutionStage =
      task.executionStage === "TO_ORIGIN" && robot.x === task.originX && robot.y === task.originY
        ? "TO_TARGET"
        : task.executionStage;
    const target =
      nextExecutionStage === "TO_TARGET"
        ? { x: task.targetX, y: task.targetY }
        : { x: task.originX, y: task.originY };

    await this.prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id: taskId },
        data: {
          status: "IN_PROGRESS",
          executionStage: nextExecutionStage,
          startedAt: task.startedAt ?? new Date()
        }
      });

      await tx.taskAssignment.updateMany({
        where: {
          taskId,
          robotId
        },
        data: {
          startedAt: new Date()
        }
      });
    });

    await this.robotService.assignRoute(robotId, target, taskId, "TASK_START");

    const startedTask = await this.prisma.task.findUniqueOrThrow({ where: { id: taskId } });
    return this.toTaskView(startedTask);
  }

  public async cancelPreparation(taskId: string, nodeCode?: string | null): Promise<TaskView> {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId }
    });

    if (!task) {
      throw notFound(`No se encontro la tarea ${taskId}.`);
    }

    if (task.status !== "ASSIGNED" && task.status !== "REASSIGNED") {
      throw badRequest("Solo se pueden cancelar viajes preparados que aun no inician.");
    }

    const assignedByNode = nodeCode
      ? await this.prisma.node.findUnique({
          where: { code: nodeCode }
        })
      : null;

    if (nodeCode && assignedByNode) {
      const assignment = await this.prisma.taskAssignment.findFirst({
        where: {
          taskId,
          ...(task.robotId ? { robotId: task.robotId } : {})
        },
        orderBy: { createdAt: "desc" }
      });

      if (assignment?.assignedByNodeId && assignment.assignedByNodeId !== assignedByNode.id) {
        throw badRequest("Solo el operador que preparo este viaje puede cancelarlo.");
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id: taskId },
        data: {
          robotId: null,
          status: task.status === "REASSIGNED" ? "WAITING_ASSISTANCE" : "PENDING"
        }
      });

      if (task.robotId) {
        await tx.taskAssignment.updateMany({
          where: {
            taskId,
            robotId: task.robotId
          },
          data: {
            completedAt: new Date()
          }
        });
      }
    });

    const updatedTask = await this.prisma.task.findUniqueOrThrow({ where: { id: taskId } });
    return this.toTaskView(updatedTask);
  }

  public async handleRobotProgress(): Promise<void> {
    const robots = this.robotService.getAll().filter((robot) => robot.taskId);

    for (const robotState of robots) {
      if (robotState.status !== "IDLE" || !robotState.taskId) {
        continue;
      }

      const [task, robot] = await Promise.all([
        this.prisma.task.findUnique({ where: { id: robotState.taskId } }),
        this.prisma.robot.findUnique({ where: { id: robotState.id } })
      ]);

      if (!task || !robot) {
        continue;
      }

      const atOrigin = robotState.position.x === task.originX && robotState.position.y === task.originY;
      const atTarget = robotState.position.x === task.targetX && robotState.position.y === task.targetY;

      if (task.executionStage === "TO_ORIGIN" && atOrigin) {
        await this.prisma.task.update({
          where: { id: task.id },
          data: {
            executionStage: "TO_TARGET",
            status: "IN_PROGRESS"
          }
        });

        try {
          await this.robotService.assignRoute(
            robot.id,
            { x: task.targetX, y: task.targetY },
            task.id,
            "TASK_STAGE_TO_TARGET"
          );
        } catch (error) {
          this.robotService.setState({
            ...robotState,
            targetPosition: { x: task.targetX, y: task.targetY },
            path: [robotState.position],
            status: "BLOCKED",
            taskId: task.id,
            updatedAt: new Date().toISOString()
          });

          await this.prisma.systemLog.create({
            data: {
              level: "WARN",
              source: "simulacion",
              robotId: robot.id,
              taskId: task.id,
              message:
                error instanceof Error
                  ? `No se pudo continuar la tarea por una ruta bloqueada: ${error.message}`
                  : "No se pudo continuar la tarea por una ruta bloqueada."
            }
          });
        }
        continue;
      }

      if (task.executionStage === "TO_TARGET" && atTarget) {
        await this.prisma.task.update({
          where: { id: task.id },
          data: {
            status: "COMPLETED",
            completedAt: new Date()
          }
        });

        await this.prisma.taskAssignment.updateMany({
          where: {
            taskId: task.id,
            robotId: robot.id
          },
          data: {
            completedAt: new Date()
          }
        });

        this.robotService.setState({
          ...robotState,
          taskId: null,
          targetPosition: null,
          path: [robotState.position],
          status: "IDLE",
          updatedAt: new Date().toISOString()
        });
      }
    }
  }

  public async ensureAutomaticTasks(): Promise<TaskView[]> {
    const activeRobotCodes = new Set(FIXED_RUNTIME_ASSIGNMENTS.map((entry) => entry.robotCode));
    const robots = await this.prisma.robot.findMany({
      where: {
        code: { in: Array.from(activeRobotCodes) }
      },
      orderBy: { code: "asc" }
    });

    const reservedPositions = [
      ...robots.map((robot) => ({ x: robot.x, y: robot.y })),
      ...this.obstacleManager.getAll()
    ];

    for (const robot of robots) {
      const openTasks = await this.prisma.task.findMany({
        where: {
          status: { in: ["PENDING", "ASSIGNED", "REASSIGNED", "IN_PROGRESS", "WAITING_ASSISTANCE"] }
        }
      });

      const hasCompatibleOpenTask = openTasks.some(
        (task) =>
          task.robotId === robot.id ||
          (
            (task.status === "PENDING" || task.status === "WAITING_ASSISTANCE") &&
            this.compatibilityService.isRobotCompatible(robot, task)
          )
      );

      if (!hasCompatibleOpenTask) {
        const task = await this.taskGeneratorService.createCompatibleTaskForRobot(robot, reservedPositions);
        reservedPositions.push(
          { x: task.originX, y: task.originY },
          { x: task.targetX, y: task.targetY }
        );
      }
    }

    return this.list();
  }

  public async simulateRandomFailures(
    currentTick: number,
    chancePerTick: number,
    minTicksBetweenEvents: number
  ): Promise<{ tasks: TaskView[]; failedRobotIds: string[] }> {
    const tasks: TaskView[] = [];
    const failedRobotIds: string[] = [];

    for (const robot of this.robotService.getAll()) {
      if (robot.status !== "MOVING" || !robot.taskId) {
        continue;
      }

      const lastFailureTick = this.lastFailureTickByRobot.get(robot.id) ?? -Infinity;
      if (currentTick - lastFailureTick < minTicksBetweenEvents) {
        continue;
      }

      if (Math.random() > chancePerTick) {
        continue;
      }

      const interruptedTask = await this.interruptForRobotFailure(robot.id);
      if (!interruptedTask) {
        continue;
      }

      this.lastFailureTickByRobot.set(robot.id, currentTick);
      tasks.push(interruptedTask);
      failedRobotIds.push(robot.id);
    }

    return { tasks, failedRobotIds };
  }

  private async interruptForRobotFailure(robotId: string): Promise<TaskView | null> {
    const robotState = this.robotService.getById(robotId);
    if (!robotState.taskId) {
      return null;
    }

    const task = await this.prisma.task.findUnique({
      where: { id: robotState.taskId }
    });

    if (!task || task.status !== "IN_PROGRESS") {
      return null;
    }

    const interruptionOrigin =
      task.executionStage === "TO_TARGET"
        ? { x: robotState.position.x, y: robotState.position.y }
        : { x: task.originX, y: task.originY };

    await this.prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id: task.id },
        data: {
          status: "WAITING_ASSISTANCE",
          robotId: null,
          originX: interruptionOrigin.x,
          originY: interruptionOrigin.y
        }
      });

      await tx.taskAssignment.updateMany({
        where: {
          taskId: task.id,
          robotId
        },
        data: {
          completedAt: new Date()
        }
      });

      await tx.systemLog.create({
        data: {
          level: "WARN",
          source: "simulacion",
          robotId,
          taskId: task.id,
          message:
            task.executionStage === "TO_TARGET"
              ? "El robot fallo durante el viaje y la tarea requiere asistencia."
              : "El robot fallo antes del origen y la tarea espera apoyo."
        }
      });
    });

    await this.robotService.markFailure(robotId);

    const updatedTask = await this.prisma.task.findUniqueOrThrow({
      where: { id: task.id }
    });

    return this.toTaskView(updatedTask);
  }

  private async toTaskView(task: Task): Promise<TaskView> {
    const recommendedRobots = await this.rankRobotsForTask(task);

    return {
      id: task.id,
      code: task.code ?? null,
      name: task.name,
      type: task.type,
      status: task.status,
      priority: task.priority,
      origin: { x: task.originX, y: task.originY },
      target: { x: task.targetX, y: task.targetY },
      robotId: task.robotId,
      loadTypeRequired: task.loadTypeRequired === "BULK_LOAD" ? "BULK_LOAD" : "UNIT_LOAD",
      requiresRefrigeration: task.requiresRefrigeration,
      requiresFragileHandling: task.requiresFragileHandling,
      requiredAmount: task.requiredAmount,
      amountUnit: task.amountUnit,
      executionStage: task.executionStage,
      recommendedRobots,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString()
    };
  }

  private async rankRobotsForTask(task: Task): Promise<TaskRobotCandidateView[]> {
    const [robots, reservedTasks] = await Promise.all([
      this.prisma.robot.findMany({
        orderBy: { code: "asc" }
      }),
      this.listReservedRobotTasks(task.id)
    ]);

    const runtimeRobots = this.robotService.getAll();
    const reservedRobots = new Map(
      reservedTasks
        .filter((reservedTask) => reservedTask.robotId)
        .map((reservedTask) => [reservedTask.robotId as string, reservedTask] as const)
    );

    const ranked = robots
      .filter((robot) => this.compatibilityService.isRobotCompatible(robot, task))
      .map((robot) => {
        const runtimeRobot = runtimeRobots.find((entry) => entry.id === robot.id);
        const reservedTask = reservedRobots.get(robot.id);
        const distanceToOrigin = runtimeRobot
          ? Math.abs(runtimeRobot.position.x - task.originX) + Math.abs(runtimeRobot.position.y - task.originY)
          : Number.MAX_SAFE_INTEGER;
        const idle = runtimeRobot?.status === "IDLE";
        const runtimeAvailable =
          Boolean(runtimeRobot?.isActive) &&
          idle &&
          runtimeRobot?.catalogStatus !== "mantenimiento" &&
          runtimeRobot?.catalogStatus !== "averiado";
        const available = runtimeAvailable && !reservedTask;
        const reservationLabel = reservedTask
          ? this.getRobotReservationLabel(reservedTask)
          : null;

        return {
          robotId: robot.id,
          robotCode: robot.code,
          robotName: robot.name ?? robot.code,
          nodeId: runtimeRobot?.assignedNodeCode ?? null,
          distanceToOrigin,
          availabilityLabel: available ? "Disponible" : reservationLabel ?? "No disponible",
          reservationLabel,
          priorityLabel: null,
          isAvailable: available,
          availabilityRank: available ? 0 : 1,
          speedRank: -(robot.speedCellsPerSec ?? 0)
        };
      })
      .sort((left, right) => {
        if (left.availabilityRank !== right.availabilityRank) {
          return left.availabilityRank - right.availabilityRank;
        }

        if (left.distanceToOrigin !== right.distanceToOrigin) {
          return left.distanceToOrigin - right.distanceToOrigin;
        }

        return left.speedRank - right.speedRank;
      });

    return ranked.map(({ availabilityRank, speedRank, ...candidate }, index) => ({
      ...candidate,
      priorityLabel:
        index === 0 && candidate.isAvailable
          ? "Mejor opcion"
          : candidate.isAvailable && candidate.distanceToOrigin === ranked[0]?.distanceToOrigin
            ? "Mas cercano"
            : null
    }));
  }

  private async listReservedRobotTasks(excludedTaskId?: string) {
    return this.prisma.task.findMany({
      where: {
        ...(excludedTaskId ? { id: { not: excludedTaskId } } : {}),
        robotId: { not: null },
        status: { in: ["ASSIGNED", "REASSIGNED", "IN_PROGRESS"] }
      },
      include: {
        assignments: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            assignedByNode: {
              select: { code: true }
            }
          }
        }
      }
    });
  }

  private async findRobotReservation(robotId: string, excludedTaskId?: string) {
    const reservedTasks = await this.listReservedRobotTasks(excludedTaskId);
    return reservedTasks.find((task) => task.robotId === robotId) ?? null;
  }

  private getRobotReservationLabel(task: {
    status: string;
    assignments: Array<{ assignedByNode: { code: string } | null }>;
  }): string {
    if (task.status === "IN_PROGRESS") {
      return "En viaje";
    }

    const operatorCode = task.assignments[0]?.assignedByNode?.code;
    return operatorCode ? `Reservado por ${operatorCode}` : "Reservado por otro operador";
  }

  private getRobotReservationMessage(
    robotCode: string,
    task: {
      code: string | null;
      status: string;
      assignments: Array<{ assignedByNode: { code: string } | null }>;
    }
  ): string {
    const taskCode = task.code ?? "sin codigo";
    if (task.status === "IN_PROGRESS") {
      return `El robot ${robotCode} ya esta ejecutando la tarea ${taskCode}.`;
    }

    const operatorCode = task.assignments[0]?.assignedByNode?.code;
    return operatorCode
      ? `El robot ${robotCode} ya esta reservado por ${operatorCode} para la tarea ${taskCode}.`
      : `El robot ${robotCode} ya esta reservado para la tarea ${taskCode}.`;
  }
}
