import type { Server as HttpServer } from "node:http";

import { Server as SocketIOServer } from "socket.io";

import { buildCorsOptions } from "../../config/network.js";
import type { WorldBootstrap, WorldSnapshot } from "../../shared/types.js";
import type { ActiveSession, OperatorNodeCode, SessionAccessService } from "../central-access/session-access-service.js";
import type { GameService } from "../game/game-service.js";
import { registerAdminGameSocketHandlers } from "../game/game-socket-handler.js";
import type { GridManager } from "../grid/grid-manager.js";
import type { ObstacleManager } from "../obstacles/obstacle-manager.js";
import type { PreviewRouteService } from "../preview-routes/preview-route-service.js";
import type { MqttBridgeService } from "../mqtt/mqtt-bridge-service.js";
import type { RobotService } from "../robots/robot-service.js";
import type { SystemModeService } from "../system/system-mode-service.js";
import type { TaskService } from "../tasks/task-service.js";
import type { WorldVisibilityService } from "../world-visibility/world-visibility-service.js";
import type { SocketConnectionLimiter } from "./socket-security.js";

export interface GatewayBaseDependencies {
  sessionAccessService: SessionAccessService;
  robotService: RobotService;
  obstacleManager: ObstacleManager;
  gridManager: GridManager;
  taskService: TaskService;
  worldVisibilityService: WorldVisibilityService;
  previewRouteService: PreviewRouteService;
}

export interface GatewayDependencies extends GatewayBaseDependencies {
  systemModeService: SystemModeService;
  gameService: GameService;
  socketConnectionLimiter: SocketConnectionLimiter;
  mqttBridgeService: MqttBridgeService;
}

export type ViewerPayloadDependencies = Omit<GatewayBaseDependencies, "sessionAccessService">;

export type SocketViewerContext =
  | { role: "central"; nodeId: null; robotId: null }
  | { role: "operator"; nodeId: OperatorNodeCode; robotId: string | null };

const operatorFocusBySocket = new Map<string, string | null>();

export const getFocusedRobotIdForSocket = (socketId: string): string | null =>
  operatorFocusBySocket.get(socketId) ?? null;

export const getViewerContext = (
  _dependencies: Pick<GatewayDependencies, "robotService">,
  session: ActiveSession,
  focusedRobotId: string | null = null
): SocketViewerContext => {
  if (session.role === "central") {
    return {
      role: "central",
      nodeId: null,
      robotId: null
    };
  }

  return {
    role: "operator",
    nodeId: session.nodeId as OperatorNodeCode,
    robotId: focusedRobotId
  };
};

export const buildWorldPayload = async (
  dependencies: ViewerPayloadDependencies,
  viewer: SocketViewerContext,
  tick?: number,
  includeTasks = true
): Promise<WorldBootstrap | WorldSnapshot> => {
  const { width, height } = dependencies.gridManager.getDimensions();

  if (viewer.role === "central") {
    const payload = {
      width,
      height,
      robots: dependencies.robotService.getAll(),
      obstacles: dependencies.worldVisibilityService.getOfficiallyDiscoveredObstacles(),
      previewRoutes: dependencies.previewRouteService.getAll(),
      ...(includeTasks ? { tasks: await dependencies.taskService.list() } : {})
    };

    return typeof tick === "number" ? { tick, ...payload } : payload;
  }

  const robotId = viewer.robotId;
  const robots = dependencies.robotService.getAll();
  const obstacles = robotId
    ? dependencies.worldVisibilityService.getVisibleObstaclesForRobot(robotId)
    : dependencies.worldVisibilityService.getOfficiallyDiscoveredObstacles();
  const payload = {
    width,
    height,
    robots,
    obstacles,
    previewRoutes: dependencies.previewRouteService.getForOperator(viewer.nodeId, viewer.robotId),
    ...(includeTasks ? { tasks: await dependencies.taskService.list() } : {})
  };

  return typeof tick === "number" ? { tick, ...payload } : payload;
};

export const emitTasksToAllViewers = async (
  io: SocketIOServer,
  dependencies: GatewayBaseDependencies
): Promise<void> => {
  for (const socket of io.sockets.sockets.values()) {
    const token = typeof socket.handshake.auth.sessionToken === "string" ? socket.handshake.auth.sessionToken : "";
    const session = dependencies.sessionAccessService.getSessionByToken(token);
    if (!session) {
      continue;
    }

    getViewerContext(
      dependencies,
      session,
      operatorFocusBySocket.get(socket.id) ?? null
    );
    const tasks = await dependencies.taskService.list();
    socket.emit("tasks:list", tasks);
  }
};

