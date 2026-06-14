import { GridMap } from "../components/GridMap";
import { OperatorManagementPanel } from "../components/OperatorManagementPanel";
import { AdminGameControls } from "../components/AdminGameControls";
import { NetworkMonitorPanel } from "../components/NetworkMonitorPanel";
import { RobotCard } from "../components/RobotCard";
import { RobotManagementPanel } from "../components/RobotManagementPanel";
import { SessionManagerPanel } from "../components/SessionManagerPanel";
import { SystemModeSwitch } from "../components/SystemModeSwitch";
import { SystemLogs } from "../components/SystemLogs";
import { SystemInstructions } from "../components/SystemInstructions";
import { TaskPanel } from "../components/TaskPanel";
import { GameLeaderboard } from "../components/GameLeaderboard";
import type {
  ActiveSessionView,
  GameStateSnapshot,
  GridPosition,
  LogEntry,
  EventLogEntry,
  Operator,
  OperatorAdminInput,
  PreviewRoute,
  RobotAdminInput,
  RobotCommandType,
  RobotState,
  SystemMode,
  Task
} from "../types";
import { connectionStateText } from "../lib/ui-text";

type SidebarSection = "dashboard" | "fleet" | "tasks" | "robots" | "operators" | "settings";

interface CentralDashboardProps {
  activeSection: SidebarSection;
  width: number;
  height: number;
  tick: number;
  robots: RobotState[];
  obstacles: GridPosition[];
  previewRoutes: PreviewRoute[];
  tasks: Task[];
  operators: Operator[];
  sessions: ActiveSessionView[];
  logs: LogEntry[];
  mqttConnectionState: "connected" | "reconnecting" | "disconnected";
  historyEvents: EventLogEntry[];
  networkEvents: EventLogEntry[];
  selectedRobotId: string | null;
  selectedGridCell: GridPosition | null;
  selectedTaskId: string | null;
  highlightedTask: Task | null;
  connectionState: string;
  systemMode: SystemMode;
  gameState: GameStateSnapshot | null;
  onSelectRobot: (robotId: string) => void;
  onSelectTask: (taskId: string) => void;
  onAssignTask: (taskId: string, robotId: string) => Promise<void>;
  onStartTask: (taskId: string, robotId: string) => Promise<void>;
  onCancelTask?: (taskId: string) => Promise<void>;
  onRefreshSessions: () => Promise<void>;
  onReleaseOperatorSession: (nodeId: "PC-B01" | "PC-B02" | "PC-B03") => Promise<void>;
  onCreateRobot: (payload: RobotAdminInput) => Promise<void>;
  onUpdateRobot: (robotId: string, payload: RobotAdminInput) => Promise<void>;
  onToggleRobot: (robot: RobotState) => Promise<void>;
  onCreateOperator: (payload: OperatorAdminInput & { password: string }) => Promise<void>;
  onUpdateOperator: (operatorId: string, payload: OperatorAdminInput) => Promise<void>;
  onToggleOperator: (operator: Operator) => Promise<void>;
  onSendRobotCommand: (payload: { robotId: string; command: RobotCommandType; speedCellsPerSec?: number }) => Promise<void>;
  onGridCellClick: (position: GridPosition) => void;
  onSystemModeChange: (mode: SystemMode) => void;
  onGameStart: () => void;
  onGamePause: () => void;
  onGameResume: () => void;
  onGameReset: () => void;
  onOpenGameView: () => void;
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
  operators,
  sessions,
  logs,
  mqttConnectionState,
  historyEvents,
  networkEvents,
  selectedRobotId,
  selectedGridCell,
  selectedTaskId,
  highlightedTask,
  connectionState,
  systemMode,
  gameState,
  onSelectRobot,
  onSelectTask,
  onAssignTask,
  onStartTask,
  onCancelTask,
  onRefreshSessions,
  onReleaseOperatorSession,
  onCreateRobot,
  onUpdateRobot,
  onToggleRobot,
  onCreateOperator,
  onUpdateOperator,
  onToggleOperator,
  onSendRobotCommand,
  onGridCellClick,
  onSystemModeChange,
  onGameStart,
  onGamePause,
  onGameResume,
  onGameReset,
  onOpenGameView
}: CentralDashboardProps) => {
  const selectedRobot = robots.find((robot) => robot.id === selectedRobotId) ?? null;
  const activeTasks = tasks.filter((task) => task.status !== "COMPLETED");

  const pageMeta: Record<SidebarSection, { eyebrow: string; title: string; subtitle: string; action?: string }> = {
    dashboard: {
      eyebrow: "Resumen operativo",
      title: "Supervisión central del mundo GRIDROBOT",
      subtitle: "Vista autoritativa de la planta, la flota activa y los hallazgos del entorno.",
      action: "Vista compacta"
    },
    fleet: {
      eyebrow: "Gestión de flota",
      title: "Flota de Robots",
      subtitle: "Seleccione un robot para inspeccionar su estado, objetivo y capacidad operativa.",
      action: `${robots.length} unidades`
    },
    tasks: {
      eyebrow: "Control de tareas",
      title: "Asignación de tareas",
      subtitle: "Supervise las misiones activas, sus requisitos y la asignación operativa por robot.",
      action: `${activeTasks.length} pendientes`
    },
    robots: {
      eyebrow: "Administración",
      title: "Gestión de robots",
      subtitle: "Administre el catálogo operativo y registre nuevas unidades desde el panel central.",
      action: `${robots.length} robots`
    },
    operators: {
      eyebrow: "Administración",
      title: "Gestión de operadores",
      subtitle: "Cree operadores, asigne nodos y controle qué cuentas pueden iniciar sesión.",
      action: `${operators.length} operadores`
    },
    settings: {
      eyebrow: "Administración del sistema",
      title: "Sesiones activas",
      subtitle: "Administre sesiones, revise soporte operativo y mantenga la continuidad del sistema.",
      action: "Soporte"
    }
  };

  const currentPage = pageMeta[activeSection];

  return (
    <main className="dashboard dashboard--operations">
      <header className="page-header">
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
      </header>

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
        <article className="stat-card">
          <span className="stat-card__label">Modo actual</span>
          <strong>{systemMode === "WAREHOUSE" ? "Almacén" : "Juego"}</strong>
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
            title="Mundo de Cuadrícula"
            subtitle={
              systemMode === "WAREHOUSE"
                ? `${width} x ${height} celdas`
                : "Modo juego activo: edición del mapa de almacén bloqueada"
            }
            showLegendToolbar={false}
            toolbarSuffix={<span className="legend-item">Vista en vivo</span>}
            {...(systemMode === "WAREHOUSE" ? { onCellClick: onGridCellClick } : {})}
          />

          <aside className="page-side-rail page-side-rail--dashboard">
            <section className="utility-card">
              <p className="eyebrow">Leyenda</p>
              <div className="utility-list">
                <span className="legend-item legend-item--stacked"><span className="legend-swatch legend-swatch--robot" />Robot</span>
                <span className="legend-item legend-item--stacked"><span className="legend-swatch legend-swatch--route" />Ruta</span>
                <span className="legend-item legend-item--stacked"><span className="legend-swatch legend-swatch--obstacle" />Obstáculo visible</span>
                <span className="legend-item legend-item--stacked"><span className="legend-swatch legend-swatch--conflict" />Cruce previo</span>
                <span className="legend-item legend-item--stacked"><span className="legend-swatch legend-swatch--origin" />Inicio</span>
                <span className="legend-item legend-item--stacked"><span className="legend-swatch legend-swatch--target" />Destino</span>
              </div>
            </section>

            <section className="utility-card utility-card--quote">
              <p className="eyebrow">Nota operativa</p>
              <p>
                La visualización 40x40 concentra la supervisión activa del entorno. Las rutas previas y los hallazgos
                del mapa se reflejan aquí sin alterar el estado autoritativo del servidor.
              </p>
            </section>

            <NetworkMonitorPanel
              socketState={connectionState as "connecting" | "connected" | "disconnected"}
              mqttState={mqttConnectionState}
              historyEvents={historyEvents}
              networkEvents={networkEvents}
              selectedRobot={selectedRobot}
              selectedCell={selectedGridCell}
              onSendCommand={onSendRobotCommand}
            />

            <SystemModeSwitch mode={systemMode} onChange={onSystemModeChange} />
            <AdminGameControls
              mode={systemMode}
              gameState={gameState}
              onStart={onGameStart}
              onPause={onGamePause}
              onResume={onGameResume}
              onReset={onGameReset}
            />
            <section className="utility-card">
              <p className="eyebrow">Vista de demostración</p>
              <p className="utility-card__hint">
                Abra la proyección ampliada del juego para seguir el tablero y el leaderboard en tiempo real.
              </p>
              <button
                type="button"
                className="header-button button-primary"
                aria-label="Abrir vista de demostración del juego"
                onClick={onOpenGameView}
                disabled={systemMode !== "GAME"}
              >
                Vista de juego
              </button>
            </section>
          </aside>
        </section>
      ) : null}

      {activeSection === "fleet" ? (
        <section className="page-main-grid page-main-grid--fleet">
          <section className="content-grid content-grid--fleet content-grid--scroll">
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
                <span className="legend-item">Preparadas: {tasks.filter((task) => task.status === "ASSIGNED_PENDING_START").length}</span>
                <span className="legend-item">En viaje: {tasks.filter((task) => task.status === "IN_PROGRESS").length}</span>
              </div>
            </section>
            <section className="utility-card">
              <p className="eyebrow">Tipos de carga</p>
              <div className="utility-list">
                <span className="legend-item">Carga unitaria</span>
                <span className="legend-item">Carga a granel</span>
                <span className="legend-item">Frágil</span>
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
              disabled={systemMode === "GAME"}
              {...(onCancelTask ? { onCancelTask } : {})}
            />
          </div>
        </section>
      ) : null}

      {activeSection === "robots" ? (
        <RobotManagementPanel
          robots={robots}
          onCreateRobot={onCreateRobot}
          onUpdateRobot={onUpdateRobot}
          onToggleRobot={onToggleRobot}
        />
      ) : null}

      {activeSection === "operators" ? (
        <OperatorManagementPanel
          operators={operators}
          onCreateOperator={onCreateOperator}
          onUpdateOperator={onUpdateOperator}
          onToggleOperator={onToggleOperator}
        />
      ) : null}

      {activeSection === "settings" ? (
        <section className="page-main-grid page-main-grid--settings">
          <div className="settings-main">
            <SystemModeSwitch mode={systemMode} onChange={onSystemModeChange} />
            <AdminGameControls
              mode={systemMode}
              gameState={gameState}
              onStart={onGameStart}
              onPause={onGamePause}
              onResume={onGameResume}
              onReset={onGameReset}
            />
            <GameLeaderboard items={gameState?.leaderboard ?? []} title="Leaderboard en tiempo real" />
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
