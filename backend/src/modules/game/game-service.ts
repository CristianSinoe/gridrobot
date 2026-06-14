import crypto from "node:crypto";

import { logger } from "../../config/logger.js";
import type {
  GameCollectibleType,
  GameDirection,
  GamePlayer,
  GameStateSnapshot,
  RobotState
} from "../../shared/types.js";
import { badRequest } from "../../shared/errors.js";
import type { RobotService } from "../robots/robot-service.js";
import type { GameState } from "./game-state.js";
import {
  createCollectible,
  createObstacle,
  findRandomFreeCell,
  movePosition,
  pickPlayerColor,
  toCellKey
} from "./game-utils.js";

export interface GameServiceConfig {
  initialLives: number;
  maxLives: number;
  normalItems: number;
  normalPoints: number;
  bonusPoints: number;
  lifeItems: number;
  obstacles: number;
  bonusItems: number;
  invulnerableMs: number;
}

type GameEventName =
  | "stateChanged"
  | "playerJoined"
  | "playerLeft"
  | "scoreUpdated"
  | "leaderboardUpdated";

type GameListener = (
  eventName: GameEventName,
  snapshot: GameStateSnapshot,
  payload?: { player?: GamePlayer }
) => void;

export class GameService {
  private readonly listeners = new Set<GameListener>();

  public constructor(
    private readonly state: GameState,
    private readonly robotService: RobotService,
    private readonly config: GameServiceConfig
  ) {
    this.resetWorld();
  }

