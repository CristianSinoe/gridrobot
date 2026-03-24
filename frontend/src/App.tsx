import { useCallback, useEffect, useMemo, useState } from "react";

import { AppHeaderBar } from "./components/AppHeaderBar";
import { AppSidebar } from "./components/AppSidebar";
import { AccessSelectionScreen } from "./components/AccessSelectionScreen";
import { CentralAccessPanel } from "./components/CentralAccessPanel";
import { OperatorAccessPanel } from "./components/OperatorAccessPanel";
import { CentralDashboard } from "./views/CentralDashboard";
import { OperatorDashboard } from "./views/OperatorDashboard";
import { useGridRobotState } from "./hooks/useGridRobotState";
import { api } from "./lib/api";
import type {
  AccessRole,
  AccessSessionRecord,
  ActiveSessionView,
  GridPosition,
  OperatorNodeCode,
  ViewMode
} from "./types";

const ACCESS_ROLE_STORAGE_KEY = "gridrobot.access-role";
const OPERATOR_NODE_STORAGE_KEY = "gridrobot.operator-node";
const THEME_STORAGE_KEY = "gridrobot.theme";
type SidebarSection = "dashboard" | "fleet" | "tasks" | "settings";

const App = () => {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" ? "light" : "dark";
  });
  const [accessRole, setAccessRole] = useState<AccessRole | null>(() => {
    const stored = window.sessionStorage.getItem(ACCESS_ROLE_STORAGE_KEY);
    return stored === "central" || stored === "operator" ? stored : null;
  });
  const [operatorNodeId, setOperatorNodeId] = useState<OperatorNodeCode | null>(() => {
    const stored = window.sessionStorage.getItem(OPERATOR_NODE_STORAGE_KEY);
    return stored === "PC-B01" || stored === "PC-B02" || stored === "PC-B03" ? stored : null;
  });
  const [session, setSession] = useState<AccessSessionRecord>({
    role: accessRole ?? "central",
    nodeId: operatorNodeId,
    token: null
  });
  const [selectedRobotId, setSelectedRobotId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [centralAccessError, setCentralAccessError] = useState<string | null>(null);
  const [operatorAccessError, setOperatorAccessError] = useState<string | null>(null);
  const [centralLockMessage, setCentralLockMessage] = useState<string | null>(null);
  const [isAuthenticatingCentral, setIsAuthenticatingCentral] = useState(false);
  const [isAuthenticatingOperator, setIsAuthenticatingOperator] = useState(false);
  const [activeSessions, setActiveSessions] = useState<ActiveSessionView[]>([]);
  const [shouldRestoreOperatorSession, setShouldRestoreOperatorSession] = useState(
    accessRole === "operator" && operatorNodeId !== null
  );
  const [activeSection, setActiveSection] = useState<SidebarSection>("dashboard");

  const viewMode: ViewMode = accessRole === "operator" ? "operator" : "central";
  const sessionLabel =
    accessRole === "central"
      ? session.token
        ? "Panel Central"
        : "Acceso central"
      : accessRole === "operator"
        ? operatorNodeId
          ? `Operador ${operatorNodeId}`
          : "Operador secundario"
        : null;

  const headerTitle =
    accessRole === "central"
      ? "Centro de operaciones"
      : accessRole === "operator"
        ? "Puesto de operador"
        : "Acceso al sistema";

  const headerSubtitle =
    accessRole === "central"
      ? "Supervision completa de flota, rutas y sesiones activas."
      : accessRole === "operator"
        ? "Seleccione una tarea, elija un robot compatible y prepare el viaje."
        : "Seleccione el modo de acceso para continuar.";

  const handleSessionInvalid = useCallback(() => {
    setSession((current) => ({ ...current, token: null }));
    if (accessRole === "central") {
      setCentralAccessError("La sesion central ya no es valida. Vuelva a ingresar.");
      return;
    }

    setOperatorAccessError("La sesion del nodo secundario ya no es valida. Ingrese de nuevo.");
  }, [accessRole]);

  const {
    width,
    height,
    tick,
    tasks,
    logs,
    obstacles,
    previewRoutes,
    robots,
    connectionState,
    assignTask,
    startTask,
    cancelTaskPreparation,
    addObstacle,
    removeObstacle
  } = useGridRobotState(viewMode, selectedRobotId, session.token, handleSessionInvalid);

  const activeRobotId = useMemo(() => {
    return selectedRobotId;
  }, [selectedRobotId]);

  const highlightedTask = useMemo(() => {
    if (selectedTaskId) {
      const selectedTask = tasks.find((task) => task.id === selectedTaskId);
      if (selectedTask) {
        return selectedTask;
      }
    }

    if (viewMode === "operator") {
      return (
        tasks.find((task) => task.robotId === activeRobotId && task.status !== "COMPLETED") ??
        tasks.find((task) => task.status !== "COMPLETED") ??
        null
      );
    }

    if (activeRobotId) {
      return tasks.find((task) => task.robotId === activeRobotId && task.status !== "COMPLETED") ?? null;
    }

    return tasks.find((task) => task.status !== "COMPLETED") ?? null;
  }, [activeRobotId, selectedTaskId, tasks, viewMode]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (accessRole) {
      window.sessionStorage.setItem(ACCESS_ROLE_STORAGE_KEY, accessRole);
    } else {
      window.sessionStorage.removeItem(ACCESS_ROLE_STORAGE_KEY);
    }
  }, [accessRole]);

  useEffect(() => {
    if (operatorNodeId) {
      window.sessionStorage.setItem(OPERATOR_NODE_STORAGE_KEY, operatorNodeId);
    } else {
      window.sessionStorage.removeItem(OPERATOR_NODE_STORAGE_KEY);
    }
  }, [operatorNodeId]);

  const refreshActiveSessions = useCallback(async () => {
    if (!session.token || accessRole !== "central") {
      setActiveSessions([]);
      return;
    }

    const sessions = await api.getActiveSessions(session.token);
    setActiveSessions(sessions);
  }, [accessRole, session.token]);

  useEffect(() => {
    if (!highlightedTask) {
      setSelectedTaskId(null);
      return;
    }

    setSelectedTaskId((current) => (current === highlightedTask.id ? current : highlightedTask.id));
  }, [highlightedTask]);

  useEffect(() => {
    if (accessRole === "central" && session.token) {
      void refreshActiveSessions();
      return;
    }

    setActiveSessions([]);
  }, [accessRole, refreshActiveSessions, session.token]);

  useEffect(() => {
    if (!shouldRestoreOperatorSession || accessRole !== "operator" || !operatorNodeId || session.token) {
      return;
    }

    let active = true;
    setIsAuthenticatingOperator(true);
    setOperatorAccessError(null);

    void api
      .loginOperatorSession(operatorNodeId)
      .then((nextSession) => {
        if (!active) {
          return;
        }

        setSession(nextSession);
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        setOperatorAccessError(
          error instanceof Error ? error.message : "No se pudo restaurar la sesion del operador."
        );
      })
      .finally(() => {
        if (!active) {
          return;
        }

        setIsAuthenticatingOperator(false);
        setShouldRestoreOperatorSession(false);
      });

    return () => {
      active = false;
    };
  }, [accessRole, operatorNodeId, session.token, shouldRestoreOperatorSession]);

  const handleGridCellClick = async (position: GridPosition) => {
    const obstacleExists = obstacles.some(
      (obstacle) => obstacle.x === position.x && obstacle.y === position.y
    );

    if (obstacleExists) {
      await removeObstacle(position);
      return;
    }

    await addObstacle(position);
  };

  const handleSelectTask = async (taskId: string) => {
    const previouslyPreparedTask =
      viewMode === "operator" && selectedTaskId && selectedTaskId !== taskId
        ? tasks.find((task) => task.id === selectedTaskId && (task.status === "ASSIGNED" || task.status === "REASSIGNED"))
        : null;

    if (previouslyPreparedTask) {
      try {
        await cancelTaskPreparation(previouslyPreparedTask.id);
      } catch {
        // If cancellation fails, we still allow reselection and the backend will validate the next action.
      }
    }

    setSelectedTaskId(taskId);
    if (viewMode === "operator") {
      setSelectedRobotId(null);
    }
  };

  const resetToSelection = () => {
    setAccessRole(null);
    setOperatorNodeId(null);
    setSession({ role: "central", nodeId: null, token: null });
    setSelectedRobotId(null);
    setSelectedTaskId(null);
    setCentralAccessError(null);
    setCentralLockMessage(null);
    setOperatorAccessError(null);
    setActiveSessions([]);
    setShouldRestoreOperatorSession(false);
    window.sessionStorage.removeItem(ACCESS_ROLE_STORAGE_KEY);
    window.sessionStorage.removeItem(OPERATOR_NODE_STORAGE_KEY);
  };

  const handleCentralLogin = async (password: string) => {
    setIsAuthenticatingCentral(true);
    setCentralAccessError(null);
    setCentralLockMessage(null);

    try {
      const nextSession = await api.loginCentralSession(password);
      setAccessRole("central");
      setSession(nextSession);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo iniciar la sesion central.";
      if (message.includes("ya esta en uso")) {
        setCentralLockMessage(message);
      } else {
        setCentralAccessError(message);
      }
    } finally {
      setIsAuthenticatingCentral(false);
    }
  };

  const handleOperatorLogin = async () => {
    if (!operatorNodeId) {
      return;
    }

    setIsAuthenticatingOperator(true);
    setOperatorAccessError(null);

    try {
      const nextSession = await api.loginOperatorSession(operatorNodeId);
      setAccessRole("operator");
      setSession(nextSession);
    } catch (error) {
      setOperatorAccessError(
        error instanceof Error ? error.message : "No se pudo iniciar la sesion del operador."
      );
    } finally {
      setIsAuthenticatingOperator(false);
      setShouldRestoreOperatorSession(false);
    }
  };

  const handleLogout = async () => {
    if (session.token) {
      try {
        await api.logoutSession(session.token);
      } catch {
        // If the socket already released the lock, we still clear the local session.
      }
    }

    resetToSelection();
  };

  const handleReleaseOperatorSession = async (nodeId: OperatorNodeCode) => {
    if (!session.token) {
      return;
    }

    await api.releaseSession({ role: "operator", nodeId }, session.token);
    await refreshActiveSessions();
  };

  return (
    <div className="app-shell notranslate" translate="no">
      <AppSidebar
        accessRole={accessRole}
        activeSection={activeSection}
        onSelectSection={setActiveSection}
        sessionLabel={sessionLabel}
      />

      <div className="app-main">
        <AppHeaderBar
          title={headerTitle}
          subtitle={headerSubtitle}
          sessionLabel={sessionLabel}
          theme={theme}
          onToggleTheme={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
          {...(session.token ? { onLogout: () => void handleLogout() } : {})}
        />

        <div className="app-content">
          {accessRole === null ? (
            <AccessSelectionScreen
              onSelectCentral={() => {
                setAccessRole("central");
                setSession({ role: "central", nodeId: null, token: null });
              }}
              onSelectOperator={() => {
                setAccessRole("operator");
                setSession({ role: "operator", nodeId: operatorNodeId, token: null });
              }}
            />
          ) : accessRole === "central" && !session.token ? (
            <CentralAccessPanel
              isSubmitting={isAuthenticatingCentral}
              errorMessage={centralAccessError}
              lockMessage={centralLockMessage}
              onBack={resetToSelection}
              onLogin={handleCentralLogin}
            />
          ) : accessRole === "operator" && !session.token ? (
            <OperatorAccessPanel
              selectedNodeId={operatorNodeId}
              isSubmitting={isAuthenticatingOperator}
              errorMessage={operatorAccessError}
              onBack={resetToSelection}
              onSelectNode={(nodeId) => {
                setOperatorNodeId(nodeId);
                setSession({ role: "operator", nodeId, token: null });
              }}
              onLogin={handleOperatorLogin}
            />
          ) : accessRole === "central" ? (
            <CentralDashboard
              activeSection={activeSection}
              width={width}
              height={height}
              tick={tick}
              robots={robots}
              obstacles={obstacles}
              previewRoutes={previewRoutes}
              tasks={tasks}
              sessions={activeSessions}
              logs={logs}
              selectedRobotId={activeRobotId}
              selectedTaskId={selectedTaskId}
              highlightedTask={highlightedTask}
              connectionState={connectionState}
              onSelectRobot={setSelectedRobotId}
              onSelectTask={handleSelectTask}
              onAssignTask={assignTask}
              onStartTask={startTask}
              onCancelTask={cancelTaskPreparation}
              onRefreshSessions={refreshActiveSessions}
              onReleaseOperatorSession={handleReleaseOperatorSession}
              onGridCellClick={(position) => {
                void handleGridCellClick(position);
              }}
            />
          ) : (
            <OperatorDashboard
              activeSection={activeSection}
              width={width}
              height={height}
              tick={tick}
              robots={robots}
              obstacles={obstacles}
              previewRoutes={previewRoutes}
              tasks={tasks}
              logs={logs}
              selectedRobotId={activeRobotId}
              selectedTaskId={selectedTaskId}
              highlightedTask={highlightedTask}
              connectionState={connectionState}
              onSelectTask={handleSelectTask}
              onSelectRobot={setSelectedRobotId}
              onAssignTask={assignTask}
              onStartTask={startTask}
              onCancelTask={cancelTaskPreparation}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
