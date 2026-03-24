import { useState } from "react";

import type { ActiveSessionView } from "../types";

interface SessionManagerPanelProps {
  sessions: ActiveSessionView[];
  onRefresh: () => Promise<void>;
  onReleaseOperator: (nodeId: "PC-B01" | "PC-B02" | "PC-B03") => Promise<void>;
}

export const SessionManagerPanel = ({
  sessions,
  onRefresh,
  onReleaseOperator
}: SessionManagerPanelProps) => {
  const [pendingNodeId, setPendingNodeId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const centralSession = sessions.find((session) => session.role === "central") ?? null;
  const operatorSessions = sessions.filter((session) => session.role === "operator");

  return (
    <section className="panel">
      <div className="panel__header">
        <h2>Sesiones activas</h2>
        <button
          type="button"
          className="tab"
          onClick={async () => {
            setIsRefreshing(true);
            try {
              await onRefresh();
            } finally {
              setIsRefreshing(false);
            }
          }}
        >
          {isRefreshing ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      <div className="session-list session-list--admin">
        <article className="session-row">
          <div className="session-row__identity">
            <span className="session-row__icon">▦</span>
            <div>
              <h3>Panel Central</h3>
              <p>{centralSession ? "Sesion actual activa" : "Sin sesion activa"}</p>
            </div>
          </div>
          <div className="session-row__details">
            <span>IP: {centralSession?.clientIp ?? "-"}</span>
            <span>Login: {centralSession ? new Date(centralSession.connectedAt).toLocaleString() : "-"}</span>
          </div>
          <div className="session-row__actions">
            <span className="data-pill">{centralSession ? "Activa" : "Libre"}</span>
          </div>
        </article>

        {operatorSessions.map((session) => (
          <article key={`${session.role}-${session.nodeId}`} className="session-row">
            <div className="session-row__identity">
              <span className="session-row__icon">⌘</span>
              <div>
                <h3>{session.nodeId}</h3>
                <p>Sesion secundaria activa</p>
              </div>
            </div>
            <div className="session-row__details">
              <span>IP: {session.clientIp ?? "-"}</span>
              <span>Login: {new Date(session.connectedAt).toLocaleString()}</span>
            </div>
            <div className="session-row__actions">
              <button
                type="button"
                className="claim-button"
                disabled={!session.nodeId || pendingNodeId === session.nodeId}
                onClick={async () => {
                  if (!session.nodeId) {
                    return;
                  }

                  setPendingNodeId(session.nodeId);
                  try {
                    await onReleaseOperator(session.nodeId);
                  } finally {
                    setPendingNodeId(null);
                  }
                }}
              >
                {pendingNodeId === session.nodeId ? "Cerrando..." : "Cerrar sesion"}
              </button>
            </div>
          </article>
        ))}

        {operatorSessions.length === 0 ? (
          <p className="empty-state">No hay sesiones secundarias activas.</p>
        ) : null}
      </div>
    </section>
  );
};
