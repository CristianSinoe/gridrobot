import { GridMap } from "../components/GridMap";
import { OperatorWorkflowStepper } from "../components/OperatorWorkflowStepper";
import { RobotCard } from "../components/RobotCard";
import { SystemLogs } from "../components/SystemLogs";
import { SystemInstructions } from "../components/SystemInstructions";
import { TaskPanel } from "../components/TaskPanel";
import type { GridPosition, LogEntry, PreviewRoute, RobotState, Task } from "../types";
import { connectionStateText, robotStatusText, taskStatusText } from "../lib/ui-text";
import type { OperatorNodeCode } from "../types";

type SidebarSection = "dashboard" | "fleet" | "tasks" | "robots" | "operators" | "settings";

interface OperatorDashboardProps {
  activeSection: SidebarSection;
  operatorNodeId: OperatorNodeCode | null;
  width: number;
  height: number;
  tick: number;
  robots: RobotState[];
  obstacles: GridPosition[];
  previewRoutes: PreviewRoute[];
  tasks: Task[];
  logs: LogEntry[];
  selectedRobotId: string | null;
  selectedTaskId: string | null;
  sessionOperatorId: string | null;
  sessionNodeId: string | null;
  highlightedTask: Task | null;
  connectionState: string;
  onSelectTask: (taskId: string) => void;
  onSelectRobot: (robotId: string | null) => void;
  onAssignTask: (taskId: string, robotId: string) => Promise<void>;
  onStartTask: (taskId: string, robotId: string) => Promise<void>;
  onCancelTask: (taskId: string) => Promise<void>;
  warehouseActionsDisabled: boolean;
}

