import { useCallback, useEffect, useMemo, useState } from "react";

import { AppHeaderBar } from "./components/AppHeaderBar";
import { AppSidebar } from "./components/AppSidebar";
import { AccessSelectionScreen } from "./components/AccessSelectionScreen";
import { CentralAccessPanel } from "./components/CentralAccessPanel";
import { OperatorAccessPanel } from "./components/OperatorAccessPanel";
import { AdminGameView } from "./views/AdminGameView";
import { CentralDashboard } from "./views/CentralDashboard";
import { OperatorDashboard } from "./views/OperatorDashboard";
import { GAME_ONLY_REDIRECT } from "./config";
import { useGridRobotState } from "./hooks/useGridRobotState";
import { api } from "./lib/api";
import { socket } from "./lib/socket";
import type {
  AccessRole,
  AccessSessionRecord,
  ActiveSessionView,
  GameStateSnapshot,
  GridPosition,
  Operator,
  OperatorNodeCode,
  RobotAdminInput,
  RobotState,
  OperatorAdminInput,
  SystemMode,
  ViewMode
} from "./types";

const ACCESS_ROLE_STORAGE_KEY = "gridrobot.access-role";
const OPERATOR_NODE_STORAGE_KEY = "gridrobot.operator-node";
const THEME_STORAGE_KEY = "gridrobot.theme";
const GAME_ACCESS_FLASH_STORAGE_KEY = "gridrobot.game-access-flash";
type SidebarSection = "dashboard" | "fleet" | "tasks" | "robots" | "operators" | "settings";

interface AppProps {
  currentPath: string;
}

