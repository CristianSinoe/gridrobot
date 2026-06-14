import type { CSSProperties } from "react";

import type { GameStateSnapshot } from "../types";

interface AdminGameStatsPanelProps {
  gameState: GameStateSnapshot;
}

const statusLabels: Record<GameStateSnapshot["status"], string> = {
  IDLE: "En espera",
  RUNNING: "En curso",
  PAUSED: "Pausada",
  FINISHED: "Finalizada"
};

const formatElapsedTime = (tick: number, tickRateHz: number) => {
  const totalSeconds = tickRateHz > 0 ? Math.floor(tick / tickRateHz) : 0;
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
};

export const AdminGameStatsPanel = ({ gameState }: AdminGameStatsPanelProps) => {
  const connectedPlayers = gameState.players.filter((player) => player.connected).length;
  const alivePlayers = gameState.players.filter((player) => player.alive).length;
  const playerById = new Map(gameState.players.map((player) => [player.id, player]));

  return (
    <aside className="admin-game-stats">
      <section className="game-panel admin-game-stats__summary">
        <p className="eyebrow">Resumen en tiempo real</p>
        <div className="admin-game-stats__grid">
          <article className="admin-game-stats__card">
            <span>Estado</span>
            <strong>{statusLabels[gameState.status]}</strong>
          </article>
          <article className="admin-game-stats__card">
            <span>Jugadores conectados</span>
            <strong>{connectedPlayers}</strong>
          </article>
          <article className="admin-game-stats__card">
            <span>Jugadores vivos</span>
            <strong>{alivePlayers}</strong>
          </article>
          <article className="admin-game-stats__card">
            <span>Tick actual</span>
            <strong>{gameState.tick}</strong>
          </article>
          <article className="admin-game-stats__card">
            <span>Tiempo estimado</span>
            <strong>{formatElapsedTime(gameState.tick, gameState.grid.tickRateHz)}</strong>
          </article>
          <article className="admin-game-stats__card">
            <span>Cuadrícula</span>
            <strong>
              {gameState.grid.width} x {gameState.grid.height}
            </strong>
          </article>
        </div>
      </section>

      <section className="game-panel admin-game-stats__leaderboard">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Jugadores en partida</p>
            <h2>Leaderboard</h2>
          </div>
        </div>

        <div className="admin-game-stats__list">
          {gameState.leaderboard.length === 0 ? (
            <p className="empty-state">Todavía no hay jugadores conectados.</p>
          ) : null}

          {gameState.leaderboard.map((entry, index) => {
            const player = playerById.get(entry.playerId);
            const rowStateClass = !entry.connected
              ? "is-disconnected"
              : !entry.alive
                ? "is-eliminated"
                : index === 0
                  ? "is-leading"
                  : "";

            return (
              <article
                key={entry.playerId}
                className={`admin-game-stats__row ${rowStateClass}`.trim()}
                style={{ "--player-color": entry.color } as CSSProperties}
              >
                <div className="admin-game-stats__rank">#{index + 1}</div>
                <div className="admin-game-stats__player">
                  <div className="admin-game-stats__player-header">
                    <strong>{entry.name}</strong>
                    <span className="admin-game-stats__status">{entry.statusLabel}</span>
                  </div>
                  <p>
                    {entry.score} pts · {entry.lives} vidas
                    {player?.robotId ? ` · Robot ${player.robotId}` : ""}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </aside>
  );
};
