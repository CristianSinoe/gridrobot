export const SystemInstructions = () => {
  return (
    <section className="panel instruction-panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Nota de operación</p>
          <h2>¿Cómo funciona el sistema?</h2>
        </div>
        <p>Resumen operativo del entorno GRIDROBOT</p>
      </div>
      <div className="instructions-list instructions-list--columns">
        <div className="instruction-copy">
          <h3>Gestión de flota en tiempo real</h3>
          <p>Existe una sola computadora central autorizada para supervisar el estado global y coordinar la flota.</p>
          <p>Los robots calculan rutas dentro de la cuadrícula y el servidor central valida el estado real del entorno en cada ciclo.</p>
        </div>
        <div className="instruction-copy">
          <h3>Operación distribuida por nodos</h3>
          <p>Cada computadora secundaria inicia sesión como operador, elige una tarea disponible y después selecciona un robot compatible antes de iniciar el viaje.</p>
          <p>Los obstáculos no se muestran desde el inicio: solo se revelan cuando entran en el campo de visión del robot. Si cambia el mapa validado, el sistema puede recalcular la trayectoria.</p>
        </div>
      </div>
    </section>
  );
};
