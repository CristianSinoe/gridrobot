import { useState } from "react";

interface CentralAccessPanelProps {
  isSubmitting: boolean;
  errorMessage: string | null;
  lockMessage: string | null;
  onBack: () => void;
  onLogin: (password: string) => Promise<void>;
}

export const CentralAccessPanel = ({
  isSubmitting,
  errorMessage,
  lockMessage,
  onBack,
  onLogin
}: CentralAccessPanelProps) => {
  const [password, setPassword] = useState("");

  return (
    <main className="dashboard">
      <section className="hero">
        <div>
          <p className="eyebrow">Panel Central</p>
          <h1>Acceso restringido a la computadora central</h1>
          <p className="hero__lede">Validación segura para la consola maestra del sistema GRIDROBOT.</p>
        </div>
        <div className="metric-strip">
          <article className="metric-card">
            <span className="metric-card__label">Supervisión</span>
            <strong>Protegida</strong>
          </article>
          <article className="metric-card">
            <span className="metric-card__label">Sesiones centrales</span>
            <strong>1</strong>
          </article>
        </div>
      </section>

      <section className="panel access-panel">
        <div className="panel__header">
          <h2>Ingresar al Panel Central</h2>
          <p>Introduzca la contraseña configurada en el backend.</p>
        </div>

        <form
          className="access-form"
          onSubmit={(event) => {
            event.preventDefault();
            void onLogin(password);
          }}
        >
          <label className="field">
            <span>Contraseña del panel</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Ingrese la contraseña"
              autoComplete="current-password"
              aria-label="Contraseña del panel central"
            />
          </label>

          {lockMessage ? <p className="form-message form-message--warn">{lockMessage}</p> : null}
          {errorMessage ? <p className="form-message form-message--error">{errorMessage}</p> : null}

          <div className="access-actions">
            <button type="button" className="tab button-secondary" onClick={onBack}>
              Volver
            </button>
            <button type="submit" className="claim-button button-primary" disabled={isSubmitting || password.trim().length === 0}>
              {isSubmitting ? "Validando acceso..." : "Entrar al Panel Central"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
};
