import { useEffect, useState } from "react";

import { GameBoard } from "../components/GameBoard";
import { GameHud } from "../components/GameHud";
import { GameJoinForm } from "../components/GameJoinForm";
import { GameLeaderboard } from "../components/GameLeaderboard";
import { GamePad } from "../components/GamePad";
import { useGameState } from "../hooks/useGameState";
import { connectionStateText } from "../lib/ui-text";

const THEME_STORAGE_KEY = "gridrobot.theme";
const GAME_ACCESS_FLASH_STORAGE_KEY = "gridrobot.game-access-flash";

export const GamePage = () => {
  const { systemMode, state, player, connectionState, errorMessage, joinGame, changeDirection, leaveGame } =
    useGameState();
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" ? "light" : "dark";
  });
  const [accessFlashMessage, setAccessFlashMessage] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    const message = window.sessionStorage.getItem(GAME_ACCESS_FLASH_STORAGE_KEY);
    if (!message) {
      return;
    }

    setAccessFlashMessage(message);
    window.sessionStorage.removeItem(GAME_ACCESS_FLASH_STORAGE_KEY);
  }, []);

  return (
    <main className="game-page">
      <section className="game-page__hero">
        <p className="eyebrow">Experiencia pública</p>
        <h1>GRIDBOT CHASE</h1>
        <p className="game-page__subtitle">
          {systemMode === "GAME"
            ? state.status === "PAUSED"
              ? "Partida pausada"
              : state.status === "RUNNING"
                ? "Recolecta puntos, evita obstáculos y sobrevive."
                : "Esperando inicio de partida…"
            : "El modo juego no está activo en este momento."}
        </p>
        <div className="game-page__hero-actions">
          <span className="header-badge">Conexión {connectionStateText[connectionState]}</span>
          <button
            type="button"
            className="header-chip theme-toggle"
            aria-label={theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
            title={theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
            onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
          >
            {theme === "dark" ? "Tema claro" : "Tema oscuro"}
          </button>
        </div>
        {accessFlashMessage ? <p className="game-access-flash">{accessFlashMessage}</p> : null}
      </section>

      {!player ? (
        <GameJoinForm
          disabled={systemMode !== "GAME" || connectionState !== "connected"}
          errorMessage={errorMessage}
          onJoin={joinGame}
        />
      ) : (
        <>
          <GameHud player={player} status={state.status} />
          <section className="game-layout">
            <section className="game-panel game-panel--board">
              <div className="panel__header">
                <div>
                  <p className="eyebrow">Tablero</p>
                  <h2>Cuadrícula {state.grid.width} x {state.grid.height}</h2>
                </div>
                <button type="button" className="header-button" onClick={leaveGame}>
                  Salir
                </button>
              </div>
              <GameBoard
                width={state.grid.width}
                height={state.grid.height}
                players={state.players}
                collectibles={state.collectibles}
                obstacles={state.obstacles}
                playerId={player.id}
              />
            </section>

            <section className="game-side">
              <GamePad
                disabled={systemMode !== "GAME" || state.status !== "RUNNING" || !player.alive || !player.connected}
                onDirection={changeDirection}
              />
              <GameLeaderboard items={state.leaderboard} />
            </section>
          </section>
          {errorMessage ? <p className="game-error">{errorMessage}</p> : null}
        </>
      )}
    </main>
  );
};
