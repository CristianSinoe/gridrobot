import { AdminGameStatsPanel } from "../components/AdminGameStatsPanel";
import { GameBoard } from "../components/GameBoard";
import type { GameStateSnapshot, SystemMode } from "../types";

interface AdminGameViewProps {
  systemMode: SystemMode;
  gameState: GameStateSnapshot | null;
  onBackToAdmin: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
}

export const AdminGameView = ({
  systemMode,
  gameState,
  onBackToAdmin,
  onPause,
  onResume,
  onReset
}: AdminGameViewProps) => {
  if (systemMode !== "GAME") {
    return (
      <main className="admin-game-view admin-game-view--empty">
        <section className="game-panel admin-game-view__empty-panel">
          <p className="eyebrow">Vista de proyección</p>
          <h1>El sistema no está en modo juego.</h1>
          <p className="game-panel__subtitle">
            Cambie a GRIDBOT CHASE desde el panel administrador para proyectar la partida.
          </p>
          <div className="admin-game-view__actions">
            <button type="button" className="header-button" onClick={onBackToAdmin}>
              Volver al panel administrador
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (!gameState) {
    return (
      <main className="admin-game-view admin-game-view--empty">
        <section className="game-panel admin-game-view__empty-panel">
          <p className="eyebrow">Vista de proyección</p>
          <h1>Modo Juego GRIDBOT</h1>
          <p className="game-panel__subtitle">Conectando con el estado en tiempo real de la partida…</p>
        </section>
      </main>
    );
  }

  return (
    <main className="admin-game-view">
      <section className="admin-game-view__hero">
        <div>
          <p className="eyebrow">Vista de proyección</p>
          <h1>Modo Juego GRIDBOT</h1>
          <p className="game-panel__subtitle">
            Supervisión en vivo del tablero, los jugadores y el ritmo general de la partida.
          </p>
        </div>

        <div className="admin-game-view__actions">
          <button type="button" className="header-button" onClick={onBackToAdmin}>
            Volver al panel
          </button>
          {gameState.status === "RUNNING" ? (
            <button type="button" className="header-button" onClick={onPause}>
              Pausar
            </button>
          ) : (
            <button type="button" className="header-button" onClick={onResume}>
              Reanudar
            </button>
          )}
          <button type="button" className="header-button" onClick={onReset}>
            Reiniciar
          </button>
        </div>
      </section>

      <section className="admin-game-view__layout">
        <section className="game-panel game-panel--board admin-game-view__board">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Tablero principal</p>
              <h2>
                Cuadrícula {gameState.grid.width} x {gameState.grid.height}
              </h2>
            </div>
            <span className="header-badge">Tick {gameState.tick}</span>
          </div>

          <GameBoard
            width={gameState.grid.width}
            height={gameState.grid.height}
            players={gameState.players}
            collectibles={gameState.collectibles}
            obstacles={gameState.obstacles}
            variant="admin"
            large
            showPlayerLabels
          />
        </section>

        <AdminGameStatsPanel gameState={gameState} />
      </section>
    </main>
  );
};
