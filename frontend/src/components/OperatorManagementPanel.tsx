import { useState } from "react";

import type { Operator, OperatorAdminInput, OperatorNodeCode } from "../types";

const INITIAL_FORM: OperatorAdminInput & { password: string; confirmPassword: string } = {
  name: "",
  username: "",
  password: "",
  confirmPassword: "",
  assignedNodeId: null,
  isActive: true
};

interface OperatorManagementPanelProps {
  operators: Operator[];
  onCreateOperator: (payload: OperatorAdminInput & { password: string }) => Promise<void>;
  onUpdateOperator: (operatorId: string, payload: OperatorAdminInput) => Promise<void>;
  onToggleOperator: (operator: Operator) => Promise<void>;
}

export const OperatorManagementPanel = ({
  operators,
  onCreateOperator,
  onUpdateOperator,
  onToggleOperator
}: OperatorManagementPanelProps) => {
  const [form, setForm] = useState(INITIAL_FORM);
  const [editingOperatorId, setEditingOperatorId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submit = async () => {
    if (!editingOperatorId && form.password !== form.confirmPassword) {
      setErrorMessage("La contraseña y su confirmación no coinciden.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (editingOperatorId) {
        await onUpdateOperator(editingOperatorId, {
          name: form.name,
          username: form.username,
          assignedNodeId: form.assignedNodeId,
          isActive: form.isActive,
          ...(form.password ? { password: form.password } : {})
        });
      } else {
        await onCreateOperator({
          name: form.name,
          username: form.username,
          password: form.password,
          assignedNodeId: form.assignedNodeId,
          isActive: form.isActive
        });
      }
      setForm(INITIAL_FORM);
      setEditingOperatorId(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "No se pudo guardar el operador.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="panel management-panel">
      <div className="panel__header">
        <div>
          <h2>Operadores</h2>
          <p>Cree operadores con acceso por usuario y contraseña, con nodo opcional.</p>
        </div>
      </div>

      <div className="management-grid">
        <section className="management-list-shell">
          <div className="management-list-header">
            <div>
              <p className="eyebrow">Equipo humano</p>
              <h3>Operadores registrados</h3>
            </div>
            <span className="data-pill">{operators.length} operadores</span>
          </div>

          <div className="management-list management-list--scroll">
            {operators.map((operator) => (
              <article key={operator.id} className="management-row">
                <div className="management-row__content">
                  <strong className="truncate-text">{operator.name}</strong>
                  <p>{operator.username} · {operator.assignedNodeId ?? "Sin nodo fijo"}</p>
                  <p>{operator.isActive ? "Activo" : "Inactivo"}</p>
                </div>
                <div className="management-row__actions">
                  <button
                    type="button"
                    className="tab button-secondary button-compact"
                    aria-label={`Editar operador ${operator.name}`}
                    onClick={() => {
                      setEditingOperatorId(operator.id);
                      setForm({
                        name: operator.name,
                        username: operator.username,
                        password: "",
                        confirmPassword: "",
                        assignedNodeId: operator.assignedNodeId as OperatorNodeCode | null,
                        isActive: operator.isActive
                      });
                    }}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className={`claim-button claim-button--ghost button-compact ${operator.isActive ? "button-danger" : "button-secondary"}`}
                    aria-label={operator.isActive ? `Desactivar operador ${operator.name}` : `Activar operador ${operator.name}`}
                    onClick={() => void onToggleOperator(operator)}
                  >
                    {operator.isActive ? "Desactivar" : "Activar"}
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
              <p className="eyebrow">{editingOperatorId ? "Edición" : "Alta de acceso"}</p>
              <h3>{editingOperatorId ? "Actualizar operador" : "Crear operador"}</h3>
            </div>
            <span className="data-pill">{editingOperatorId ? "Modo edición" : "Nuevo registro"}</span>
          </div>
          <label className="field">
            <span>Nombre</span>
            <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label className="field">
            <span>Usuario</span>
            <input value={form.username} onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))} />
          </label>
          <label className="field">
            <span>Contraseña</span>
            <input type="password" autoComplete={editingOperatorId ? "new-password" : "current-password"} value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
          </label>
          {!editingOperatorId ? (
            <label className="field">
              <span>Confirmar contraseña</span>
              <input type="password" autoComplete="new-password" value={form.confirmPassword} onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))} />
            </label>
          ) : null}
          <label className="field">
            <span>Nodo asignado</span>
            <select value={form.assignedNodeId ?? ""} onChange={(event) => setForm((current) => ({ ...current, assignedNodeId: (event.target.value || null) as OperatorNodeCode | null }))}>
              <option value="">Sin nodo fijo</option>
              <option value="PC-B01">PC-B01</option>
              <option value="PC-B02">PC-B02</option>
              <option value="PC-B03">PC-B03</option>
            </select>
          </label>
          <label className="checkbox-field">
            <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} />
            <span>Activo</span>
          </label>

          {errorMessage ? <p className="form-message form-message--error">{errorMessage}</p> : null}

          <div className="access-actions">
            <button type="button" className="tab button-secondary" onClick={() => {
              setEditingOperatorId(null);
              setForm(INITIAL_FORM);
            }}>
              Limpiar
            </button>
            <button type="submit" className="claim-button button-primary" disabled={isSubmitting || (!editingOperatorId && form.password.trim().length < 4)}>
              {isSubmitting ? "Guardando..." : editingOperatorId ? "Actualizar operador" : "Crear operador"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};
