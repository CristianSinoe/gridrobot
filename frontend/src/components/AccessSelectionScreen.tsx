interface AccessSelectionScreenProps {
  onSelectCentral: () => void;
  onSelectOperator: () => void;
  showOperator?: boolean;
  onGoGame?: () => void;
}

export const AccessSelectionScreen = ({
  onSelectCentral,
  onSelectOperator,
  showOperator = true,
  onGoGame
}: AccessSelectionScreenProps) => {
  return (
    <main className="dashboard">
      <section className="hero">
        <div>
          <p className="eyebrow">GRIDROBOT</p>
          <h1>Seleccione el modo de acceso</h1>
          <p className="hero__lede">Acceda al centro de operaciones o a un nodo secundario para preparar viajes y supervisar la simulación.</p>
        </div>
        <div className="metric-strip">
          <article className="metric-card">
            <span className="metric-card__label">Sesión central</span>
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
            <p>Acceso único con contraseña administrativa.</p>
          </div>
          <p className="access-choice__body">Visualice la flota completa, sesiones activas, rutas previas y validación del mundo autoritativo.</p>
          <button type="button" className="claim-button" onClick={onSelectCentral} aria-label="Continuar como Panel Central">
            Continuar como Panel Central
          </button>
        </section>

        {showOperator ? (
          <section className="panel access-choice access-choice--operator">
            <div className="panel__header">
              <h2>Entrar como Operador Secundario</h2>
              <p>Seleccione un nodo operativo y prepare un viaje con un robot compatible.</p>
            </div>
            <p className="access-choice__body">Revise tareas abiertas, elija un robot disponible y confirme el viaje manualmente.</p>
            <button type="button" className="claim-button" onClick={onSelectOperator} aria-label="Continuar como Operador Secundario">
              Continuar como Operador Secundario
            </button>
          </section>
        ) : onGoGame ? (
          <section className="panel access-choice access-choice--operator">
            <div className="panel__header">
              <h2>Modo juego activo</h2>
              <p>Durante la demo pública, el acceso al modo almacén está bloqueado para estudiantes.</p>
            </div>
            <p className="access-choice__body">Si desea participar en la partida, use la pantalla pública del juego.</p>
            <button type="button" className="claim-button" onClick={onGoGame} aria-label="Ir a la vista pública del juego">
              Ir al juego
            </button>
          </section>
        ) : null}
      </section>
    </main>
  );
};