export const OperatorDashboard = ({
  activeSection,
  operatorNodeId,
  width,
  height,
  tick,
  robots,
  obstacles,
  previewRoutes,
  tasks,
  logs,
  selectedRobotId,
  selectedTaskId,
  sessionOperatorId,
  sessionNodeId,
  highlightedTask,
  connectionState,
  onSelectTask,
  onSelectRobot,
  onAssignTask,
  onStartTask,
  onCancelTask,
  warehouseActionsDisabled
}: OperatorDashboardProps) => {
  const robot = robots.find((entry) => entry.id === selectedRobotId) ?? null;
  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;
  const activeTasks = tasks.filter((task) => task.status !== "COMPLETED");
  const selectedTaskCandidates = selectedTask?.recommendedRobots ?? [];
  const compatibleRobotIds = new Set(selectedTaskCandidates.map((candidate) => candidate.robotId));
  const availableCompatibleRobotIds = new Set(
    selectedTaskCandidates.filter((candidate) => candidate.isAvailable).map((candidate) => candidate.robotId)
  );
  const ownPreviewRoutes = previewRoutes.filter((preview) => preview.nodeId === operatorNodeId);
  const routePreview = ownPreviewRoutes.find((preview) => {
    if (selectedTaskId && preview.taskId !== selectedTaskId) {
      return false;
    }
    if (selectedRobotId && preview.robotId !== selectedRobotId) {
      return false;
    }
    return true;
  }) ?? null;
  const hasReadyPreview = routePreview?.status === "READY";
  const belongsToCurrentOperator = (task: Task | null) =>
    Boolean(
      task &&
      ((sessionOperatorId !== null && task.assignedOperatorId === sessionOperatorId) ||
        (sessionNodeId !== null && task.assignedNodeId === sessionNodeId))
    );

  const isPreparedByCurrentOperator =
    selectedTask?.status === "ASSIGNED_PENDING_START" && belongsToCurrentOperator(selectedTask);
  const isTripInProgress =
    selectedTask?.status === "IN_PROGRESS" && belongsToCurrentOperator(selectedTask);
  const nextAction =
    !selectedTask
      ? "Seleccione una tarea para empezar."
      : !robot
        ? "Elija un robot compatible para preparar la ruta."
        : hasReadyPreview
          ? "Revise la ruta previa y, cuando esté lista, inicie el viaje."
          : isTripInProgress
            ? "Supervise el viaje en curso desde el grid y el estado operativo."
            : isPreparedByCurrentOperator
              ? "Inicie manualmente el viaje o cancele la preparación."
              : "Revise la información operativa antes de continuar.";
  const operatorStatusMessage =
    isTripInProgress
      ? "Viaje en curso."
      : hasReadyPreview
        ? "Ruta previa lista para revisar."
        : selectedTask && !robot
          ? "Tarea seleccionada. Falta elegir un robot compatible."
          : selectedTask && robot
            ? "Robot elegido. Continúe con la preparación del viaje."
            : "Seleccione una tarea y un robot compatible para ver el resumen operativo.";
  const workflowSteps = [
    {
      id: "node",
      label: operatorNodeId ?? "Nodo activo",
      hint: operatorNodeId ? "Nodo operativo confirmado." : "Seleccione un nodo.",
      status: operatorNodeId ? "complete" : "current"
    },
    {
      id: "task",
      label: "Selección de tarea",
      hint: selectedTask ? selectedTask.code ?? selectedTask.name : "Elija una misión disponible.",
      status: selectedTask ? "complete" : operatorNodeId ? "current" : "pending"
    },
    {
      id: "robot",
      label: "Selección de robot",
      hint: robot ? robot.name : "Asigne una unidad compatible.",
      status: robot ? "complete" : selectedTask ? "current" : "pending"
    },
    {
      id: "route",
      label: "Ruta previa",
      hint: hasReadyPreview ? "Ruta previa lista." : "Se genera al preparar la tarea.",
      status: hasReadyPreview ? "complete" : robot ? "current" : "pending"
    },
    {
      id: "trip",
      label: "Inicio manual",
      hint: isTripInProgress ? "Viaje en curso." : isPreparedByCurrentOperator ? "Listo para iniciar." : "Espere la preparación.",
      status: isTripInProgress ? "complete" : isPreparedByCurrentOperator ? "current" : "pending"
    }
  ] as const;

  const pageMeta: Record<SidebarSection, { eyebrow: string; title: string; subtitle: string; action?: string }> = {
    dashboard: {
      eyebrow: "Resumen operativo",
      title: robot ? `Panel operativo de ${robot.name}` : "Supervisión del puesto operativo",
      subtitle: "Vista compacta del grid, la sesión activa y la preparación actual del viaje.",
      action: "Vista compacta"
    },
    fleet: {
      eyebrow: "Gestión de flota",
      title: "Flota de Robots",
      subtitle: "Revise la disponibilidad de robots antes de asignarlos a una tarea operativa.",
      action: `${robots.length} unidades`
    },
    tasks: {
      eyebrow: "Control de tareas",
      title: "Asignación de tareas",
      subtitle: "Seleccione una tarea, elija un robot compatible y confirme el inicio manual del viaje.",
      action: `${activeTasks.length} pendientes`
    },
    robots: {
      eyebrow: "Panel operativo",
      title: "Gestión de robots",
      subtitle: "La administración de robots está disponible solo para el Panel Central.",
      action: "Solo lectura"
    },
    operators: {
      eyebrow: "Panel operativo",
      title: "Gestión de operadores",
      subtitle: "La administración de operadores está disponible solo para el Panel Central.",
      action: "Solo lectura"
    },
    settings: {
      eyebrow: "Panel de soporte",
      title: "Ajustes y soporte operativo",
      subtitle: "Consulte notas del sistema y eventos recientes del nodo actual.",
      action: "Soporte"
    }
  };

  const currentPage = pageMeta[activeSection];

  return (
    <main className="dashboard dashboard--operations">
      <header className="page-header operator-page-header">
        <div>
          <p className="eyebrow">{currentPage.eyebrow}</p>
          <h1>{currentPage.title}</h1>
          <p className="page-header__subtitle">{currentPage.subtitle}</p>
        </div>
        {currentPage.action ? (
          <div className="page-actions">
            <span className="tab tab--pill operator-page-chip">{currentPage.action}</span>
          </div>
        ) : null}
      </header>

      <OperatorWorkflowStepper steps={workflowSteps} />

      <section className="stat-row operator-stat-row">
        <article className="stat-card">
          <span className="stat-card__label">Ciclo actual</span>
          <strong>{tick}</strong>
          <small>ticks</small>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">Nodo activo</span>
          <strong>{operatorNodeId ?? "Sin nodo"}</strong>
          <small>puesto operativo</small>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">Robot elegido</span>
          <strong>{robot ? robot.name : "Sin selección"}</strong>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">Estado</span>
          <strong>{robot ? robotStatusText[robot.status] : "Sin robot"}</strong>
        </article>
        <article className="stat-card stat-card--status">
          <span className="stat-card__label">Estado de enlace</span>
          <strong>{connectionStateText[connectionState as keyof typeof connectionStateText]}</strong>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">Ruta previa</span>
          <strong>{hasReadyPreview ? "Lista" : "Pendiente"}</strong>
          <small>{routePreview ? (routePreview.message ?? routePreview.status) : "Sin preparación"}</small>
        </article>
      </section>

      {activeSection === "dashboard" ? (
        <section className="page-main-grid page-main-grid--dashboard page-main-grid--operator-dashboard">
          <GridMap
            width={width}
            height={height}
            robots={robots}
            obstacles={obstacles}
            previewRoutes={previewRoutes}
            selectedRobotId={selectedRobotId}
            highlightedTask={highlightedTask}
            mode="operator"
            viewerNodeId={operatorNodeId}
            title="Mundo de Cuadrícula"
            subtitle={`${width} x ${height} celdas`}
            showLegendToolbar={false}
            toolbarSuffix={<span className={`legend-item ${hasReadyPreview ? "legend-item--highlight" : ""}`}>Ruta previa</span>}
          />

          <aside className="page-side-rail page-side-rail--dashboard">
            <section className="utility-card">
              <p className="eyebrow">Leyenda</p>
              <div className="utility-list">
                <span className="legend-item legend-item--stacked"><span className="legend-swatch legend-swatch--robot" />Robot</span>
                <span className="legend-item legend-item--stacked"><span className="legend-swatch legend-swatch--route" />Ruta</span>
                <span className="legend-item legend-item--stacked"><span className="legend-swatch legend-swatch--conflict" />Cruce previo</span>
                <span className="legend-item legend-item--stacked"><span className="legend-swatch legend-swatch--origin" />Inicio</span>
                <span className="legend-item legend-item--stacked"><span className="legend-swatch legend-swatch--target" />Destino</span>
              </div>
            </section>
            <section className="utility-card utility-card--operator-status">
              <p className="eyebrow">Estado operativo</p>
              <p className="utility-card__hint">{operatorStatusMessage}</p>
              <div className="operator-status-list">
                <span className="data-pill">{selectedTask ? taskStatusText[selectedTask.status] : "Sin tarea"}</span>
                <span className="data-pill">{robot ? robotStatusText[robot.status] : "Sin robot"}</span>
                <span className={`data-pill ${hasReadyPreview ? "operator-status-pill--ready" : ""}`}>{hasReadyPreview ? "Ruta lista" : "Ruta pendiente"}</span>
              </div>
              <p className="operator-next-action">{nextAction}</p>
              {robot ? (
                <RobotCard robot={robot} selected={true} onSelect={() => undefined} className="robot-card--compact" />
              ) : null}
            </section>
          </aside>
        </section>
      ) : null}

      {activeSection === "fleet" ? (
        <section className="page-main-grid page-main-grid--fleet page-main-grid--operator-fleet">
          <section className="content-grid content-grid--fleet content-grid--scroll">
            {robots.map((entry) => (
              <div
                key={entry.id}
                className={`operator-robot-card-shell${entry.id === selectedRobotId ? " is-selected" : ""}${
                  selectedTask ? (compatibleRobotIds.has(entry.id) ? " is-compatible" : " is-muted") : ""
                }${selectedTask && availableCompatibleRobotIds.has(entry.id) ? " is-available" : ""}`}
              >
                {selectedTask ? (
                  <div className="operator-robot-card-shell__badges">
                    <span className={`status-badge ${compatibleRobotIds.has(entry.id) ? "status-badge--active" : "status-badge--inactive"}`}>
                      {compatibleRobotIds.has(entry.id) ? "Compatible" : "No compatible"}
                    </span>
                    {availableCompatibleRobotIds.has(entry.id) ? <span className="status-badge status-badge--idle">Disponible</span> : null}
                  </div>
                ) : null}
                <RobotCard
                  robot={entry}
                  selected={entry.id === selectedRobotId}
                  onSelect={(robotId) => onSelectRobot(robotId)}
                  className="robot-card--operator"
                />
              </div>
            ))}
          </section>

          <aside className="page-side-rail">
            <section className="utility-card utility-card--accent">
              <p className="eyebrow">Resumen de operación</p>
              <strong className="utility-card__big">{Math.min(100, Math.round((robots.filter((entry) => entry.catalogStatus === "activo").length / Math.max(robots.length, 1)) * 100))}%</strong>
              <p className="utility-card__inline">disponibilidad</p>
              <div className="utility-progress">
                <span style={{ width: `${Math.min(100, Math.round((robots.filter((entry) => entry.catalogStatus === "activo").length / Math.max(robots.length, 1)) * 100))}%` }} />
              </div>
              <p>Unidades listas</p>
              <strong>{robots.filter((entry) => entry.catalogStatus === "activo").length}/{robots.length}</strong>
            </section>
            <section className="utility-card utility-card--operator-status">
              <p className="eyebrow">Robot elegido</p>
              <p className="operator-next-action">{nextAction}</p>
              {robot ? (
                <RobotCard robot={robot} selected={true} onSelect={() => undefined} className="robot-card--compact" />
              ) : (
                <p className="empty-state">Todavía no hay un robot asociado. Seleccione una tarea y elija una unidad compatible.</p>
              )}
            </section>
          </aside>
        </section>
      ) : null}

      {activeSection === "tasks" ? (
        <section className="page-main-grid page-main-grid--tasks page-main-grid--operator-tasks">
          <aside className="page-side-rail page-side-rail--left">
            <section className="utility-card operator-filter-card">
              <p className="eyebrow">Prioridad</p>
              <div className="utility-list">
                <span className="legend-item">Baja</span>
                <span className="legend-item">Normal</span>
                <span className="legend-item">Alta</span>
                <span className="legend-item">Crítica</span>
              </div>
            </section>
            <section className="utility-card operator-filter-card">
              <p className="eyebrow">Tipos de carga</p>
              <div className="utility-list">
                <span className="legend-item">Carga unitaria</span>
                <span className="legend-item">Carga a granel</span>
                <span className="legend-item">Frágil</span>
                <span className="legend-item">Refrigerada</span>
              </div>
            </section>
            <section className="utility-card operator-filter-card">
              <p className="eyebrow">Estado del flujo</p>
              <div className="utility-list">
                <span className="legend-item">{selectedTask ? "Tarea seleccionada" : "Sin tarea"}</span>
                <span className="legend-item">{robot ? "Robot elegido" : "Sin robot"}</span>
                <span className="legend-item">{hasReadyPreview ? "Ruta previa lista" : "Ruta pendiente"}</span>
              </div>
            </section>
          </aside>

          <div className="content-column">
            <TaskPanel
              tasks={tasks}
              robots={robots}
              viewMode="operator"
              selectedRobotId={selectedRobotId}
              selectedTaskId={selectedTaskId}
              sessionOperatorId={sessionOperatorId}
              sessionNodeId={sessionNodeId}
              onSelectTask={onSelectTask}
              onSelectRobot={onSelectRobot}
              onAssignTask={onAssignTask}
              onStartTask={onStartTask}
              onCancelTask={onCancelTask}
              disabled={warehouseActionsDisabled}
            />
          </div>
        </section>
      ) : null}

      {activeSection === "settings" ? (
        <section className="page-main-grid page-main-grid--settings">
          <div className="settings-main">
            <section className="utility-card utility-card--operator-status">
              <p className="eyebrow">Panel de soporte operativo</p>
              <p className="utility-card__hint">Consulte la nota operativa y el registro reciente del nodo actual sin interrumpir el flujo de trabajo.</p>
            </section>
            <SystemInstructions />
          </div>
          <aside className="page-side-rail">
            <SystemLogs entries={logs} />
          </aside>
        </section>
      ) : null}
    </main>
  );
};
