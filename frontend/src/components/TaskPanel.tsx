import { useMemo, useState } from "react";
import { createPortal } from "react-dom";

import type { RobotState, Task, ViewMode } from "../types";
import {
  capacityUnitText,
  executionStageText,
  formatPosition,
  loadTypeText,
  priorityText,
  supportText,
  taskStatusText,
  taskTypeText
} from "../lib/ui-text";

interface TaskPanelProps {
  tasks: Task[];
  robots: RobotState[];
  viewMode: ViewMode;
  selectedRobotId: string | null;
  selectedTaskId: string | null;
  sessionOperatorId?: string | null;
  sessionNodeId?: string | null;
  onSelectTask: (taskId: string) => void | Promise<void>;
  onSelectRobot?: (robotId: string | null) => void;
  onAssignTask: (taskId: string, robotId: string) => Promise<void>;
  onStartTask: (taskId: string, robotId: string) => Promise<void>;
  onCancelTask?: (taskId: string) => Promise<void>;
  disabled?: boolean;
}

export const TaskPanel = ({
  tasks,
  robots,
  viewMode,
  selectedRobotId,
  selectedTaskId,
  sessionOperatorId = null,
  sessionNodeId = null,
  onSelectTask,
  onSelectRobot,
  onAssignTask,
  onStartTask,
  onCancelTask,
  disabled = false
}: TaskPanelProps) => {
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [modalTaskId, setModalTaskId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const activeTasks = tasks.filter((task) => task.status !== "COMPLETED");
  const selectedTask = activeTasks.find((task) => task.id === selectedTaskId) ?? null;
  const modalTask = activeTasks.find((task) => task.id === modalTaskId) ?? null;
  const selectedRobot = robots.find((robot) => robot.id === selectedRobotId) ?? null;

  const selectedCandidates = useMemo(
    () => (selectedTask ? selectedTask.recommendedRobots.filter((candidate) => candidate.isAvailable) : []),
    [selectedTask]
  );
  const bestCandidateRobotId = selectedCandidates[0]?.robotId ?? null;

  const belongsToCurrentOperator = (task: Task) =>
    (sessionOperatorId !== null && task.assignedOperatorId === sessionOperatorId) ||
    (sessionNodeId !== null && task.assignedNodeId === sessionNodeId);

  const isPreparedByCurrentOperator = (task: Task) =>
    task.status === "ASSIGNED_PENDING_START" && belongsToCurrentOperator(task);

  const assignedRobot = (task: Task) => robots.find((robot) => robot.id === task.robotId) ?? null;
  const modalMarkup = modalTask ? (
    <div className="task-modal-backdrop" onClick={() => setModalTaskId(null)}>
      <div
        className="task-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="panel__header">
          <div>
            <p className="eyebrow">Detalle completo</p>
            <h2 id="task-modal-title">{modalTask.name}</h2>
          </div>
          <button type="button" className="tab button-secondary" onClick={() => setModalTaskId(null)}>
            Cerrar
          </button>
        </div>
        <div className="task-modal__content">
          <p><strong>Código:</strong> {modalTask.code ?? "Sin código"}</p>
          <p><strong>Estado:</strong> {taskStatusText[modalTask.status]}</p>
          <p><strong>Prioridad:</strong> {priorityText[modalTask.priority]}</p>
          <p><strong>Origen:</strong> {formatPosition(modalTask.origin.x, modalTask.origin.y)}</p>
          <p><strong>Destino:</strong> {formatPosition(modalTask.target.x, modalTask.target.y)}</p>
          <p><strong>Tipo:</strong> {taskTypeText[modalTask.type]}</p>
          <p><strong>Tipo de carga:</strong> {loadTypeText[modalTask.loadTypeRequired]}</p>
          <p><strong>Capacidad requerida:</strong> {modalTask.requiredAmount} {capacityUnitText[modalTask.amountUnit]}</p>
          <p><strong>Requerimientos:</strong> {modalTask.requiresFragileHandling ? "Frágil" : "Sin manejo frágil"} · {modalTask.requiresRefrigeration ? "Refrigerada" : "Sin refrigeración"}</p>
          <p><strong>Etapa:</strong> {executionStageText[modalTask.executionStage]}</p>
          <p><strong>Robots compatibles:</strong> {modalTask.recommendedRobots.length}</p>
          <div className="task-modal__candidates">
            {modalTask.recommendedRobots.map((candidate) => (
              <article key={candidate.robotId} className="task-modal__candidate">
                <strong>{candidate.robotName}</strong>
                <p>{candidate.robotCode} · {candidate.distanceToOrigin} celdas · {candidate.capacityLabel}</p>
                <p>{candidate.supports.map((support) => supportText[support]).join(", ")}</p>
                <p>{candidate.availabilityLabel}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <section className={`panel task-panel task-panel--${viewMode}`}>
      <div className="panel__header">
        <div>
          <p className="eyebrow">Control de tareas</p>
          <h2>Operación de misiones</h2>
        </div>
        <p>{activeTasks.length} tareas visibles</p>
      </div>

      {disabled ? <p className="panel-banner">El modo juego está activo. Las acciones de almacén están bloqueadas.</p> : null}
      {actionError ? <p className="panel-banner">{actionError}</p> : null}

      <div className="task-workspace">
        <div className="task-compact-list">
          {activeTasks.map((task) => {
            const isSelected = task.id === selectedTaskId;
            const canAssign = viewMode === "operator" && task.status === "PENDING" && isSelected;
            const canStart = viewMode === "operator" && isPreparedByCurrentOperator(task);

            return (
              <article key={task.id} className={`task-compact-card${isSelected ? " is-selected" : ""}`}>
                <div className="task-compact-card__header">
                  <div className="min-inline-size-0">
                    <strong className="truncate-text">{task.code ?? task.name}</strong>
                    <p className="break-text">{task.name}</p>
                  </div>
                  <span className="data-pill">{taskStatusText[task.status]}</span>
                </div>

                <div className="task-compact-card__summary">
                  <span>{formatPosition(task.origin.x, task.origin.y)}</span>
                  <span>{formatPosition(task.target.x, task.target.y)}</span>
                  <span>{priorityText[task.priority]}</span>
                  <span>{loadTypeText[task.loadTypeRequired]}</span>
                </div>

                <div className="task-compact-card__actions">
                  <button
                    type="button"
                    className={`tab button-secondary ${isSelected ? "is-active" : ""}`}
                    aria-label={`Seleccionar tarea ${task.code ?? task.name}`}
                    onClick={() => {
                      setActionError(null);
                      void onSelectTask(task.id);
                    }}
                  >
                    Seleccionar tarea
                  </button>
                  <button type="button" className="claim-button claim-button--ghost button-primary-soft" aria-label={`Ver detalle completo de ${task.code ?? task.name}`} onClick={() => setModalTaskId(task.id)}>
                    Ver detalles
                  </button>
                </div>

                {viewMode === "operator" && (canAssign || canStart) ? (
                  <div className="task-compact-card__footer">
                    {canAssign ? <p>Seleccione un robot disponible en el panel lateral para preparar la ruta.</p> : null}
                    {canStart ? <p>Esta tarea ya está preparada por usted. Puede iniciarla o cancelar la preparación.</p> : null}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>

        <aside className="task-side-panel">
          {!selectedTask ? (
            <p className="empty-state">Seleccione una tarea para ver robots compatibles y el detalle operativo.</p>
          ) : (
            <>
              <section className="task-side-card">
                <p className="eyebrow">Tarea seleccionada</p>
                <h3 className="break-text">{selectedTask.name}</h3>
                <p>{taskTypeText[selectedTask.type]}</p>
                <p>Origen {formatPosition(selectedTask.origin.x, selectedTask.origin.y)} · Destino {formatPosition(selectedTask.target.x, selectedTask.target.y)}</p>
                <p>{selectedTask.requiredAmount} {capacityUnitText[selectedTask.amountUnit]} · {priorityText[selectedTask.priority]}</p>
                <div className="task-side-card__meta">
                  <span className="data-pill">{taskStatusText[selectedTask.status]}</span>
                  <span className="data-pill">{loadTypeText[selectedTask.loadTypeRequired]}</span>
                </div>
              </section>

              <section className="task-side-card">
                <p className="eyebrow">Robots aptos y disponibles</p>
                {selectedCandidates.length === 0 ? (
                  <p className="empty-state">No hay robots disponibles y compatibles para esta tarea ahora mismo.</p>
                ) : (
                  <div className="task-candidate-list">
                    {selectedCandidates.map((candidate) => (
                      <button
                        key={candidate.robotId}
                        type="button"
                        className={`task-candidate${selectedRobotId === candidate.robotId ? " is-selected" : ""}${bestCandidateRobotId === candidate.robotId ? " is-recommended" : ""}`}
                        aria-label={`Asignar tarea a ${candidate.robotName}`}
                        disabled={disabled || pendingTaskId === selectedTask.id || selectedTask.status !== "PENDING"}
                        onClick={async () => {
                          onSelectRobot?.(candidate.robotId);
                          setPendingTaskId(selectedTask.id);
                          try {
                            setActionError(null);
                            await onAssignTask(selectedTask.id, candidate.robotId);
                          } catch (error) {
                            setActionError(
                              error instanceof Error ? error.message : "No se pudo preparar la tarea con ese robot."
                            );
                          } finally {
                            setPendingTaskId(null);
                          }
                        }}
                      >
                        <div className="task-candidate__top">
                          <strong className="truncate-text">{candidate.robotName}</strong>
                          {bestCandidateRobotId === candidate.robotId ? <span className="status-badge status-badge--active">Recomendado</span> : null}
                        </div>
                        <span>{candidate.robotCode} · {candidate.distanceToOrigin} celdas</span>
                        <span>{candidate.capacityLabel}</span>
                        <span className="break-text">{candidate.supports.map((support) => supportText[support]).join(", ")}</span>
                        <span>{candidate.priorityLabel ?? candidate.availabilityLabel}</span>
                        <span className="task-candidate__action">Elegir robot</span>
                      </button>
                    ))}
                  </div>
                )}
              </section>

              {viewMode === "operator" && isPreparedByCurrentOperator(selectedTask) ? (
                <section className="task-side-card">
                  <p className="eyebrow">Preparación activa</p>
                  <p>Robot asignado: {assignedRobot(selectedTask)?.name ?? selectedRobot?.name ?? "Sin robot"}</p>
                  <div className="access-actions">
                    <button
                      type="button"
                      className="claim-button button-primary"
                      disabled={disabled || pendingTaskId === selectedTask.id || !selectedTask.robotId}
                      onClick={async () => {
                        if (!selectedTask.robotId) {
                          return;
                        }
                        setPendingTaskId(selectedTask.id);
                        try {
                          setActionError(null);
                          await onStartTask(selectedTask.id, selectedTask.robotId);
                        } catch (error) {
                          setActionError(
                            error instanceof Error ? error.message : "No se pudo iniciar el viaje de la tarea."
                          );
                        } finally {
                          setPendingTaskId(null);
                        }
                      }}
                    >
                      Iniciar viaje
                    </button>
                    <button
                      type="button"
                      className="claim-button claim-button--ghost button-danger"
                      disabled={disabled || pendingTaskId === selectedTask.id}
                      onClick={async () => {
                        setPendingTaskId(selectedTask.id);
                        try {
                          setActionError(null);
                          await onCancelTask?.(selectedTask.id);
                          onSelectRobot?.(null);
                        } catch (error) {
                          setActionError(
                            error instanceof Error ? error.message : "No se pudo cancelar la preparación de la tarea."
                          );
                        } finally {
                          setPendingTaskId(null);
                        }
                      }}
                    >
                      Cancelar preparación
                    </button>
                  </div>
                </section>
              ) : null}
            </>
          )}
        </aside>
      </div>

      {typeof document !== "undefined" && modalMarkup ? createPortal(modalMarkup, document.body) : null}
    </section>
  );
};
