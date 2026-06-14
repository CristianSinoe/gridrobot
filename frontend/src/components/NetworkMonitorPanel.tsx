import { useMemo, useState } from "react";

import type { EventLogEntry, GridPosition, RobotCommandType, RobotState } from "../types";

interface NetworkMonitorPanelProps {
  socketState: "connecting" | "connected" | "disconnected";
  mqttState: "connected" | "reconnecting" | "disconnected";
  historyEvents: EventLogEntry[];
  networkEvents: EventLogEntry[];
  selectedRobot: RobotState | null;
  selectedCell: GridPosition | null;
  onSendCommand: (payload: { robotId: string; command: RobotCommandType; speedCellsPerSec?: number }) => Promise<void>;
}

const mqttStateText = {
  connected: "Conectado",
  reconnecting: "Reconectando",
  disconnected: "Desconectado"
} as const;

const socketStateText = {
  connected: "Conectado",
  connecting: "Conectando",
  disconnected: "Desconectado"
} as const;

export const NetworkMonitorPanel = ({
  socketState,
  mqttState,
  historyEvents,
  networkEvents,
  selectedRobot,
  selectedCell,
  onSendCommand
}: NetworkMonitorPanelProps) => {
  const [pendingCommand, setPendingCommand] = useState<RobotCommandType | null>(null);
  const lastCommand = historyEvents.find((entry) => entry.type === "ACTUATOR_COMMAND") ?? null;
  const lastUpdate = networkEvents[0] ?? historyEvents[0] ?? null;
  const robotIsPaused = selectedRobot?.status === "WAITING";
  const hasSelectedRobot = Boolean(selectedRobot);
  const mqttReady = mqttState === "connected";
  const currentSpeed = useMemo(() => {
    if (!selectedRobot?.speedCellsPerSec) {
      return 1;
    }

    return Number(selectedRobot.speedCellsPerSec.toFixed(2));
  }, [selectedRobot?.speedCellsPerSec]);
  const nextLowerSpeed = Math.max(0.25, Number((currentSpeed - 0.25).toFixed(2)));
  const nextHigherSpeed = Math.min(5, Number((currentSpeed + 0.25).toFixed(2)));

  const sendCommand = async (payload: {
    robotId: string;
    command: RobotCommandType;
    speedCellsPerSec?: number;
  }) => {
    setPendingCommand(payload.command);
    try {
      await onSendCommand(payload);
    } finally {
      setPendingCommand(null);
    }
  };

  return (
    <section className="panel network-monitor">
      <div className="panel__header">
        <h2>Monitor MQTT</h2>
        <p>Evidencia de red, comandos y persistencia en tiempo real</p>
      </div>

      <div className="network-monitor__status-grid">
        <article className="network-monitor__status-card">
          <span>Socket.IO</span>
          <strong>{socketStateText[socketState]}</strong>
        </article>
        <article className="network-monitor__status-card">
          <span>MQTT</span>
          <strong>{mqttStateText[mqttState]}</strong>
        </article>
        <article className="network-monitor__status-card">
          <span>Último comando</span>
          <strong>{lastCommand?.type ?? "Sin comandos"}</strong>
        </article>
        <article className="network-monitor__status-card">
          <span>Última actualización</span>
          <strong>{lastUpdate ? new Date(lastUpdate.createdAt).toLocaleTimeString() : "Sin eventos"}</strong>
        </article>
      </div>

      <div className="network-monitor__content">
        <div className="network-monitor__column">
          <p className="eyebrow">Control de actuadores</p>
          <div className="network-monitor__command-box">
            <p className="network-monitor__command-target">
              {selectedRobot ? `Robot seleccionado: ${selectedRobot.name}` : "Seleccione un robot para enviar comandos."}
            </p>
            {selectedCell ? (
              <p className="network-monitor__command-target">
                Celda seleccionada: ({selectedCell.x}, {selectedCell.y})
              </p>
            ) : null}
            {selectedRobot ? (
              <p className="network-monitor__command-target">
                Velocidad actual: {currentSpeed.toFixed(2)} celdas/seg
              </p>
            ) : null}
            <div className="network-monitor__actions">
              <div className="network-monitor__command-row">
                <button
                  type="button"
                  className="header-button"
                  disabled={!mqttReady || !hasSelectedRobot || robotIsPaused || pendingCommand !== null}
                  onClick={() =>
                    selectedRobot &&
                    void sendCommand({ robotId: selectedRobot.id, command: "PAUSE" })
                  }
                >
                  Pausar
                </button>
                <button
                  type="button"
                  className="header-button"
                  disabled={!mqttReady || !hasSelectedRobot || !robotIsPaused || pendingCommand !== null}
                  onClick={() =>
                    selectedRobot &&
                    void sendCommand({ robotId: selectedRobot.id, command: "RESUME" })
                  }
                >
                  Reanudar
                </button>
              </div>

              <div className="network-monitor__speed-control" aria-label="Control de velocidad del robot">
                <button
                  type="button"
                  className="header-button network-monitor__speed-button"
                  disabled={!mqttReady || !hasSelectedRobot || pendingCommand !== null || currentSpeed <= 0.25}
                  onClick={() =>
                    selectedRobot &&
                    void sendCommand({
                      robotId: selectedRobot.id,
                      command: "SET_SPEED",
                      speedCellsPerSec: nextLowerSpeed
                    })
                  }
                >
                  -
                </button>
                <div className="network-monitor__speed-readout" aria-live="polite">
                  <span className="network-monitor__speed-label">Velocidad</span>
                  <strong>{currentSpeed.toFixed(2)}</strong>
                </div>
                <button
                  type="button"
                  className="header-button network-monitor__speed-button"
                  disabled={!mqttReady || !hasSelectedRobot || pendingCommand !== null || currentSpeed >= 5}
                  onClick={() =>
                    selectedRobot &&
                    void sendCommand({
                      robotId: selectedRobot.id,
                      command: "SET_SPEED",
                      speedCellsPerSec: nextHigherSpeed
                    })
                  }
                >
                  +
                </button>
              </div>
            </div>
            {!mqttReady ? (
              <p className="network-monitor__warning">
                La conexión MQTT está desconectada. Los actuadores quedan bloqueados hasta recuperar el enlace.
              </p>
            ) : null}
          </div>
        </div>

        <div className="network-monitor__column">
          <p className="eyebrow">Últimos eventos MQTT</p>
          <div className="network-monitor__event-list">
            {networkEvents.length === 0 ? <p className="empty-state">Todavía no hay eventos MQTT recientes.</p> : null}
            {networkEvents.map((entry) => (
              <article key={entry.id} className="network-monitor__event">
                <strong>{entry.type}</strong>
                <span>{entry.topic ?? entry.source}</span>
                <time>{new Date(entry.createdAt).toLocaleTimeString()}</time>
              </article>
            ))}
          </div>
        </div>

        <div className="network-monitor__column">
          <p className="eyebrow">Últimos eventos persistidos</p>
          <div className="network-monitor__event-list">
            {historyEvents.length === 0 ? <p className="empty-state">Todavía no hay eventos persistidos.</p> : null}
            {historyEvents.map((entry) => (
              <article key={entry.id} className="network-monitor__event">
                <strong>{entry.type}</strong>
                <span>{entry.robotId ?? entry.taskId ?? entry.source}</span>
                <time>{new Date(entry.createdAt).toLocaleTimeString()}</time>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