export const emitObstaclesToAllViewers = async (
  io: SocketIOServer,
  dependencies: GatewayBaseDependencies
): Promise<void> => {
  for (const socket of io.sockets.sockets.values()) {
    const token = typeof socket.handshake.auth.sessionToken === "string" ? socket.handshake.auth.sessionToken : "";
    const session = dependencies.sessionAccessService.getSessionByToken(token);
    if (!session) {
      continue;
    }

    const viewer = getViewerContext(
      dependencies,
      session,
      operatorFocusBySocket.get(socket.id) ?? null
    );
    const obstacles =
      viewer.role === "central"
        ? dependencies.worldVisibilityService.getOfficiallyDiscoveredObstacles()
        : viewer.robotId
          ? dependencies.worldVisibilityService.getVisibleObstaclesForRobot(viewer.robotId)
          : [];
    socket.emit("obstacle:list", obstacles);
  }
};

export const emitPreviewRoutesToAllViewers = async (
  io: SocketIOServer,
  dependencies: GatewayBaseDependencies
): Promise<void> => {
  for (const socket of io.sockets.sockets.values()) {
    const token = typeof socket.handshake.auth.sessionToken === "string" ? socket.handshake.auth.sessionToken : "";
    const session = dependencies.sessionAccessService.getSessionByToken(token);
    if (!session) {
      continue;
    }

    const previewRoutes =
      session.role === "central"
        ? dependencies.previewRouteService.getAll()
        : dependencies.previewRouteService.getForOperator(
            session.nodeId as OperatorNodeCode,
            operatorFocusBySocket.get(socket.id) ?? null
          );
    socket.emit("preview:list", previewRoutes);
  }
};

