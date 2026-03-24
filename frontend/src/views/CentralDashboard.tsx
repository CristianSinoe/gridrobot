import { GridMap } from "../components/GridMap";
import { RobotCard } from "../components/RobotCard";
import { SessionManagerPanel } from "../components/SessionManagerPanel";
import { SystemLogs } from "../components/SystemLogs";
import { SystemInstructions } from "../components/SystemInstructions";
import { TaskPanel } from "../components/TaskPanel";
import type { ActiveSessionView, GridPosition, LogEntry, PreviewRoute, RobotState, Task } from "../types";
import { connectionStateText } from "../lib/ui-text";

type SidebarSection = "dashboard" | "fleet" | "tasks" | "settings";

interface CentralDashboardProps {
  activeSection: SidebarSection;
  width: number;
  height: number;
  tick: number;
  robots: RobotState[];
  obstacles: GridPosition[];
  previewRoutes: PreviewRoute[];
  tasks: Task[];
  sessions: ActiveSessionView[];
  logs: LogEntry[];
  selectedRobotId: string | null;
  selectedTaskId: string | null;
  highlightedTask: Task | null;
  connectionState: string;
  onSelectRobot: (robotId: string) => void;
  onSelectTask: (taskId: string) => void;
  onAssignTask: (taskId: string, robotId: string) => Promise<void>;
  onStartTask: (taskId: string, robotId: string) => Promise<void>;
  onCancelTask?: (taskId: string) => Promise<void>;
  onRefreshSessions: () => Promise<void>;
  onReleaseOperatorSession: (nodeId: "PC-B01" | "PC-B02" | "PC-B03") => Promise<void>;
  onGridCellClick: (position: GridPosition) => void;
}

