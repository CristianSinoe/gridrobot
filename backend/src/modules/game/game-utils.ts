import crypto from "node:crypto";

import type {
  GameCollectible,
  GameCollectibleType,
  GameDirection,
  GameGridConfig,
  GameLeaderboardItem,
  GameObstacle,
  GamePlayer,
  GridPosition
} from "../../shared/types.js";

const DIRECTIONS: Record<GameDirection, GridPosition> = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 }
};

export const GAME_PLAYER_COLORS = [
  "#5fc8c0",
  "#ebc07d",
  "#f19a8b",
  "#88d8d2",
  "#7ab9ff",
  "#f0a6ca",
  "#9ce37d",
  "#ffd166"
] as const;

export const toCellKey = (position: GridPosition): string => `${position.x}:${position.y}`;

export const wrapAround = (position: GridPosition, grid: GameGridConfig): GridPosition => ({
  x: (position.x + grid.width) % grid.width,
  y: (position.y + grid.height) % grid.height
});

export const movePosition = (
  position: GridPosition,
  direction: GameDirection,
  grid: GameGridConfig
): GridPosition => {
  const delta = DIRECTIONS[direction];

  return wrapAround(
    {
      x: position.x + delta.x,
      y: position.y + delta.y
    },
    grid
  );
};

export const pickPlayerColor = (index: number): string =>
  GAME_PLAYER_COLORS[index % GAME_PLAYER_COLORS.length] ?? GAME_PLAYER_COLORS[0];

export const buildLeaderboard = (players: GamePlayer[]): GameLeaderboardItem[] =>
  [...players]
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      if (right.lives !== left.lives) {
        return right.lives - left.lives;
      }

      return left.joinedAt.localeCompare(right.joinedAt);
    })
    .map((player) => ({
      playerId: player.id,
      name: player.name,
      color: player.color,
      score: player.score,
      lives: player.lives,
      alive: player.alive,
      connected: player.connected,
      joinedAt: player.joinedAt,
      statusLabel: player.connected ? (player.alive ? "Vivo" : "Eliminado") : "Desconectado"
    }));

const isPositionBlocked = (
  position: GridPosition,
  players: GamePlayer[],
  obstacles: GameObstacle[],
  collectibles: GameCollectible[],
  options?: {
    ignorePlayerIds?: string[];
    avoidAdjacentPlayers?: boolean;
  }
): boolean => {
  const ignorePlayerIds = new Set(options?.ignorePlayerIds ?? []);

  if (players.some((player) => !ignorePlayerIds.has(player.id) && player.connected && player.alive && toCellKey(player.position) === toCellKey(position))) {
    return true;
  }

  if (obstacles.some((obstacle) => toCellKey(obstacle.position) === toCellKey(position))) {
    return true;
  }

  if (collectibles.some((collectible) => toCellKey(collectible.position) === toCellKey(position))) {
    return true;
  }

  if (options?.avoidAdjacentPlayers) {
    for (const player of players) {
      if (!player.connected || !player.alive || ignorePlayerIds.has(player.id)) {
        continue;
      }

      const distance = Math.abs(player.position.x - position.x) + Math.abs(player.position.y - position.y);
      if (distance <= 1) {
        return true;
      }
    }
  }

  return false;
};

export const findRandomFreeCell = (
  grid: GameGridConfig,
  players: GamePlayer[],
  obstacles: GameObstacle[],
  collectibles: GameCollectible[],
  options?: {
    ignorePlayerIds?: string[];
    avoidAdjacentPlayers?: boolean;
    maxAttempts?: number;
  }
): GridPosition | null => {
  const maxAttempts = options?.maxAttempts ?? grid.width * grid.height * 2;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = {
      x: Math.floor(Math.random() * grid.width),
      y: Math.floor(Math.random() * grid.height)
    };

    if (!isPositionBlocked(candidate, players, obstacles, collectibles, options)) {
      return candidate;
    }
  }

  for (let y = 0; y < grid.height; y += 1) {
    for (let x = 0; x < grid.width; x += 1) {
      const candidate = { x, y };
      if (!isPositionBlocked(candidate, players, obstacles, collectibles, options)) {
        return candidate;
      }
    }
  }

  return null;
};

export const createObstacle = (position: GridPosition): GameObstacle => ({
  id: crypto.randomUUID(),
  position
});

export const createCollectible = (
  type: GameCollectibleType,
  position: GridPosition
): GameCollectible => ({
  id: crypto.randomUUID(),
  type,
  position,
  value: type === "POINT" ? 10 : type === "BONUS" ? 25 : 0
});