export const createSocketGateway = (
  httpServer: HttpServer,
  dependencies: GatewayDependencies
): SocketIOServer => {
  const io = new SocketIOServer(httpServer, {
    path: "/socket.io",
    cors: {
      ...buildCorsOptions()
    }
  });

  io.on("connection", (socket) => {
    const connectionAttempt = dependencies.socketConnectionLimiter.register(socket);
    if (!connectionAttempt.allowed) {
      socket.emit("gateway:error", {
        message: "Se alcanzó el límite de conexiones permitidas para esta red."
      });
      socket.disconnect(true);
      return;
    }

    const clientIp = connectionAttempt.clientIp;
    const sessionToken =
      typeof socket.handshake.auth.sessionToken === "string" ? socket.handshake.auth.sessionToken : "";
    const attachedSession = dependencies.sessionAccessService.attachSocket(
      sessionToken,
      socket.id,
      clientIp
    );

    if (!attachedSession) {
      socket.emit("gateway:error", {
        message: "La sesion seleccionada ya no es valida. Inicie sesion de nuevo."
      });
      dependencies.socketConnectionLimiter.release(clientIp);
      socket.disconnect(true);
      return;
    }

    if (dependencies.systemModeService.isGameMode() && attachedSession.role !== "central") {
      socket.emit("gateway:error", {
        message: "El sistema está en modo juego. Esta acción no está disponible."
      });
      dependencies.socketConnectionLimiter.release(clientIp);
      socket.disconnect(true);
      return;
    }

    const viewer = getViewerContext(dependencies, attachedSession);
    operatorFocusBySocket.set(socket.id, null);
    registerAdminGameSocketHandlers(socket, {
      sessionAccessService: dependencies.sessionAccessService,
      systemModeService: dependencies.systemModeService,
      gameService: dependencies.gameService,
      socketConnectionLimiter: dependencies.socketConnectionLimiter
    });

    void buildWorldPayload(dependencies, viewer).then((payload) => {
      socket.emit("world:bootstrap", payload);
    });
    socket.emit("network:status", {
      mqttConnectionState: dependencies.mqttBridgeService.getConnectionState()
    });
    socket.emit("system:modeChanged", {
      mode: dependencies.systemModeService.getMode()
    });

    socket.on("tasks:query", async (payload?: { robotId?: string }) => {
      try {
        const requestedRobotId = viewer.role === "operator" ? undefined : payload?.robotId;
        const tasks = await dependencies.taskService.list(requestedRobotId);
        socket.emit("tasks:list", tasks);
      } catch (error) {
        socket.emit("gateway:error", {
          message: error instanceof Error ? error.message : "La consulta de tareas falló."
        });
      }
    });

    socket.on("world:refresh", async () => {
      if (dependencies.systemModeService.isGameMode() && attachedSession.role !== "central") {
        socket.emit("gateway:error", {
          message: "El sistema está en modo juego. Esta acción no está disponible."
        });
        return;
      }

      await emitTasksToAllViewers(io, dependencies);
      await emitPreviewRoutesToAllViewers(io, dependencies);
    });

    socket.on("viewer:focusRobot", async (payload?: { robotId?: string | null }) => {
      if (dependencies.systemModeService.isGameMode() && attachedSession.role !== "central") {
        socket.emit("gateway:error", {
          message: "El sistema está en modo juego. Esta acción no está disponible."
        });
        return;
      }

      const requestedRobotId = payload?.robotId ?? null;
      if (requestedRobotId && !dependencies.robotService.getAll().some((robot) => robot.id === requestedRobotId)) {
        socket.emit("gateway:error", {
          message: "El robot seleccionado ya no existe en la simulacion."
        });
        return;
      }

      operatorFocusBySocket.set(socket.id, requestedRobotId);
      const session = dependencies.sessionAccessService.getSessionByToken(sessionToken);
      if (!session) {
        return;
      }

      const focusedViewer = getViewerContext(dependencies, session, requestedRobotId);
      const payloadSnapshot = await buildWorldPayload(dependencies, focusedViewer);
      socket.emit("world:bootstrap", payloadSnapshot);
    });

    socket.on("task:claim", async (payload: { taskId: string; robotId: string }) => {
      try {
        if (dependencies.systemModeService.isGameMode() && attachedSession.role !== "central") {
          throw new Error("El sistema está en modo juego. Esta acción no está disponible.");
        }
        const task = await dependencies.taskService.assign(
          payload.taskId,
          payload.robotId,
          attachedSession.nodeId,
          attachedSession.operatorId
        );
        await dependencies.previewRouteService.upsertPreview(payload.taskId, payload.robotId, attachedSession.nodeId);
        io.emit("task:updated", task);
        io.emit("robot:updated", dependencies.robotService.getById(payload.robotId));
        await emitTasksToAllViewers(io, dependencies);
        await emitPreviewRoutesToAllViewers(io, dependencies);
      } catch (error) {
        socket.emit("gateway:error", {
          message: error instanceof Error ? error.message : "La toma de tarea falló."
        });
      }
    });

    socket.on("task:assign", async (payload: { taskId: string; robotId: string }) => {
      try {
        if (dependencies.systemModeService.isGameMode() && attachedSession.role !== "central") {
          throw new Error("El sistema está en modo juego. Esta acción no está disponible.");
        }
        const task = await dependencies.taskService.assign(
          payload.taskId,
          payload.robotId,
          attachedSession.nodeId,
          attachedSession.operatorId
        );
        await dependencies.previewRouteService.upsertPreview(payload.taskId, payload.robotId, attachedSession.nodeId);
        io.emit("task:updated", task);
        io.emit("robot:updated", dependencies.robotService.getById(payload.robotId));
        await emitTasksToAllViewers(io, dependencies);
        await emitPreviewRoutesToAllViewers(io, dependencies);
      } catch (error) {
        socket.emit("gateway:error", {
          message: error instanceof Error ? error.message : "La asignación de tarea falló."
        });
      }
    });

    socket.on("obstacle:upsert", async (payload: { x: number; y: number }) => {
      try {
        if (dependencies.systemModeService.isGameMode() && attachedSession.role !== "central") {
          throw new Error("El sistema está en modo juego. Esta acción no está disponible.");
        }
        await dependencies.obstacleManager.upsert(payload);
        const changedRobots = await dependencies.robotService.recalculateRoutesForObstacles();
        await dependencies.previewRouteService.recalculateAll();
        const discovered = dependencies.worldVisibilityService.refreshDiscoveries();
        await emitObstaclesToAllViewers(io, dependencies);
        await emitPreviewRoutesToAllViewers(io, dependencies);
        changedRobots.forEach((robot) => io.emit("robot:updated", robot));
        if (discovered.length > 0) {
          io.emit("world:discovery", {
            obstacles: dependencies.worldVisibilityService.getOfficiallyDiscoveredObstacles()
          });
        }
      } catch (error) {
        socket.emit("gateway:error", {
          message: error instanceof Error ? error.message : "La actualización de obstáculos falló."
        });
      }
    });

    socket.on("obstacle:remove", async (payload: { x: number; y: number }) => {
      try {
        if (dependencies.systemModeService.isGameMode() && attachedSession.role !== "central") {
          throw new Error("El sistema está en modo juego. Esta acción no está disponible.");
        }
        await dependencies.obstacleManager.remove(payload);
        dependencies.worldVisibilityService.handleObstacleRemoved(payload);
        const changedRobots = await dependencies.robotService.recalculateRoutesForObstacles();
        await dependencies.previewRouteService.recalculateAll();
        await emitObstaclesToAllViewers(io, dependencies);
        await emitPreviewRoutesToAllViewers(io, dependencies);
        changedRobots.forEach((robot) => io.emit("robot:updated", robot));
      } catch (error) {
        socket.emit("gateway:error", {
          message: error instanceof Error ? error.message : "La eliminación de obstáculos falló."
        });
      }
    });

    socket.on("disconnect", () => {
      if (attachedSession.role === "operator") {
        dependencies.previewRouteService.clearByNode(attachedSession.nodeId);
        void emitPreviewRoutesToAllViewers(io, dependencies);
      }
      operatorFocusBySocket.delete(socket.id);
      dependencies.sessionAccessService.releaseBySocket(socket.id);
      dependencies.socketConnectionLimiter.release(clientIp);
    });
  });

  return io;
};