  public subscribe(listener: GameListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(): GameStateSnapshot {
    return this.state.toSnapshot();
  }

  public resetWorld(): GameStateSnapshot {
    this.state.reset();
    this.populateObstacles();
    this.populateCollectibles("POINT", this.config.normalItems);
    this.populateCollectibles("BONUS", this.config.bonusItems);
    this.populateCollectibles("LIFE", this.config.lifeItems);

    return this.emitState("stateChanged");
  }

  public startGame(): GameStateSnapshot {
    const snapshot = this.state.toSnapshot();
    if (snapshot.players.length === 0) {
      throw badRequest("No hay jugadores unidos para iniciar la partida.");
    }

    this.state.setStatus("RUNNING");
    return this.emitState("stateChanged");
  }

  public pauseGame(): GameStateSnapshot {
    if (this.state.getStatus() === "RUNNING") {
      this.state.setStatus("PAUSED");
    }

    return this.emitState("stateChanged");
  }

  public resumeGame(): GameStateSnapshot {
    if (this.state.getStatus() === "PAUSED" || this.state.getStatus() === "IDLE") {
      this.state.setStatus("RUNNING");
    }

    return this.emitState("stateChanged");
  }

  public finishGame(): GameStateSnapshot {
    this.state.setStatus("FINISHED");
    return this.emitState("stateChanged");
  }

  public joinPlayer(socketId: string, name: string): GamePlayer {
    const existingPlayerId = this.state.getPlayerIdBySocket(socketId);
    if (existingPlayerId) {
      this.leavePlayer(existingPlayerId);
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 18) {
      throw badRequest("Ingrese un nombre corto de 2 a 18 caracteres.");
    }

    const robot = this.findAvailableRobot();
    if (!robot) {
      throw badRequest("No hay robots disponibles para unirse a la partida.");
    }

    const position = findRandomFreeCell(
      this.state.getGrid(),
      this.state.getPlayers(),
      this.state.getObstacles(),
      this.state.getCollectibles(),
      { avoidAdjacentPlayers: true }
    );

    if (!position) {
      throw badRequest("No se encontró una celda segura para agregar un jugador.");
    }

    const players = this.state.getPlayers();
    const player: GamePlayer = {
      id: crypto.randomUUID(),
      name: trimmedName,
      robotId: robot.id,
      color: pickPlayerColor(players.length),
      position,
      direction: "RIGHT",
      nextDirection: "RIGHT",
      score: 0,
      lives: this.config.initialLives,
      alive: true,
      connected: true,
      joinedAt: new Date().toISOString()
    };

    this.state.reserveRobot(robot.id);
    this.state.upsertPlayer(player);
    this.state.bindSocket(socketId, player.id);
    this.emitState("playerJoined", { player });
    this.emitState("leaderboardUpdated");

    return player;
  }

  public markDisconnectedBySocket(socketId: string): GamePlayer | null {
    const playerId = this.state.unbindSocket(socketId);
    if (!playerId) {
      return null;
    }

    const player = this.state.getPlayerById(playerId);
    if (!player) {
      return null;
    }

    const nextPlayer: GamePlayer = {
      ...player,
      connected: false
    };

    this.state.upsertPlayer(nextPlayer);
    this.emitState("playerLeft", { player: nextPlayer });
    this.emitState("leaderboardUpdated");

    return nextPlayer;
  }

  public leavePlayer(playerId: string): GamePlayer | null {
    const player = this.state.getPlayerById(playerId);
    if (!player) {
      return null;
    }

    this.state.removePlayer(playerId);
    this.emitState("playerLeft", { player });
    this.emitState("leaderboardUpdated");

    if (this.state.getPlayers().every((entry) => !entry.alive || !entry.connected)) {
      this.state.setStatus("FINISHED");
      this.emitState("stateChanged");
    }

    return player;
  }

  public getPlayerIdBySocket(socketId: string): string | null {
    return this.state.getPlayerIdBySocket(socketId);
  }

  public changeDirection(playerId: string, direction: GameDirection): GamePlayer {
    const player = this.state.getPlayerById(playerId);
    if (!player) {
      throw badRequest("El jugador seleccionado ya no existe.");
    }

    if (!player.connected || !player.alive) {
      return player;
    }

    const nextPlayer: GamePlayer = {
      ...player,
      nextDirection: direction
    };

    this.state.upsertPlayer(nextPlayer);
    this.emitState("stateChanged");

    return nextPlayer;
  }

  public runTick(): GameStateSnapshot {
    if (this.state.getStatus() !== "RUNNING") {
      return this.state.toSnapshot();
    }

    this.state.incrementTick();
    const players = this.state.getPlayers();
    const movedPlayers = new Map<string, GamePlayer>();

    for (const player of players) {
      if (!player.alive || !player.connected) {
        movedPlayers.set(player.id, player);
        continue;
      }

      const appliedDirection = player.nextDirection ?? player.direction;
      const nextPosition = movePosition(player.position, appliedDirection, this.state.getGrid());
      const nextPlayer: GamePlayer = {
        ...player,
        direction: appliedDirection,
        position: nextPosition
      };
      delete nextPlayer.nextDirection;

      movedPlayers.set(player.id, nextPlayer);
    }

    const aliveOccupants = new Map<string, GamePlayer>();
    for (const player of players) {
      if (player.alive && player.connected) {
        aliveOccupants.set(toCellKey(player.position), player);
      }
    }

    const nextPlayers: GamePlayer[] = [];
    for (const movedPlayer of movedPlayers.values()) {
      if (!movedPlayer.alive || !movedPlayer.connected) {
        nextPlayers.push(movedPlayer);
        continue;
      }

      const obstacle = this.state
        .getObstacles()
        .find((entry) => toCellKey(entry.position) === toCellKey(movedPlayer.position));
      if (obstacle) {
        nextPlayers.push(this.resolveObstacleCollision(movedPlayer));
        continue;
      }

      const occupant = aliveOccupants.get(toCellKey(movedPlayer.position));
      if (occupant && occupant.id !== movedPlayer.id) {
        nextPlayers.push(
          this.resolveLifeLossCollision(movedPlayer, {
            respectInvulnerability: false
          })
        );
        continue;
      }

      nextPlayers.push(movedPlayer);
    }

    for (const player of nextPlayers) {
      this.state.upsertPlayer(player);
    }

    this.resolveCollectibles();

    if (this.state.getPlayers().every((player) => !player.alive || !player.connected)) {
      this.state.setStatus("FINISHED");
    }

    this.emitState("stateChanged");
    this.emitState("leaderboardUpdated");

    return this.state.toSnapshot();
  }

  private resolveObstacleCollision(player: GamePlayer): GamePlayer {
    return this.resolveLifeLossCollision(player, {
      respectInvulnerability: true
    });
  }

  private resolveLifeLossCollision(
    player: GamePlayer,
    options: {
      respectInvulnerability: boolean;
    }
  ): GamePlayer {
    const now = Date.now();
    if (options.respectInvulnerability && (player.invulnerableUntil ?? 0) > now) {
      return player;
    }

    const nextLives = player.lives - 1;
    if (nextLives <= 0) {
      return {
        ...player,
        lives: 0,
        alive: false
      };
    }

    const respawnPosition = findRandomFreeCell(
      this.state.getGrid(),
      this.state.getPlayers(),
      this.state.getObstacles(),
      this.state.getCollectibles(),
      { ignorePlayerIds: [player.id], avoidAdjacentPlayers: true }
    );

    if (!respawnPosition) {
      logger.warn({ playerId: player.id }, "No se encontró celda segura para respawn.");
      return {
        ...player,
        lives: nextLives,
        alive: false
      };
    }

    const respawnedPlayer: GamePlayer = {
      ...player,
      lives: nextLives,
      position: respawnPosition,
      direction: "RIGHT",
      nextDirection: "RIGHT",
      invulnerableUntil: now + this.config.invulnerableMs
    };

    return respawnedPlayer;
  }

  private resolveCollectibles(): void {
    const players = this.state.getPlayers();
    for (const player of players) {
      if (!player.alive || !player.connected) {
        continue;
      }

      const collectible = this.state
        .getCollectibles()
        .find((entry) => toCellKey(entry.position) === toCellKey(player.position));
      if (!collectible) {
        continue;
      }

      let nextPlayer: GamePlayer = player;
      if (collectible.type === "POINT") {
        nextPlayer = { ...player, score: player.score + this.config.normalPoints };
      } else if (collectible.type === "BONUS") {
        nextPlayer = { ...player, score: player.score + this.config.bonusPoints };
      } else {
        nextPlayer = { ...player, lives: Math.min(player.lives + 1, this.config.maxLives) };
      }

      this.state.upsertPlayer(nextPlayer);
      this.state.removeCollectible(collectible.id);
      this.spawnCollectible(collectible.type);
      this.emitState("scoreUpdated", { player: nextPlayer });
    }
  }

  private emitState(
    eventName: GameEventName,
    payload?: {
      player?: GamePlayer;
    }
  ): GameStateSnapshot {
    const snapshot = this.state.toSnapshot();
    for (const listener of this.listeners) {
      listener(eventName, snapshot, payload);
    }

    return snapshot;
  }

  private populateObstacles(): void {
    const obstacles = [];
    while (obstacles.length < this.config.obstacles) {
      const position = findRandomFreeCell(
        this.state.getGrid(),
        [],
        obstacles,
        []
      );
      if (!position) {
        break;
      }

      obstacles.push(createObstacle(position));
    }

    this.state.setObstacles(obstacles);
  }

  private populateCollectibles(type: GameCollectibleType, count: number): void {
    for (let index = 0; index < count; index += 1) {
      this.spawnCollectible(type);
    }
  }

  private spawnCollectible(type: GameCollectibleType): void {
    const position = findRandomFreeCell(
      this.state.getGrid(),
      this.state.getPlayers(),
      this.state.getObstacles(),
      this.state.getCollectibles()
    );
    if (!position) {
      return;
    }

    this.state.upsertCollectible(createCollectible(type, position));
  }

  private findAvailableRobot(): RobotState | null {
    return (
      this.robotService
        .getAll()
        .find((robot) => robot.isActive && robot.catalogStatus !== "averiado" && !this.state.isRobotAssigned(robot.id)) ??
      null
    );
  }
}
