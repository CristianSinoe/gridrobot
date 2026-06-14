import { useState } from "react";

import type { RobotAdminInput, RobotState, RobotSupport } from "../types";
import { formatCapacity, robotStatusText, supportText } from "../lib/ui-text";

const ROBOT_SUPPORT_OPTIONS: RobotSupport[] = [
  "UNIT_LOAD",
  "BULK_LOAD",
  "NON_FRAGILE",
  "FRAGILE",
  "REFRIGERATED"
];

const INITIAL_FORM: RobotAdminInput = {
  code: "",
  name: "",
  physicalWeightKg: 60,
  speedCellsPerSec: 1,
  capacityValue: 10,
  capacityUnit: "units",
  supports: ["UNIT_LOAD"],
  status: "activo",
  isActive: true
};

interface RobotManagementPanelProps {
  robots: RobotState[];
  onCreateRobot: (payload: RobotAdminInput) => Promise<void>;
  onUpdateRobot: (robotId: string, payload: RobotAdminInput) => Promise<void>;
  onToggleRobot: (robot: RobotState) => Promise<void>;
}

export const RobotManagementPanel = ({
  robots,
  onCreateRobot,
  onUpdateRobot,
  onToggleRobot
}: RobotManagementPanelProps) => {
  const [form, setForm] = useState<RobotAdminInput>(INITIAL_FORM);
  const [editingRobotId, setEditingRobotId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submit = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (editingRobotId) {
        await onUpdateRobot(editingRobotId, form);
      } else {
        await onCreateRobot(form);
      }
      setForm(INITIAL_FORM);
      setEditingRobotId(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo guardar el robot.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="panel management-panel">
      <div className="panel__header">
        <div>
          <h2>Gestión de robots</h2>
          <p>Registre nuevas unidades y ajuste su disponibilidad operativa.</p>
        </div>
      </div>

      <div className="management-grid">
        <section className="management-list-shell">
          <div className="management-list-header">
            <div>
              <p className="eyebrow">Catálogo operativo</p>
              <h3>Robots registrados</h3>
            </div>
            <span className="data-pill">{robots.length} robots</span>
          </div>

          <div className="management-list management-list--scroll">
            {robots.map((robot) => (
              <article key={robot.id} className="management-row">
                <div className="management-row__content">
                  <strong className="truncate-text">{robot.name}</strong>
                  <p>{robot.code} · {robotStatusText[robot.status]}</p>
                  <p className="break-text">{formatCapacity(robot.capacityValue, robot.capacityUnit)} · {robot.supports.map((support) => supportText[support]).join(", ")}</p>
                </div>
                <div className="management-row__actions">
                  <button
                    type="button"
                    className="tab button-secondary button-compact"
                    aria-label={`Editar robot ${robot.name}`}
                    onClick={() => {
                      setEditingRobotId(robot.id);
                      setForm({
                        code: robot.code,
                        name: robot.name,
                        physicalWeightKg: robot.physicalWeightKg ?? 0,
                        speedCellsPerSec: robot.speedCellsPerSec ?? 1,
                        capacityValue: robot.capacityValue ?? 1,
                        capacityUnit: robot.capacityUnit ?? "units",
                        supports: robot.supports,
                        status: (robot.catalogStatus as RobotAdminInput["status"]) ?? "activo",
                        isActive: robot.isActive
                      });
                    }}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className={`claim-button claim-button--ghost button-compact ${robot.isActive ? "button-danger" : "button-secondary"}`}
                    aria-label={robot.isActive ? `Desactivar robot ${robot.name}` : `Activar robot ${robot.name}`}
                    onClick={() => void onToggleRobot(robot)}
                  >
                    {robot.isActive ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <form
          className="access-form management-form management-form-shell"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <div className="management-form-header">
            <div>
              <p className="eyebrow">{editingRobotId ? "Edición" : "Alta de catálogo"}</p>
              <h3>{editingRobotId ? "Actualizar robot" : "Crear robot"}</h3>
            </div>
            <span className="data-pill">{editingRobotId ? "Modo edición" : "Nuevo registro"}</span>
          </div>
          <label className="field">
            <span>Código</span>
            <input value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} />
          </label>
          <label className="field">
            <span>Nombre</span>
            <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label className="field">
            <span>Peso físico (kg)</span>
            <input type="number" min="1" step="0.1" value={form.physicalWeightKg} onChange={(event) => setForm((current) => ({ ...current, physicalWeightKg: Number(event.target.value) }))} />
          </label>
          <label className="field">
            <span>Velocidad</span>
            <input type="number" min="0.1" step="0.1" value={form.speedCellsPerSec} onChange={(event) => setForm((current) => ({ ...current, speedCellsPerSec: Number(event.target.value) }))} />
          </label>
          <label className="field">
            <span>Capacidad</span>
            <input type="number" min="1" value={form.capacityValue} onChange={(event) => setForm((current) => ({ ...current, capacityValue: Number(event.target.value) }))} />
          </label>
          <label className="field">
            <span>Unidad</span>
            <select value={form.capacityUnit} onChange={(event) => setForm((current) => ({ ...current, capacityUnit: event.target.value as RobotAdminInput["capacityUnit"] }))}>
              <option value="units">Unidades</option>
              <option value="kg">Kg</option>
            </select>
          </label>
          <label className="field">
            <span>Estado inicial</span>
            <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as RobotAdminInput["status"] }))}>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
              <option value="en_espera">En espera</option>
              <option value="mantenimiento">Mantenimiento</option>
              <option value="averiado">Averiado</option>
            </select>
          </label>
          <label className="checkbox-field">
            <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} />
            <span>Activo</span>
          </label>
          <div className="field">
            <span>Tipos de carga soportados</span>
            <div className="checkbox-list checkbox-list--chips">
              {ROBOT_SUPPORT_OPTIONS.map((support) => (
                <label key={support} className="checkbox-field checkbox-chip">
                  <input
                    type="checkbox"
                    checked={form.supports.includes(support)}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        supports: event.target.checked
                          ? [...current.supports, support]
                          : current.supports.filter((entry) => entry !== support)
                      }))
                    }
                  />
                  <span>{supportText[support]}</span>
                </label>
              ))}
            </div>
          </div>

          {errorMessage ? <p className="form-message form-message--error">{errorMessage}</p> : null}

          <div className="access-actions">
            <button type="button" className="tab button-secondary" onClick={() => {
              setEditingRobotId(null);
              setForm(INITIAL_FORM);
            }}>
              Limpiar
            </button>
            <button type="submit" className="claim-button button-primary" disabled={isSubmitting || form.supports.length === 0}>
              {isSubmitting ? "Guardando..." : editingRobotId ? "Actualizar robot" : "Crear robot"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};
