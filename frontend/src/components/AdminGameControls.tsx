import type { GameStateSnapshot, SystemMode } from "../types";

interface AdminGameControlsProps {
  mode: SystemMode;
  gameState: GameStateSnapshot | null;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
}

export const AdminGameControls = ({
  mode,
  gameState,
  onStart,
  onPause,
  onResume,
  onReset
}: AdminGameControlsProps) => {
  return (
    <section className="utility-card utility-card--accent">
      <p className="eyebrow">Control de partida</p>
      <strong className="utility-card__big">{gameState?.status ?? "IDLE"}</strong>
      <p className="utility-card__inline">estado actual</p>
      <div className="game-admin-actions">
        <button type="button" className="header-button button-primary" aria-label="Iniciar partida" onClick={onStart} disabled={mode !== "GAME"}>
          Iniciar
        </button>
        <button type="button" className="header-button button-secondary" aria-label="Pausar partida" onClick={onPause} disabled={mode !== "GAME"}>
          Pausar
        </button>
        <button type="button" className="header-button button-secondary" aria-label="Reanudar partida" onClick={onResume} disabled={mode !== "GAME"}>
          Reanudar
        </button>
        <button type="button" className="header-button button-danger" aria-label="Reiniciar partida" onClick={onReset} disabled={mode !== "GAME"}>
          Reiniciar
        </button>
      </div>
      <p className="utility-card__hint">
        {mode === "GAME"
          ? `${gameState?.players.length ?? 0} jugadores conectados y tick ${gameState?.tick ?? 0}.`
          : "Cambie a GRIDBOT CHASE para habilitar la partida."}
      </p>
    </section>
  );
};
