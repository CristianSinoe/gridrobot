import type { GameCollectible, GameObstacle, GamePlayer } from "../types";

interface GameBoardProps {
  width: number;
  height: number;
  players: GamePlayer[];
  collectibles: GameCollectible[];
  obstacles: GameObstacle[];
  playerId?: string | null;
  variant?: "player" | "admin";
  large?: boolean;
  showPlayerLabels?: boolean;
}

export const GameBoard = ({
  width,
  height,
  players,
  collectibles,
  obstacles,
  playerId = null,
  variant = "player",
  large = false,
  showPlayerLabels = false
}: GameBoardProps) => {
  const playerByCell = new Map(players.map((player) => [`${player.position.x}:${player.position.y}`, player]));
  const collectibleByCell = new Map(
    collectibles.map((collectible) => [`${collectible.position.x}:${collectible.position.y}`, collectible])
  );
  const obstacleKeys = new Set(obstacles.map((obstacle) => `${obstacle.position.x}:${obstacle.position.y}`));
  const boardClassName = [
    "game-board",
    variant === "admin" ? "game-board--admin" : "",
    large ? "game-board--large" : ""
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={boardClassName} style={{ gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))` }}>
      {Array.from({ length: width * height }, (_, index) => {
        const x = index % width;
        const y = Math.floor(index / width);
        const key = `${x}:${y}`;
        const player = playerByCell.get(key);
        const collectible = collectibleByCell.get(key);
        const obstacle = obstacleKeys.has(key);
        const isOwnPlayer = player?.id === playerId;
        const playerLabel = player
          ? showPlayerLabels || variant === "admin"
            ? player.name.slice(0, 2).toUpperCase()
            : player.name.slice(0, 1).toUpperCase()
          : "";

        return (
          <div
            key={key}
            className={`game-board__cell${obstacle ? " is-obstacle" : ""}${isOwnPlayer ? " is-own-player" : ""}${player ? " has-player" : ""}${variant === "admin" ? " is-admin-cell" : ""}`}
          >
            {obstacle ? <span className="game-board__token game-board__token--obstacle" /> : null}
            {!obstacle && collectible ? (
              <span className={`game-board__token game-board__token--${collectible.type.toLowerCase()}`}>
                {collectible.type === "LIFE" ? "❤" : collectible.type === "BONUS" ? "★" : "•"}
              </span>
            ) : null}
            {player ? (
              <span
                className={`game-board__player${!player.alive ? " is-eliminated" : ""}`}
                style={{ background: player.color }}
                title={`${player.name} · ${player.score} pts`}
              >
                {playerLabel}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};
