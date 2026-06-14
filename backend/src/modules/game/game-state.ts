import type {
  GameCollectible,
  GameGridConfig,
  GameObstacle,
  GamePlayer,
  GameStateSnapshot,
  GameStatus
} from "../../shared/types.js";
import { buildLeaderboard } from "./game-utils.js";

export interface GameStateConfig {
  grid: GameGridConfig;
}

export class GameState {
  private status: GameStatus = "IDLE";
  private tick = 0;
  private players = new Map<string, GamePlayer>();
  private collectibles = new Map<string, GameCollectible>();
  private obstacles = new Map<string, GameObstacle>();
  private playerIdBySocket = new Map<string, string>();
  private assignedRobotIds = new Set<string>();

  public constructor(private readonly config: GameStateConfig) {}

  public getGrid(): GameGridConfig {
    return this.config.grid;
  }

  public getStatus(): GameStatus {
    return this.status;
  }

  public setStatus(status: GameStatus): void {
    this.status = status;
  }

  public getTick(): number {
    return this.tick;
  }

  public setTick(tick: number): void {
    this.tick = tick;
  }

  public incrementTick(): number {
    this.tick += 1;
    return this.tick;
  }

  public getPlayers(): GamePlayer[] {
    return Array.from(this.players.values());
  }

  public getPlayerById(playerId: string): GamePlayer | null {
    return this.players.get(playerId) ?? null;
  }

  public upsertPlayer(player: GamePlayer): void {
    this.players.set(player.id, player);
  }

  public removePlayer(playerId: string): void {
    const player = this.players.get(playerId);
    if (player?.robotId) {
      this.assignedRobotIds.delete(player.robotId);
    }

    this.players.delete(playerId);

    for (const [socketId, mappedPlayerId] of this.playerIdBySocket.entries()) {
      if (mappedPlayerId === playerId) {
        this.playerIdBySocket.delete(socketId);
      }
    }
  }

  public getCollectibles(): GameCollectible[] {
    return Array.from(this.collectibles.values());
  }

  public setCollectibles(collectibles: GameCollectible[]): void {
    this.collectibles = new Map(collectibles.map((collectible) => [collectible.id, collectible]));
  }

  public removeCollectible(collectibleId: string): void {
    this.collectibles.delete(collectibleId);
  }

  public upsertCollectible(collectible: GameCollectible): void {
    this.collectibles.set(collectible.id, collectible);
  }

  public getObstacles(): GameObstacle[] {
    return Array.from(this.obstacles.values());
  }

  public setObstacles(obstacles: GameObstacle[]): void {
    this.obstacles = new Map(obstacles.map((obstacle) => [obstacle.id, obstacle]));
  }

  public reserveRobot(robotId: string): void {
    this.assignedRobotIds.add(robotId);
  }

  public releaseRobot(robotId: string): void {
    this.assignedRobotIds.delete(robotId);
  }

  public isRobotAssigned(robotId: string): boolean {
    return this.assignedRobotIds.has(robotId);
  }

  public bindSocket(socketId: string, playerId: string): void {
    this.playerIdBySocket.set(socketId, playerId);
  }

  public unbindSocket(socketId: string): string | null {
    const playerId = this.playerIdBySocket.get(socketId) ?? null;
    this.playerIdBySocket.delete(socketId);
    return playerId;
  }

  public getPlayerIdBySocket(socketId: string): string | null {
    return this.playerIdBySocket.get(socketId) ?? null;
  }

  public reset(): void {
    this.status = "IDLE";
    this.tick = 0;
    this.players.clear();
    this.collectibles.clear();
    this.obstacles.clear();
    this.playerIdBySocket.clear();
    this.assignedRobotIds.clear();
  }

  public toSnapshot(): GameStateSnapshot {
    const players = this.getPlayers();

    return {
      status: this.status,
      grid: this.config.grid,
      players,
      collectibles: this.getCollectibles(),
      obstacles: this.getObstacles(),
      leaderboard: buildLeaderboard(players),
      tick: this.tick
    };
  }
}
