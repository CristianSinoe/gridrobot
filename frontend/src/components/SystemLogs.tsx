import type { LogEntry } from "../types";

interface SystemLogsProps {
  entries: LogEntry[];
}

export const SystemLogs = ({ entries }: SystemLogsProps) => {
  return (
    <section className="panel log-panel">
      <div className="panel__header">
        <h2>Registro del Sistema</h2>
        <p>Eventos recientes y mensajes en tiempo real</p>
      </div>
      <div className="log-list">
        {entries.map((entry) => (
          <article key={entry.id} className={`log-entry log-entry--${entry.level}`}>
            <div className="log-entry__meta">
              <time>{new Date(entry.timestamp).toLocaleTimeString()}</time>
              <span className="data-pill">{entry.level.toUpperCase()}</span>
            </div>
            <p>{entry.message}</p>
          </article>
        ))}
      </div>
    </section>
  );
};
