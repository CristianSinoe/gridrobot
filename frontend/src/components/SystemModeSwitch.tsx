import type { SystemMode } from "../types";

interface SystemModeSwitchProps {
  mode: SystemMode;
  disabled?: boolean;
  onChange: (mode: SystemMode) => void;
}

export const SystemModeSwitch = ({ mode, disabled = false, onChange }: SystemModeSwitchProps) => {
  return (
    <section className="utility-card">
      <p className="eyebrow">Modo del sistema</p>
      <div className="mode-switch">
        <button
          type="button"
          className={`mode-switch__button${mode === "WAREHOUSE" ? " is-active" : ""}`}
          aria-label="Cambiar a modo almacén"
          onClick={() => onChange("WAREHOUSE")}
          disabled={disabled}
        >
          Modo almacén
        </button>
        <button
          type="button"
          className={`mode-switch__button${mode === "GAME" ? " is-active" : ""}`}
          aria-label="Cambiar a modo GRIDBOT CHASE"
          onClick={() => onChange("GAME")}
          disabled={disabled}
        >
          GRIDBOT CHASE
        </button>
      </div>
      <p className="utility-card__hint">
        {mode === "WAREHOUSE"
          ? "La logística y el grid operativo siguen activos."
          : "La logística queda en pausa y el mini juego toma el control."}
      </p>
    </section>
  );
};
