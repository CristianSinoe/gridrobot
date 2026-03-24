interface AccessSelectionScreenProps {
  onSelectCentral: () => void;
  onSelectOperator: () => void;
}

export const AccessSelectionScreen = ({
  onSelectCentral,
  onSelectOperator
}: AccessSelectionScreenProps) => {
  return (
    <main className="dashboard">
      <section className="hero">
        <div>
          <p className="eyebrow">GRIDROBOT</p>
          <h1>Seleccione el modo de acceso</h1>
          <p className="hero__lede">Acceda al centro de operaciones o a un nodo secundario para preparar viajes y supervisar la simulacion.</p>
        </div>
        <div className="metric-strip">
          <article className="metric-card">
            <span className="metric-card__label">Sesion central</span>
            <strong>1</strong>
          </article>
          <article className="metric-card">
            <span className="metric-card__label">Nodos secundarios</span>
            <strong>3</strong>
          </article>
        </div>
      </section>

      <section className="dashboard-grid dashboard-grid--access">
        <section className="panel access-choice access-choice--central">
          <div className="panel__header">
            <h2>Entrar como Panel Central</h2>
            <p>Acceso unico con contraseña administrativa.</p>
          </div>
          <p className="access-choice__body">Visualice la flota completa, sesiones activas, rutas previas y validacion del mundo autoritativo.</p>
          <button type="button" className="claim-button" onClick={onSelectCentral}>
            Continuar como Panel Central
          </button>
        </section>

        <section className="panel access-choice access-choice--operator">
          <div className="panel__header">
            <h2>Entrar como Operador Secundario</h2>
            <p>Seleccione un nodo operativo y prepare un viaje con un robot compatible.</p>
          </div>
          <p className="access-choice__body">Revise tareas abiertas, elija un robot disponible y confirme el viaje manualmente.</p>
          <button type="button" className="claim-button" onClick={onSelectOperator}>
            Continuar como Operador Secundario
          </button>
        </section>
      </section>
    </main>
  );
};
