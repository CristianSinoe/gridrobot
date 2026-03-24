export const SystemInstructions = () => {
  return (
    <section className="panel instruction-panel">
      <div className="panel__header">
        <div>
          <p className="eyebrow">Nota de operacion</p>
          <h2>¿Como funciona el sistema?</h2>
        </div>
        <p>Resumen operativo del entorno GRIDROBOT</p>
      </div>
      <div className="instructions-list instructions-list--columns">
        <div className="instruction-copy">
          <h3>Gestion de flota en tiempo real</h3>
          <p>Existe una sola computadora central autorizada para supervisar el estado global y coordinar la flota.</p>
          <p>Los robots calculan rutas dentro de la cuadricula y el servidor central valida el estado real del entorno en cada ciclo.</p>
        </div>
        <div className="instruction-copy">
          <h3>Operacion distribuida por nodos</h3>
          <p>Cada computadora secundaria inicia sesion como operador, elige una tarea disponible y despues selecciona un robot compatible antes de iniciar el viaje.</p>
          <p>Los obstaculos no se muestran desde el inicio: solo se revelan cuando entran en el campo de vision del robot. Si cambia el mapa validado, el sistema puede recalcular la trayectoria.</p>
        </div>
      </div>
    </section>
  );
};
