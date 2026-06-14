import type { Server as SocketIOServer, Socket } from "socket.io";

import { badRequest } from "../../shared/errors.js";
import type { GameDirection, SystemMode } from "../../shared/types.js";
import type { SessionAccessService } from "../central-access/session-access-service.js";
import type { SystemModeService } from "../system/system-mode-service.js";
import type { GameService } from "./game-service.js";
import type { SocketConnectionLimiter } from "../websocket/socket-security.js";

export interface GameSocketDependencies {
  sessionAccessService: SessionAccessService;
  systemModeService: SystemModeService;
  gameService: GameService;
  socketConnectionLimiter: SocketConnectionLimiter;
}

const emitGameError = (socket: Socket, message: string): void => {
  socket.emit("game:error", { message });
};

export const registerAdminGameSocketHandlers = (
  socket: Socket,
  dependencies: GameSocketDependencies
): void => {
  const sessionToken =
    typeof socket.handshake.auth.sessionToken === "string" ? socket.handshake.auth.sessionToken : "";
  const session = dependencies.sessionAccessService.getSessionByToken(sessionToken);
  if (!session || session.role !== "central") {
    return;
  }

  socket.on("game:adminStart", () => {
    try {
      if (dependencies.systemModeService.isWarehouseMode()) {
        throw badRequest("Cambie primero el sistema a Modo juego.");
      }

      dependencies.gameService.startGame();
    } catch (error) {
      emitGameError(socket, error instanceof Error ? error.message : "No se pudo iniciar la partida.");
    }
  });

  socket.on("game:adminPause", () => {
    try {
      dependencies.gameService.pauseGame();
    } catch (error) {
      emitGameError(socket, error instanceof Error ? error.message : "No se pudo pausar la partida.");
    }
  });

  socket.on("game:adminResume", () => {
    try {
      dependencies.gameService.resumeGame();
    } catch (error) {
      emitGameError(socket, error instanceof Error ? error.message : "No se pudo reanudar la partida.");
    }
  });

  socket.on("game:adminReset", () => {
    try {
      dependencies.gameService.resetWorld();
    } catch (error) {
      emitGameError(socket, error instanceof Error ? error.message : "No se pudo reiniciar la partida.");
    }
  });
};

export const createGameSocketNamespace = (
  io: SocketIOServer,
  dependencies: GameSocketDependencies
) => {
  const namespace = io.of("/game");

  namespace.on("connection", (socket) => {
    const connectionAttempt = dependencies.socketConnectionLimiter.register(socket);
    if (!connectionAttempt.allowed) {
      emitGameError(socket, "Se alcanzó el límite de conexiones permitidas para esta red.");
      socket.disconnect(true);
      return;
    }

    const clientIp = connectionAttempt.clientIp;
    socket.emit("system:modeChanged", { mode: dependencies.systemModeService.getMode() });
    socket.emit("game:state", dependencies.gameService.getState());

    socket.on("game:join", (payload?: { name?: string }) => {
      try {
        if (dependencies.systemModeService.isWarehouseMode()) {
          throw badRequest("El modo juego no está activo en este momento.");
        }

        const player = dependencies.gameService.joinPlayer(socket.id, payload?.name ?? "");
        socket.emit("game:joined", { playerId: player.id });
      } catch (error) {
        emitGameError(socket, error instanceof Error ? error.message : "No se pudo unir al juego.");
      }
    });

    socket.on("game:changeDirection", (payload?: { playerId?: string; direction?: GameDirection }) => {
      try {
        if (
          payload?.direction !== "UP" &&
          payload?.direction !== "DOWN" &&
          payload?.direction !== "LEFT" &&
          payload?.direction !== "RIGHT"
        ) {
          throw badRequest("La dirección solicitada no es válida.");
        }

        const socketPlayerId = dependencies.gameService.getPlayerIdBySocket(socket.id);
        if (!socketPlayerId || socketPlayerId !== payload?.playerId) {
          throw badRequest("El jugador seleccionado ya no existe.");
        }

        dependencies.gameService.changeDirection(socketPlayerId, payload.direction);
      } catch (error) {
        emitGameError(socket, error instanceof Error ? error.message : "No se pudo cambiar la dirección.");
      }
    });

    socket.on("game:leave", (payload?: { playerId?: string }) => {
      if (!payload?.playerId) {
        return;
      }

      dependencies.gameService.leavePlayer(payload.playerId);
    });

    socket.on("disconnect", () => {
      dependencies.gameService.markDisconnectedBySocket(socket.id);
      dependencies.socketConnectionLimiter.release(clientIp);
    });
  });

  const unsubscribe = dependencies.gameService.subscribe((eventName, snapshot, payload) => {
    namespace.emit("game:state", snapshot);
    namespace.emit("game:leaderboard", snapshot.leaderboard);

    if (eventName === "playerJoined" && payload?.player) {
      namespace.emit("game:playerJoined", payload.player);
    }

    if (eventName === "playerLeft" && payload?.player) {
      namespace.emit("game:playerLeft", payload.player);
    }

    if (eventName === "scoreUpdated" && payload?.player) {
      namespace.emit("game:scoreUpdated", {
        playerId: payload.player.id,
        score: payload.player.score,
        lives: payload.player.lives
      });
    }
  });

  return {
    namespace,
    emitModeChanged(mode: SystemMode) {
      namespace.emit("system:modeChanged", { mode });
    },
    close() {
      unsubscribe();
      namespace.disconnectSockets(true);
    }
  };
};
