import type { OperatorNodeCode } from "../types";

const AVAILABLE_NODES: OperatorNodeCode[] = ["PC-B01", "PC-B02", "PC-B03"];

interface OperatorAccessPanelProps {
  selectedNodeId: OperatorNodeCode | null;
  isSubmitting: boolean;
  errorMessage: string | null;
  onBack: () => void;
  onSelectNode: (nodeId: OperatorNodeCode) => void;
  onLogin: () => Promise<void>;
}

export const OperatorAccessPanel = ({
  selectedNodeId,
  isSubmitting,
  errorMessage,
  onBack,
  onSelectNode,
  onLogin
}: OperatorAccessPanelProps) => {
  return (
    <main className="dashboard">
      <section className="hero">
        <div>
          <p className="eyebrow">Operador Secundario</p>
          <h1>Seleccione el nodo de esta computadora</h1>
          <p className="hero__lede">Cada nodo mantiene una sesion operativa independiente para preparar viajes y coordinar tareas.</p>
        </div>
        <div className="metric-strip">
          <article className="metric-card">
            <span className="metric-card__label">Nodos por sesion</span>
            <strong>1</strong>
          </article>
          <article className="metric-card">
            <span className="metric-card__label">Preparacion de viajes</span>
            <strong>Manual</strong>
          </article>
        </div>
      </section>

      <section className="panel access-panel">
        <div className="panel__header">
          <h2>Nodo secundario</h2>
          <p>Solo se permite una sesion activa por nodo.</p>
        </div>

        <div className="node-list">
          {AVAILABLE_NODES.map((nodeId) => (
            <button
              key={nodeId}
              type="button"
              className={selectedNodeId === nodeId ? "robot-card is-selected" : "robot-card"}
              onClick={() => onSelectNode(nodeId)}
            >
              <div className="robot-card__title">
                <h3>{nodeId}</h3>
                <span className="status-badge status-badge--idle">Nodo fijo</span>
              </div>
              <p>
                {nodeId === "PC-B01"
                  ? "Sesion operativa para preparar viajes y elegir robots compatibles."
                  : nodeId === "PC-B02"
                    ? "Sesion operativa para preparar viajes y elegir robots compatibles."
                    : "Sesion operativa para preparar viajes y elegir robots compatibles."}
              </p>
            </button>
          ))}
        </div>

        {errorMessage ? <p className="form-message form-message--error">{errorMessage}</p> : null}

        <div className="access-actions">
          <button type="button" className="tab" onClick={onBack}>
            Volver
          </button>
          <button
            type="button"
            className="claim-button"
            disabled={isSubmitting || selectedNodeId === null}
            onClick={() => void onLogin()}
          >
            {isSubmitting ? "Validando nodo..." : "Entrar como Operador"}
          </button>
        </div>
      </section>
    </main>
  );
};