const App = ({ currentPath }: AppProps) => {
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
    operatorId: null,
    operatorUsername: null,
    token: null
  });
  const [selectedRobotId, setSelectedRobotId] = useState<string | null>(null);
  const [selectedGridCell, setSelectedGridCell] = useState<GridPosition | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [centralAccessError, setCentralAccessError] = useState<string | null>(null);
  const [operatorAccessError, setOperatorAccessError] = useState<string | null>(null);
  const [centralLockMessage, setCentralLockMessage] = useState<string | null>(null);
  const [isAuthenticatingCentral, setIsAuthenticatingCentral] = useState(false);
  const [isAuthenticatingOperator, setIsAuthenticatingOperator] = useState(false);
  const [activeSessions, setActiveSessions] = useState<ActiveSessionView[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [systemMode, setSystemMode] = useState<SystemMode>("WAREHOUSE");
  const [gameState, setGameState] = useState<GameStateSnapshot | null>(null);
  const [hasLoadedSystemMode, setHasLoadedSystemMode] = useState(false);
  const [activeSection, setActiveSection] = useState<SidebarSection>("dashboard");
  const isCentralSessionActive = accessRole === "central" && session.token !== null;
  const isAdminPath = currentPath === "/admin";
  const isAdminGameViewPath = currentPath === "/admin/game-view";
  const isAdminAreaPath = isAdminPath || isAdminGameViewPath;
  const isRootPath = currentPath === "/";
  const isKnownAppPath = isRootPath || isAdminAreaPath;

  const navigateTo = useCallback((path: string, options?: { replace?: boolean; flashMessage?: string }) => {
    if (window.location.pathname === path) {
      return;
    }

    if (options?.flashMessage) {
      window.sessionStorage.setItem(GAME_ACCESS_FLASH_STORAGE_KEY, options.flashMessage);
    }

    if (options?.replace === false) {
      window.history.pushState(null, "", path);
    } else {
      window.history.replaceState(null, "", path);
    }
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);

  const viewMode: ViewMode = accessRole === "operator" ? "operator" : "central";
  const sessionLabel =
    accessRole === "central"
      ? session.token
        ? "Panel Central"
        : "Acceso central"
      : accessRole === "operator"
        ? session.operatorUsername
          ? `${session.operatorUsername} · ${operatorNodeId ?? "Sin nodo"}`
          : operatorNodeId
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
      ? "Supervisión completa de flota, rutas y sesiones activas."
      : accessRole === "operator"
        ? "Seleccione una tarea, elija un robot compatible y prepare el viaje."
        : "Seleccione el modo de acceso para continuar.";

  const handleSessionInvalid = useCallback(() => {
    setSession((current) => ({ ...current, token: null }));
    if (accessRole === "central") {
      setCentralAccessError("La sesión central ya no es válida. Vuelva a ingresar.");
      return;
    }

    setOperatorAccessError("La sesión del nodo secundario ya no es válida. Ingrese de nuevo.");
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
    mqttConnectionState,
    historyEvents,
    networkEvents,
    assignTask,
    startTask,
    cancelTaskPreparation,
    refreshHistoryEvents
  } = useGridRobotState(viewMode, selectedRobotId, session.token, handleSessionInvalid);

  const activeRobotId = useMemo(() => {
    return selectedRobotId;
  }, [selectedRobotId]);

  const operatorPreparedTask = useMemo(() => {
    if (viewMode !== "operator" || !session.operatorId) {
      return session.nodeId
        ? tasks.find(
            (task) =>
              task.assignedNodeId === session.nodeId &&
              (task.status === "ASSIGNED_PENDING_START" || task.status === "IN_PROGRESS")
          ) ?? null
        : null;
    }

    return (
      tasks.find(
        (task) =>
          (task.assignedOperatorId === session.operatorId || task.assignedNodeId === session.nodeId) &&
          (task.status === "ASSIGNED_PENDING_START" || task.status === "IN_PROGRESS")
      ) ?? null
    );
  }, [session.nodeId, session.operatorId, tasks, viewMode]);

  const highlightedTask = useMemo(() => {
    if (selectedTaskId) {
      const selectedTask = tasks.find((task) => task.id === selectedTaskId);
      if (selectedTask) {
        return selectedTask;
      }
    }

    if (viewMode === "operator") {
      return (
        operatorPreparedTask ??
        tasks.find((task) => task.robotId === activeRobotId && task.status !== "COMPLETED") ??
        tasks.find((task) => task.status !== "COMPLETED") ??
        null
      );
    }

    if (activeRobotId) {
      return tasks.find((task) => task.robotId === activeRobotId && task.status !== "COMPLETED") ?? null;
    }

    return tasks.find((task) => task.status !== "COMPLETED") ?? null;
  }, [activeRobotId, operatorPreparedTask, selectedTaskId, tasks, viewMode]);

  useEffect(() => {
    void api
      .getSystemMode()
      .then(setSystemMode)
      .catch(() => undefined)
      .finally(() => setHasLoadedSystemMode(true));
    void api.getGameState().then(setGameState).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!hasLoadedSystemMode) {
      return;
    }

    if (!isKnownAppPath) {
      navigateTo(systemMode === "GAME" && !isCentralSessionActive ? "/game" : isCentralSessionActive ? "/admin" : "/");
      return;
    }

    if (isAdminGameViewPath && !isCentralSessionActive) {
      navigateTo("/admin");
      return;
    }

    if (systemMode === "GAME") {
      if (accessRole === "operator") {
        setAccessRole(null);
        setOperatorNodeId(null);
        setSession({ role: "central", nodeId: null, operatorId: null, operatorUsername: null, token: null });
        setSelectedRobotId(null);
        setSelectedGridCell(null);
        setSelectedTaskId(null);
        setOperatorAccessError(null);
        window.sessionStorage.removeItem(ACCESS_ROLE_STORAGE_KEY);
        window.sessionStorage.removeItem(OPERATOR_NODE_STORAGE_KEY);
      }

      if (isRootPath && GAME_ONLY_REDIRECT) {
        navigateTo(
          isCentralSessionActive ? "/admin" : "/game",
          isCentralSessionActive
            ? undefined
            : {
                flashMessage: "GRIDBOT está actualmente en modo juego. Accede desde la pantalla de juego."
              }
        );
      }
    }
  }, [
    accessRole,
    hasLoadedSystemMode,
    isAdminGameViewPath,
    isCentralSessionActive,
    isKnownAppPath,
    isRootPath,
    navigateTo,
    systemMode
  ]);

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

  const refreshOperators = useCallback(async () => {
    if (!session.token || accessRole !== "central") {
      setOperators([]);
      return;
    }

    const nextOperators = await api.getOperators(session.token);
    setOperators(nextOperators);
  }, [accessRole, session.token]);

  useEffect(() => {
    if (!highlightedTask) {
      setSelectedTaskId(null);
      return;
    }

    setSelectedTaskId((current) => (current === highlightedTask.id ? current : highlightedTask.id));
  }, [highlightedTask]);

  useEffect(() => {
    if (viewMode !== "operator" || !operatorPreparedTask) {
      return;
    }

    setSelectedTaskId((current) => (current === operatorPreparedTask.id ? current : operatorPreparedTask.id));
    setSelectedRobotId((current) =>
      current === operatorPreparedTask.robotId ? current : operatorPreparedTask.robotId
    );
  }, [operatorPreparedTask, viewMode]);

  useEffect(() => {
    if (accessRole === "central" && session.token) {
      void refreshActiveSessions();
      void refreshOperators();
      return;
    }

    setActiveSessions([]);
    setOperators([]);
  }, [accessRole, refreshActiveSessions, refreshOperators, session.token]);

  useEffect(() => {
    if (!session.token) {
      return;
    }

    const onModeChanged = (payload: { mode: SystemMode }) => {
      setSystemMode(payload.mode);
    };
    const onGameState = (payload: GameStateSnapshot) => {
      setGameState(payload);
    };

    socket.on("system:modeChanged", onModeChanged);
    socket.on("game:state", onGameState);

    return () => {
      socket.off("system:modeChanged", onModeChanged);
      socket.off("game:state", onGameState);
    };
  }, [session.token]);

  const handleGridCellClick = async (position: GridPosition) => {
    if (systemMode === "GAME") {
      return;
    }

    setSelectedGridCell(position);
    const robotAtCell = robots.find((robot) => robot.position.x === position.x && robot.position.y === position.y);
    if (robotAtCell) {
      setSelectedRobotId(robotAtCell.id);
      return;
    }

    setSelectedRobotId(null);
  };

  const handleSelectRobot = (robotId: string | null) => {
    setSelectedRobotId(robotId);
    const robot = robotId ? robots.find((entry) => entry.id === robotId) : null;
    setSelectedGridCell(robot ? robot.position : null);
  };

  const emitAdminGameEvent = (eventName: "game:adminStart" | "game:adminPause" | "game:adminResume" | "game:adminReset") => {
    if (!session.token || accessRole !== "central") {
      return;
    }

    socket.emit(eventName);
  };

  const handleSelectTask = async (taskId: string) => {
    const previouslyPreparedTask =
      viewMode === "operator" && selectedTaskId && selectedTaskId !== taskId
        ? tasks.find((task) => task.id === selectedTaskId && task.status === "ASSIGNED_PENDING_START")
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
    setSession({ role: "central", nodeId: null, operatorId: null, operatorUsername: null, token: null });
    setSelectedRobotId(null);
    setSelectedGridCell(null);
    setSelectedTaskId(null);
    setCentralAccessError(null);
    setCentralLockMessage(null);
    setOperatorAccessError(null);
    setActiveSessions([]);
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
      const message = error instanceof Error ? error.message : "No se pudo iniciar la sesión central.";
      if (message.includes("ya esta en uso")) {
        setCentralLockMessage(message);
      } else {
        setCentralAccessError(message);
      }
    } finally {
      setIsAuthenticatingCentral(false);
    }
  };

  const handleOperatorLogin = async (credentials: { username: string; password: string }) => {
    if (!operatorNodeId) {
      return;
    }

    setIsAuthenticatingOperator(true);
    setOperatorAccessError(null);

    try {
      const nextSession = await api.loginOperatorSession(
        operatorNodeId,
        credentials.username,
        credentials.password
      );
      setAccessRole("operator");
      setSession(nextSession);
    } catch (error) {
      setOperatorAccessError(
        error instanceof Error ? error.message : "No se pudo iniciar la sesión del operador."
      );
    } finally {
      setIsAuthenticatingOperator(false);
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
    navigateTo(systemMode === "GAME" ? "/admin" : "/");
  };

  const handleReleaseOperatorSession = async (nodeId: OperatorNodeCode) => {
    if (!session.token) {
      return;
    }

    await api.releaseSession({ role: "operator", nodeId }, session.token);
    await refreshActiveSessions();
  };

  const handleCreateRobot = async (payload: RobotAdminInput) => {
    if (!session.token) {
      return;
    }

    const robot = await api.createRobot(payload, session.token);
    handleSelectRobot(robot.id);
  };

  const handleUpdateRobot = async (robotId: string, payload: RobotAdminInput) => {
    if (!session.token) {
      return;
    }

    await api.updateRobot(robotId, payload, session.token);
  };

  const handleToggleRobot = async (robot: RobotState) => {
    if (!session.token) {
      return;
    }

    await api.updateRobotStatus(
      robot.id,
      {
        status: robot.isActive ? "inactivo" : "activo",
        isActive: !robot.isActive
      },
      session.token
    );
  };

  const handleCreateOperator = async (payload: OperatorAdminInput & { password: string }) => {
    if (!session.token) {
      return;
    }

    await api.createOperator(payload, session.token);
    await refreshOperators();
  };

  const handleUpdateOperator = async (operatorId: string, payload: OperatorAdminInput) => {
    if (!session.token) {
      return;
    }

    await api.updateOperator(operatorId, payload, session.token);
    await refreshOperators();
  };

  const handleToggleOperator = async (operator: Operator) => {
    if (!session.token) {
      return;
    }

    await api.updateOperatorStatus(operator.id, !operator.isActive, session.token);
    await refreshOperators();
  };

  const handleSendRobotCommand = async (payload: {
    robotId: string;
    command: "PAUSE" | "RESUME" | "EMERGENCY_STOP" | "SET_SPEED";
    speedCellsPerSec?: number;
  }) => {
    if (!session.token) {
      return;
    }

    await api.sendRobotCommand(payload.robotId, payload, session.token);
    await refreshHistoryEvents();
  };

  const showAdminGameView =
    hasLoadedSystemMode && accessRole === "central" && session.token !== null && isAdminGameViewPath;

  if (showAdminGameView) {
    return (
      <AdminGameView
        systemMode={systemMode}
        gameState={gameState}
        onBackToAdmin={() => navigateTo("/admin", { replace: false })}
        onPause={() => emitAdminGameEvent("game:adminPause")}
        onResume={() => emitAdminGameEvent("game:adminResume")}
        onReset={() => emitAdminGameEvent("game:adminReset")}
      />
    );
  }

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
          {!hasLoadedSystemMode ? (
            <main className="dashboard">
              <section className="hero">
                <div>
                  <p className="eyebrow">GRIDROBOT</p>
                  <h1>Cargando estado del sistema</h1>
                  <p className="hero__lede">Cargando modo del sistema para mostrar la vista correcta.</p>
                </div>
              </section>
            </main>
          ) : accessRole === null ? (
            <AccessSelectionScreen
              onSelectCentral={() => {
                setAccessRole("central");
                setSession({ role: "central", nodeId: null, operatorId: null, operatorUsername: null, token: null });
              }}
              onSelectOperator={() => {
                setAccessRole("operator");
                setSession({ role: "operator", nodeId: operatorNodeId, operatorId: null, operatorUsername: null, token: null });
              }}
              showOperator={!isAdminAreaPath && systemMode === "WAREHOUSE"}
              {...(systemMode === "GAME"
                ? {
                    onGoGame: () => {
                      navigateTo("/game");
                    }
                  }
                : {})}
            />
          ) : accessRole === "central" && !session.token ? (
            <CentralAccessPanel
              isSubmitting={isAuthenticatingCentral}
              errorMessage={centralAccessError}
              lockMessage={centralLockMessage}
              onBack={() => {
                resetToSelection();
                navigateTo(systemMode === "GAME" ? "/game" : "/");
              }}
              onLogin={handleCentralLogin}
            />
          ) : accessRole === "operator" ? (
            !session.token && !isAdminAreaPath && systemMode !== "GAME" ? (
              <OperatorAccessPanel
                selectedNodeId={operatorNodeId}
                isSubmitting={isAuthenticatingOperator}
                errorMessage={operatorAccessError}
                onBack={resetToSelection}
                onSelectNode={(nodeId) => {
                  setOperatorNodeId(nodeId);
                  setSession({ role: "operator", nodeId, operatorId: null, operatorUsername: null, token: null });
                }}
                onLogin={handleOperatorLogin}
              />
            ) : !session.token ? (
              <AccessSelectionScreen
                onSelectCentral={() => {
                  setAccessRole("central");
                  setSession({ role: "central", nodeId: null, operatorId: null, operatorUsername: null, token: null });
                }}
                onSelectOperator={() => undefined}
                showOperator={false}
                {...(systemMode === "GAME"
                  ? {
                      onGoGame: () => {
                        navigateTo("/game");
                      }
                    }
                  : {})}
              />
            ) : (
              <OperatorDashboard
                activeSection={activeSection}
                operatorNodeId={operatorNodeId}
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
                sessionOperatorId={session.operatorId ?? null}
                sessionNodeId={session.nodeId ?? null}
                highlightedTask={highlightedTask}
                connectionState={connectionState}
                onSelectTask={handleSelectTask}
                onSelectRobot={handleSelectRobot}
                onAssignTask={assignTask}
                onStartTask={startTask}
                onCancelTask={cancelTaskPreparation}
                warehouseActionsDisabled={systemMode === "GAME"}
              />
            )
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
              operators={operators}
              sessions={activeSessions}
              logs={logs}
              mqttConnectionState={mqttConnectionState}
              historyEvents={historyEvents}
              networkEvents={networkEvents}
              selectedRobotId={activeRobotId}
              selectedGridCell={selectedGridCell}
              selectedTaskId={selectedTaskId}
              highlightedTask={highlightedTask}
              connectionState={connectionState}
              systemMode={systemMode}
              gameState={gameState}
              onSelectRobot={handleSelectRobot}
              onSelectTask={handleSelectTask}
              onAssignTask={assignTask}
              onStartTask={startTask}
              onCancelTask={cancelTaskPreparation}
              onRefreshSessions={refreshActiveSessions}
              onReleaseOperatorSession={handleReleaseOperatorSession}
              onCreateRobot={handleCreateRobot}
              onUpdateRobot={handleUpdateRobot}
              onToggleRobot={handleToggleRobot}
              onCreateOperator={handleCreateOperator}
              onUpdateOperator={handleUpdateOperator}
              onToggleOperator={handleToggleOperator}
              onSendRobotCommand={handleSendRobotCommand}
              onGridCellClick={(position) => {
                void handleGridCellClick(position);
              }}
              onSystemModeChange={(mode) => {
                if (!session.token) {
                  return;
                }

                void api.setSystemMode(mode, session.token).then(setSystemMode);
              }}
              onGameStart={() => emitAdminGameEvent("game:adminStart")}
              onGamePause={() => emitAdminGameEvent("game:adminPause")}
              onGameResume={() => emitAdminGameEvent("game:adminResume")}
              onGameReset={() => emitAdminGameEvent("game:adminReset")}
              onOpenGameView={() => navigateTo("/admin/game-view", { replace: false })}
            />
          ) : (
            <AccessSelectionScreen
              onSelectCentral={() => {
                setAccessRole("central");
                setSession({ role: "central", nodeId: null, operatorId: null, operatorUsername: null, token: null });
              }}
              onSelectOperator={() => undefined}
              showOperator={false}
              {...(systemMode === "GAME"
                ? {
                    onGoGame: () => {
                      navigateTo("/game");
                    }
                  }
                : {})}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
