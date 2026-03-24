import { GridMap } from "../components/GridMap";
import { RobotCard } from "../components/RobotCard";
import { SystemLogs } from "../components/SystemLogs";
import { SystemInstructions } from "../components/SystemInstructions";
import { TaskPanel } from "../components/TaskPanel";
import type { GridPosition, LogEntry, PreviewRoute, RobotState, Task } from "../types";
import { connectionStateText, robotStatusText } from "../lib/ui-text";

type SidebarSection = "dashboard" | "fleet" | "tasks" | "settings";

interface OperatorDashboardProps {
  activeSection: SidebarSection;
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
  highlightedTask: Task | null;
  connectionState: string;
  onSelectTask: (taskId: string) => void;
  onSelectRobot: (robotId: string | null) => void;
  onAssignTask: (taskId: string, robotId: string) => Promise<void>;
  onStartTask: (taskId: string, robotId: string) => Promise<void>;
  onCancelTask: (taskId: string) => Promise<void>;
}

export const OperatorDashboard = ({
  activeSection,
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
  highlightedTask,
  connectionState,
  onSelectTask,
  onSelectRobot,
  onAssignTask,
  onStartTask,
  onCancelTask
}: OperatorDashboardProps) => {
  const robot = robots.find((entry) => entry.id === selectedRobotId) ?? null;
  const activeTasks = tasks.filter((task) => task.status !== "COMPLETED");

  const pageMeta: Record<SidebarSection, { eyebrow: string; title: string; subtitle: string; action?: string }> = {
    dashboard: {
      eyebrow: "Operational overview",
      title: robot ? `Panel operativo de ${robot.name}` : "Supervisión del puesto operativo",
      subtitle: "Vista compacta del grid, la sesión activa y la preparación actual del viaje.",
      action: "Vista compacta"
    },
    fleet: {
      eyebrow: "Fleet command",
      title: "Flota de Robots",
      subtitle: "Revise la disponibilidad de robots antes de asignarlos a una tarea operativa.",
      action: `${robots.length} unidades`
    },
    tasks: {
      eyebrow: "Mission control",
      title: "Task Assignment",
      subtitle: "Seleccione una tarea, elija un robot compatible y confirme el inicio manual del viaje.",
      action: `${activeTasks.length} pendientes`
    },
    settings: {
      eyebrow: "Support panel",
      title: "Ajustes y soporte operativo",
      subtitle: "Consulte notas del sistema y eventos recientes del nodo actual.",
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
            mode="operator"
            title="Mundo de Cuadrícula"
            subtitle={`${width} x ${height} scale`}
            showLegendToolbar={false}
            toolbarSuffix={<span className="legend-item">Ruta previa</span>}
          />

          <aside className="page-side-rail">
            <section className="utility-card">
              <p className="eyebrow">Leyenda</p>
              <div className="utility-list">
                <span className="legend-item legend-item--stacked"><span className="legend-swatch legend-swatch--robot" />Robot</span>
                <span className="legend-item legend-item--stacked"><span className="legend-swatch legend-swatch--route" />Ruta</span>
                <span className="legend-item legend-item--stacked"><span className="legend-swatch legend-swatch--origin" />Inicio</span>
                <span className="legend-item legend-item--stacked"><span className="legend-swatch legend-swatch--target" />Destino</span>
              </div>
            </section>
            <section className="utility-card">
              <p className="eyebrow">Estado operativo</p>
              {robot ? (
                <RobotCard robot={robot} selected={true} onSelect={() => undefined} />
              ) : (
                <p className="empty-state">Seleccione una tarea y un robot compatible para ver el resumen operativo.</p>
              )}
            </section>
          </aside>
        </section>
      ) : null}

      {activeSection === "fleet" ? (
        <section className="page-main-grid page-main-grid--fleet">
          <section className="content-grid content-grid--fleet">
            {robots.map((entry) => (
              <RobotCard
                key={entry.id}
                robot={entry}
                selected={entry.id === selectedRobotId}
                onSelect={(robotId) => onSelectRobot(robotId)}
              />
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
            <section className="utility-card">
              <p className="eyebrow">Robot elegido</p>
              {robot ? (
                <RobotCard robot={robot} selected={true} onSelect={() => undefined} />
              ) : (
                <p className="empty-state">Todavía no hay un robot asociado. Seleccione una tarea y elija una unidad compatible.</p>
              )}
            </section>
          </aside>
        </section>
      ) : null}

      {activeSection === "tasks" ? (
        <section className="page-main-grid page-main-grid--tasks">
          <aside className="page-side-rail page-side-rail--left">
            <section className="utility-card">
              <p className="eyebrow">Prioridad</p>
              <div className="utility-list">
                <span className="legend-item">Baja</span>
                <span className="legend-item">Normal</span>
                <span className="legend-item">Urgente</span>
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
              viewMode="operator"
              selectedRobotId={selectedRobotId}
              selectedTaskId={selectedTaskId}
              onSelectTask={onSelectTask}
              onSelectRobot={onSelectRobot}
              onAssignTask={onAssignTask}
              onStartTask={onStartTask}
              onCancelTask={onCancelTask}
            />
          </div>
        </section>
      ) : null}

      {activeSection === "settings" ? (
        <section className="page-main-grid page-main-grid--settings">
          <div className="settings-main">
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