export const CentralDashboard = ({
  activeSection,
  width,
  height,
  tick,
  robots,
  obstacles,
  previewRoutes,
  tasks,
  sessions,
  logs,
  selectedRobotId,
  selectedTaskId,
  highlightedTask,
  connectionState,
  onSelectRobot,
  onSelectTask,
  onAssignTask,
  onStartTask,
  onCancelTask,
  onRefreshSessions,
  onReleaseOperatorSession,
  onGridCellClick
}: CentralDashboardProps) => {
  const selectedRobot = robots.find((robot) => robot.id === selectedRobotId) ?? null;
  const activeTasks = tasks.filter((task) => task.status !== "COMPLETED");

  const pageMeta: Record<SidebarSection, { eyebrow: string; title: string; subtitle: string; action?: string }> = {
    dashboard: {
      eyebrow: "Operational overview",
      title: "Supervisión central del mundo GRIDROBOT",
      subtitle: "Vista autoritativa de la planta, la flota activa y los hallazgos del entorno.",
      action: "Vista compacta"
    },
    fleet: {
      eyebrow: "Fleet command",
      title: "Flota de Robots",
      subtitle: "Seleccione un robot para inspeccionar su estado, objetivo y capacidad operativa.",
      action: `${robots.length} unidades`
    },
    tasks: {
      eyebrow: "Mission control",
      title: "Task Assignment",
      subtitle: "Supervise las misiones activas, sus requisitos y la asignación operativa por robot.",
      action: `${activeTasks.length} pendientes`
    },
    settings: {
      eyebrow: "System administration",
      title: "Sesiones Activas",
      subtitle: "Administre sesiones, revise soporte operativo y mantenga la continuidad del sistema.",
      action: "Soporte"
    }
  };

  const currentPage = pageMeta[activeSection];

  return (
    <main className="dashboard dashboard--operations">
      <section className="page-header">
        <div>
          <p className="eyebrow">{currentPage.eyebrow}</p>
          <h1>{currentPage.title}</h1>
          <p className="page-header__subtitle">{currentPage.subtitle}</p>
        </div>
        {currentPage.action ? (
          <div className="page-actions">
            <span className="tab tab--pill">{currentPage.action}</span>
          </div>
        ) : null}
      </section>

      <section className="stat-row">
        <article className="stat-card">
          <span className="stat-card__label">Ciclo actual</span>
          <strong>{tick}</strong>
          <small>ticks</small>
        </article>
        <article className="stat-card">
          <span className="stat-card__label">Flota activa</span>
          <strong>{robots.length}</strong>
          <small>robots</small>
        </article>
        <article className="stat-card stat-card--alert">
          <span className="stat-card__label">Hallazgos</span>
          <strong>{obstacles.length}</strong>
          <small>obstáculos</small>
        </article>
        <article className="stat-card stat-card--status">
          <span className="stat-card__label">Estado de enlace</span>
          <strong>{connectionStateText[connectionState as keyof typeof connectionStateText]}</strong>
        </article>
      </section>

      {activeSection === "dashboard" ? (
        <section className="page-main-grid page-main-grid--dashboard">
          <GridMap
            width={width}
            height={height}
            robots={robots}
            obstacles={obstacles}
            previewRoutes={previewRoutes}
            selectedRobotId={selectedRobotId}
            highlightedTask={highlightedTask}
            mode="central"
            onCellClick={onGridCellClick}
            title="Mundo de Cuadrícula"
            subtitle={`${width} x ${height} scale`}
            showLegendToolbar={false}
            toolbarSuffix={<span className="legend-item">Live feed</span>}
          />

          <aside className="page-side-rail">
            <section className="utility-card">
              <p className="eyebrow">Leyenda</p>
              <div className="utility-list">
                <span className="legend-item legend-item--stacked"><span className="legend-swatch legend-swatch--robot" />Robot</span>
                <span className="legend-item legend-item--stacked"><span className="legend-swatch legend-swatch--route" />Ruta</span>
                <span className="legend-item legend-item--stacked"><span className="legend-swatch legend-swatch--obstacle" />Obstáculo visible</span>
                <span className="legend-item legend-item--stacked"><span className="legend-swatch legend-swatch--origin" />Inicio</span>
                <span className="legend-item legend-item--stacked"><span className="legend-swatch legend-swatch--target" />Destino</span>
              </div>
            </section>

            <section className="utility-card utility-card--quote">
              <p className="eyebrow">Nota operativa</p>
              <p>
                La visualización 40x25 concentra la supervisión activa del entorno. Las rutas previas y los hallazgos
                del mapa se reflejan aquí sin alterar el estado autoritativo del servidor.
              </p>
            </section>
          </aside>
        </section>
      ) : null}

      {activeSection === "fleet" ? (
        <section className="page-main-grid page-main-grid--fleet">
          <section className="content-grid content-grid--fleet">
            {robots.map((robot) => (
              <RobotCard key={robot.id} robot={robot} selected={robot.id === selectedRobotId} onSelect={onSelectRobot} />
            ))}
          </section>

          <aside className="page-side-rail">
            <section className="utility-card utility-card--accent">
              <p className="eyebrow">Resumen de operación</p>
              <strong className="utility-card__big">{Math.min(100, Math.round((robots.filter((robot) => robot.status === "MOVING" || robot.status === "WAITING").length / Math.max(robots.length, 1)) * 100))}%</strong>
              <p className="utility-card__inline">eficiencia</p>
              <div className="utility-progress">
                <span style={{ width: `${Math.min(100, Math.round((robots.filter((robot) => robot.status === "MOVING" || robot.status === "WAITING").length / Math.max(robots.length, 1)) * 100))}%` }} />
              </div>
              <p>Unidades activas</p>
              <strong>{robots.filter((robot) => robot.status === "MOVING" || robot.status === "WAITING").length}/{robots.length}</strong>
            </section>

            <section className="utility-card">
              <p className="eyebrow">Robot inspeccionado</p>
              {selectedRobot ? (
                <RobotCard robot={selectedRobot} selected={true} onSelect={onSelectRobot} />
              ) : (
                <p className="empty-state">Seleccione una unidad para ver un resumen compacto de su estado operativo.</p>
              )}
            </section>
          </aside>
        </section>
      ) : null}

      {activeSection === "tasks" ? (
        <section className="page-main-grid page-main-grid--tasks">
          <aside className="page-side-rail page-side-rail--left">
            <section className="utility-card">
              <p className="eyebrow">Estado de tareas</p>
              <div className="utility-list">
                <span className="legend-item">Pendientes: {tasks.filter((task) => task.status === "PENDING").length}</span>
                <span className="legend-item">Asignadas: {tasks.filter((task) => task.status === "ASSIGNED" || task.status === "REASSIGNED").length}</span>
                <span className="legend-item">En viaje: {tasks.filter((task) => task.status === "IN_PROGRESS").length}</span>
              </div>
            </section>
            <section className="utility-card">
              <p className="eyebrow">Tipos de carga</p>
              <div className="utility-list">
                <span className="legend-item">Carga unitaria</span>
                <span className="legend-item">Carga a granel</span>
                <span className="legend-item">Fragil</span>
                <span className="legend-item">Refrigerada</span>
              </div>
            </section>
          </aside>

          <div className="content-column">
            <TaskPanel
              tasks={tasks}
              robots={robots}
              viewMode="central"
              selectedRobotId={selectedRobotId}
              selectedTaskId={selectedTaskId}
              onSelectTask={onSelectTask}
              onAssignTask={onAssignTask}
              onStartTask={onStartTask}
              {...(onCancelTask ? { onCancelTask } : {})}
            />
          </div>
        </section>
      ) : null}

      {activeSection === "settings" ? (
        <section className="page-main-grid page-main-grid--settings">
          <div className="settings-main">
            <SessionManagerPanel
              sessions={sessions}
              onRefresh={onRefreshSessions}
              onReleaseOperator={onReleaseOperatorSession}
            />
            <SystemInstructions />
          </div>

          <aside className="page-side-rail">
            <section className="utility-card">
              <p className="eyebrow">Estado global</p>
              <div className="utility-progress utility-progress--stacked">
                <label>Uso de servidor</label>
                <span style={{ width: "24%" }} />
              </div>
              <div className="utility-progress utility-progress--stacked">
                <label>Ancho de banda</label>
                <span style={{ width: "62%" }} />
              </div>
            </section>
            <SystemLogs entries={logs} />
          </aside>
        </section>
      ) : null}
    </main>
  );
};
