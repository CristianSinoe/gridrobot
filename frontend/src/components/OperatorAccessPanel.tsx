import { useState } from "react";

import type { OperatorNodeCode } from "../types";

const AVAILABLE_NODES: OperatorNodeCode[] = ["PC-B01", "PC-B02", "PC-B03"];

interface OperatorAccessPanelProps {
  selectedNodeId: OperatorNodeCode | null;
  isSubmitting: boolean;
  errorMessage: string | null;
  onBack: () => void;
  onSelectNode: (nodeId: OperatorNodeCode) => void;
  onLogin: (credentials: { username: string; password: string }) => Promise<void>;
}

export const OperatorAccessPanel = ({
  selectedNodeId,
  isSubmitting,
  errorMessage,
  onBack,
  onSelectNode,
  onLogin
}: OperatorAccessPanelProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <main className="dashboard">
      <section className="hero">
        <div>
          <p className="eyebrow">Operador Secundario</p>
          <h1>Seleccione el nodo de esta computadora</h1>
          <p className="hero__lede">Cada nodo mantiene una sesión operativa independiente para preparar viajes y coordinar tareas.</p>
        </div>
        <div className="metric-strip">
          <article className="metric-card">
            <span className="metric-card__label">Nodos por sesión</span>
            <strong>1</strong>
          </article>
          <article className="metric-card">
            <span className="metric-card__label">Preparación de viajes</span>
            <strong>Manual</strong>
          </article>
        </div>
      </section>

      <section className="panel access-panel">
        <div className="panel__header">
          <h2>Nodo secundario</h2>
          <p>Solo se permite una sesión activa por nodo.</p>
        </div>

        <form
          className="access-form operator-access-form"
          onSubmit={(event) => {
            event.preventDefault();
            void onLogin({ username, password });
          }}
        >
          <div className="operator-access-layout">
            <section className="operator-access-section operator-access-section--nodes">
              <div className="operator-access-section__header">
                <p className="eyebrow">Selección de nodo</p>
                <h3>Elija su estación activa</h3>
              </div>
              <div className="node-list">
                {AVAILABLE_NODES.map((nodeId) => (
                  <button
                    key={nodeId}
                    type="button"
                    className={`operator-node-card${selectedNodeId === nodeId ? " is-selected" : ""}`}
                    aria-pressed={selectedNodeId === nodeId}
                    aria-label={`Seleccionar nodo ${nodeId}`}
                    onClick={() => onSelectNode(nodeId)}
                    disabled={isSubmitting}
                  >
                    <div className="operator-node-card__top">
                      <strong>{nodeId}</strong>
                      <span className={`status-badge ${selectedNodeId === nodeId ? "status-badge--active" : "status-badge--idle"}`}>
                        {selectedNodeId === nodeId ? "Seleccionado" : "Nodo fijo"}
                      </span>
                    </div>
                    <p>Sesión operativa para preparar viajes, revisar ruta previa y confirmar el inicio manual.</p>
                  </button>
                ))}
              </div>
            </section>

            <section className="operator-access-section operator-access-section--form">
              <div className="operator-access-section__header">
                <p className="eyebrow">Inicio de sesión</p>
                <h3>Credenciales del operador</h3>
              </div>

              <label className="field">
                <span>Usuario del operador</span>
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Ingrese su usuario"
                  autoComplete="username"
                />
              </label>

              <label className="field">
                <span>Contraseña del operador</span>
                <div className="password-field">
                  <input
                    type={isPasswordVisible ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Ingrese la contraseña del operador"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="field-toggle"
                    aria-label={isPasswordVisible ? "Ocultar contraseña del operador" : "Mostrar contraseña del operador"}
                    onClick={() => setIsPasswordVisible((current) => !current)}
                  >
                    {isPasswordVisible ? "Ocultar" : "Ver"}
                  </button>
                </div>
              </label>

              {errorMessage ? <p className="form-message form-message--error">{errorMessage}</p> : null}

              <div className="operator-access-summary">
                <span className="data-pill">{selectedNodeId ?? "Sin nodo seleccionado"}</span>
                <p>Inicie sesión para abrir el puesto operativo y comenzar el flujo de tarea, robot y viaje.</p>
              </div>

              <div className="access-actions">
                <button type="button" className="tab button-secondary" onClick={onBack}>
                  Volver
                </button>
                <button
                  type="submit"
                  className="claim-button button-primary"
                  disabled={
                    isSubmitting ||
                    selectedNodeId === null ||
                    username.trim().length === 0 ||
                    password.trim().length === 0
                  }
                >
                  {isSubmitting ? "Validando acceso..." : "Entrar como Operador"}
                </button>
              </div>
            </section>
          </div>
        </form>
      </section>
    </main>
  );
};
