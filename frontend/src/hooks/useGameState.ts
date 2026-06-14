import { useEffect, useMemo, useState } from "react";

import { api } from "../lib/api";
import { gameSocket } from "../lib/game-socket";
import type { GameDirection, GameStateSnapshot, SystemMode } from "../types";

const initialState: GameStateSnapshot = {
  status: "IDLE",
  grid: {
    width: 10,
    height: 10,
    tickRateHz: 2
  },
  players: [],
  collectibles: [],
  obstacles: [],
  leaderboard: [],
  tick: 0
};

export const useGameState = () => {
  const [systemMode, setSystemMode] = useState<SystemMode>("WAREHOUSE");
  const [state, setState] = useState<GameStateSnapshot>(initialState);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    void api.getSystemMode().then((mode) => {
      if (active) {
        setSystemMode(mode);
      }
    });
    void api.getGameState().then((snapshot) => {
      if (active) {
        setState(snapshot);
      }
    });

    const onConnect = () => {
      setConnectionState("connected");
      setErrorMessage(null);
    };
    const onDisconnect = () => {
      setConnectionState("disconnected");
    };
    const onModeChanged = (payload: { mode: SystemMode }) => {
      setSystemMode(payload.mode);
      if (payload.mode === "WAREHOUSE") {
        setPlayerId(null);
      }
    };
    const onState = (snapshot: GameStateSnapshot) => {
      setState(snapshot);
    };
    const onJoined = (payload: { playerId: string }) => {
      setPlayerId(payload.playerId);
      setErrorMessage(null);
    };
    const onError = (payload: { message: string }) => {
      setErrorMessage(payload.message);
    };

    gameSocket.on("connect", onConnect);
    gameSocket.on("disconnect", onDisconnect);
    gameSocket.on("system:modeChanged", onModeChanged);
    gameSocket.on("game:state", onState);
    gameSocket.on("game:joined", onJoined);
    gameSocket.on("game:error", onError);
    gameSocket.connect();

    return () => {
      active = false;
      gameSocket.off("connect", onConnect);
      gameSocket.off("disconnect", onDisconnect);
      gameSocket.off("system:modeChanged", onModeChanged);
      gameSocket.off("game:state", onState);
      gameSocket.off("game:joined", onJoined);
      gameSocket.off("game:error", onError);
      gameSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (playerId && !state.players.some((player) => player.id === playerId)) {
      setPlayerId(null);
    }
  }, [playerId, state.players]);

  const player = useMemo(
    () => state.players.find((entry) => entry.id === playerId) ?? null,
    [playerId, state.players]
  );

  return {
    systemMode,
    state,
    player,
    playerId,
    connectionState,
    errorMessage,
    async joinGame(name: string) {
      setErrorMessage(null);
      gameSocket.emit("game:join", { name });
    },
    changeDirection(direction: GameDirection) {
      if (!playerId) {
        return;
      }

      gameSocket.emit("game:changeDirection", {
        playerId,
        direction
      });
    },
    leaveGame() {
      if (!playerId) {
        return;
      }

      gameSocket.emit("game:leave", { playerId });
      setPlayerId(null);
    }
  };
};
