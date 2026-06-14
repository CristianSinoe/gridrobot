import type { GamePlayer, GameStatus } from "../types";

interface GameHudProps {
  player: GamePlayer | null;
  status: GameStatus;
}

export const GameHud = ({ player, status }: GameHudProps) => {
  return (
    <section className="game-hud">
      <article className="game-hud__card">
        <span>Jugador</span>
        <strong>{player?.name ?? "Sin unir"}</strong>
      </article>
      <article className="game-hud__card">
        <span>Puntuación</span>
        <strong>{player?.score ?? 0}</strong>
      </article>
      <article className="game-hud__card">
        <span>Vidas</span>
        <strong>{player?.lives ?? 0}</strong>
      </article>
      <article className="game-hud__card">
        <span>Estado</span>
        <strong>
          {!player ? "Esperando ingreso" : !player.connected ? "Desconectado" : !player.alive ? "Eliminado" : status}
        </strong>
      </article>
    </section>
  );
};
