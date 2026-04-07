import { useState } from "react";

import type { RobotState, Task, ViewMode } from "../types";
import {
  capacityUnitText,
  executionStageText,
  formatPosition,
  loadTypeText,
  priorityText,
  taskStatusText,
  taskTypeText
} from "../lib/ui-text";

interface TaskPanelProps {
  tasks: Task[];
  robots: RobotState[];
  viewMode: ViewMode;
  selectedRobotId: string | null;
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void | Promise<void>;
  onSelectRobot?: (robotId: string | null) => void;
  onAssignTask: (taskId: string, robotId: string) => Promise<void>;
  onStartTask: (taskId: string, robotId: string) => Promise<void>;
  onCancelTask?: (taskId: string) => Promise<void>;
}

export const TaskPanel = ({
  tasks,
  robots,
  viewMode,
  selectedRobotId,
  selectedTaskId,
  onSelectTask,
  onSelectRobot,
  onAssignTask,
  onStartTask,
  onCancelTask
}: TaskPanelProps) => {
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);

  const pendingTasks = tasks.filter((task) => task.status !== "COMPLETED");
  const assignedRobot = (task: Task) => robots.find((robot) => robot.id === task.robotId) ?? null;

  return (
    <section className={`panel task-panel task-panel--${viewMode}`}>
      <div className="panel__header">
        <div>
          <p className="eyebrow">Mission control</p>
          <h2>Asignacion de Tareas</h2>
        </div>
        <p>{pendingTasks.length} tareas activas</p>
      </div>
      <div className="task-list task-list--mission">
        {pendingTasks.length === 0 ? <p className="empty-state">No hay tareas activas disponibles.</p> : null}
        {pendingTasks.map((task) => (
          (() => {
            const isSelected = selectedTaskId === task.id;
            const canPickRobot =
              viewMode === "operator" &&
              isSelected &&
              (task.status === "PENDING" || task.status === "WAITING_ASSISTANCE");
            const canStartTrip =
              viewMode === "operator" &&
              isSelected &&
              (task.status === "ASSIGNED" || task.status === "REASSIGNED") &&
              task.robotId === selectedRobotId;
            const summaryId = `task-${task.id}-summary`;

            return (
              <article
                key={task.id}
                className={`task-item task-item--mission${isSelected ? " is-selected" : ""}`}
                style={{ gridTemplateColumns: "1fr" }}
              >
                <button
                  type="button"
                  aria-pressed={isSelected}
                  aria-describedby={summaryId}
                  onClick={() => {
                    void onSelectTask(task.id);
                  }}
                  style={{
                    display: "grid",
                    gap: "18px",
                    width: "100%",
                    padding: 0,
                    border: 0,
                    background: "transparent",
                    color: "inherit",
                    font: "inherit",
                    textAlign: "left",
                    cursor: "pointer"
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gap: "18px",
                      gridTemplateColumns: "minmax(0, 0.9fr) minmax(260px, 0.78fr)"
                    }}
                  >
                    <div className="task-item__main">
                      <div className="task-item__meta">
                        <span className="data-pill">ID: {task.id.slice(0, 8)}</span>
                        <span className="data-pill">{priorityText[task.priority]}</span>
                        <span className="data-pill">{taskStatusText[task.status]}</span>
                      </div>

                      <div className="task-item__headline">
                        <div>
                          <p className="eyebrow">Control de mision</p>
                          <h3>{task.name}</h3>
                          <p id={summaryId} className="task-item__summary">
                            {taskTypeText[task.type]}
                            {" · "}
                            {task.requiredAmount} {capacityUnitText[task.amountUnit]}
                          </p>
                        </div>

                        <div className="task-item__load">
                          <span className="task-item__load-icon">≈</span>
                          <div>
                            <span>Detalles de carga</span>
                            <strong>{loadTypeText[task.loadTypeRequired]}</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="task-item__info">
                      <div className="task-item__info-block">
                        <span className="eyebrow">Origen</span>
                        <strong>{formatPosition(task.origin.x, task.origin.y)}</strong>
                      </div>
                      <div className="task-item__info-block">
                        <span className="eyebrow">Destino</span>
                        <strong>{formatPosition(task.target.x, task.target.y)}</strong>
                      </div>
                      <div className="task-item__info-block">
                        <span className="eyebrow">Requisitos</span>
                        <div className="task-item__chips">
                          <span className="data-pill">{taskTypeText[task.type]}</span>
                          {task.requiresFragileHandling ? <span className="data-pill">Fragil</span> : null}
                          {task.requiresRefrigeration ? <span className="data-pill">Refrigeracion</span> : null}
                          {!task.requiresFragileHandling && !task.requiresRefrigeration ? (
                            <span className="data-pill">Carga estandar</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="task-item__info-block">
                        <span className="eyebrow">Etapa actual</span>
                        <strong>{executionStageText[task.executionStage]}</strong>
                      </div>
                    </div>
                  </div>
                </button>

                <div className="task-item__actions">
                  {task.recommendedRobots.length > 0 ? (
                    <div className="task-item__ranking">
                      <p className="task-item__ranking-title">Robots compatibles</p>
                      {task.recommendedRobots.slice(0, 3).map((candidate) => (
                        <p key={`${task.id}:${candidate.robotId}`}>
                          {candidate.robotName}
                          {" · "}
                          {candidate.availabilityLabel}
                          {" · "}
                          {candidate.distanceToOrigin} celdas
                          {candidate.priorityLabel ? ` · ${candidate.priorityLabel}` : ""}
                          {candidate.nodeId ? ` · ${candidate.nodeId}` : ""}
                        </p>
                      ))}
                    </div>
                  ) : null}

                  {viewMode === "operator" ? (
                    canPickRobot ? (
                      <div className="task-item__robot-picker">
                        <p className="task-item__ranking-title">Robots compatibles</p>
                        <p>Solo puede seleccionarse un robot disponible. Los robots reservados o en viaje quedan bloqueados.</p>
                        {task.recommendedRobots.filter((candidate) => candidate.isAvailable).length === 0 ? (
                          <p>No hay robots disponibles para esta tarea en este momento.</p>
                        ) : null}
                        {task.recommendedRobots.map((candidate) => (
                          <button
                            key={`${task.id}:${candidate.robotId}`}
                            type="button"
                            className={`claim-button${selectedRobotId === candidate.robotId ? " is-selected" : ""}`}
                            disabled={pendingTaskId === task.id || !candidate.isAvailable}
                            onClick={async () => {
                              setPendingTaskId(task.id);
                              onSelectRobot?.(candidate.robotId);
                              try {
                                await onAssignTask(task.id, candidate.robotId);
                              } finally {
                                setPendingTaskId(null);
                              }
                            }}
                          >
                            {candidate.robotName}
                            {" · "}
                            {candidate.availabilityLabel}
                            {" · "}
                            {candidate.distanceToOrigin} celdas
                            {candidate.priorityLabel ? ` · ${candidate.priorityLabel}` : ""}
                          </button>
                        ))}
                      </div>
                    ) : canStartTrip ? (
                      <div className="task-item__robot-picker">
                        <p>
                          Robot elegido:
                          {" "}
                          {assignedRobot(task)?.name ?? "Sin robot"}
                        </p>
                        <button
                          type="button"
                          className="claim-button"
                          disabled={pendingTaskId === task.id}
                          onClick={async () => {
                            setPendingTaskId(task.id);
                            onSelectRobot?.(task.robotId);
                            try {
                              await onStartTask(task.id, task.robotId!);
                            } finally {
                              setPendingTaskId(null);
                            }
                          }}
                        >
                          Iniciar viaje
                        </button>
                        <button
                          type="button"
                          className="claim-button claim-button--ghost"
                          disabled={pendingTaskId === task.id}
                          onClick={async () => {
                            setPendingTaskId(task.id);
                            try {
                              await onCancelTask?.(task.id);
                              onSelectRobot?.(null);
                            } finally {
                              setPendingTaskId(null);
                            }
                          }}
                        >
                          Cancelar preparacion
                        </button>
                      </div>
                    ) : (
                      <div className="task-item__status">
                        <p>
                          {isSelected
                            ? task.status === "ASSIGNED" || task.status === "REASSIGNED"
                              ? "Esta tarea ya fue reservada por otro operador o requiere otra seleccion."
                              : "Seleccione esta tarea para elegir un robot."
                            : task.status === "IN_PROGRESS"
                              ? "Viaje en curso"
                              : task.status === "WAITING_ASSISTANCE"
                                ? "Esperando seleccion de apoyo"
                                : "Seleccione una tarea"}
                        </p>
                      </div>
                    )
                  ) : viewMode === "central" ? (
                    <div className="task-item__status">
                      <p>
                        {task.status === "PENDING"
                          ? "Disponible para operadores secundarios"
                          : task.status === "WAITING_ASSISTANCE"
                            ? "Interrumpida: esperando asistencia"
                            : task.status === "ASSIGNED"
                              ? `Tomada por ${assignedRobot(task)?.name ?? "un operador"}`
                              : task.status === "REASSIGNED"
                                ? `Reasignada a ${assignedRobot(task)?.name ?? "un operador"}`
                                : task.status === "IN_PROGRESS"
                                  ? `En viaje con ${assignedRobot(task)?.name ?? "un operador"}`
                                  : task.status === "COMPLETED"
                                    ? "Completada"
                                    : taskStatusText[task.status]}
                      </p>
                    </div>
                  ) : null}
                </div>
              </article>
            );
          })()
        ))}
      </div>
    </section>
  );
};
