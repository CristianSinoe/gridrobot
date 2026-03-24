import { useEffect, useMemo, useState } from "react";

import { api } from "../lib/api";
import { socket } from "../lib/socket";
import type {
  GridPosition,
  LogEntry,
  PreviewRoute,
  RobotState,
  Task,
  ViewMode,
  WorldBootstrap,
  WorldSnapshot
} from "../types";

interface State {
  width: number;
  height: number;
  tick: number;
  robots: RobotState[];
  obstacles: GridPosition[];
  tasks: Task[];
  previewRoutes: PreviewRoute[];
  logs: LogEntry[];
  connectionState: "connecting" | "connected" | "disconnected";
}

const initialState: State = {
  width: 40,
  height: 25,
  tick: 0,
  robots: [],
  obstacles: [],
  tasks: [],
  previewRoutes: [],
  logs: [],
  connectionState: "connecting"
};

const pushLog = (entries: LogEntry[], level: LogEntry["level"], message: string): LogEntry[] => {
  const nextEntry: LogEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    level,
    message,
    timestamp: new Date().toISOString()
  };

  return [nextEntry, ...entries].slice(0, 80);
};

export const useGridRobotState = (
  viewMode: ViewMode,
  selectedRobotId: string | null,
  sessionToken: string | null,
  onSessionInvalid?: () => void
) => {
  const [state, setState] = useState<State>(initialState);
  const [hasHandledInvalidSession, setHasHandledInvalidSession] = useState(false);

  const handleSessionError = (error: unknown) => {
    if (
      !hasHandledInvalidSession &&
      error instanceof Error &&
      error.message.includes("sesion activa no es valida")
    ) {
      setHasHandledInvalidSession(true);
      onSessionInvalid?.();
    }
  };

  const refreshTasks = async (robotId?: string) => {
    if (!sessionToken) {
      setState((current) => ({ ...current, tasks: [] }));
      return;
    }

    try {
      const tasks = await api.getTasks(robotId, sessionToken);
      setState((current) => ({ ...current, tasks }));
    } catch (error) {
      handleSessionError(error);
      throw error;
    }
  };

  const operatorRobotId = viewMode === "operator" ? selectedRobotId : null;

  useEffect(() => {
    if (!sessionToken) {
      setHasHandledInvalidSession(false);
      setState((current) => ({ ...current, tasks: [], connectionState: "disconnected" }));
      return;
    }

    let active = true;

    const loadTasks = async () => {
      try {
        const tasks = await api.getTasks(
          undefined,
          sessionToken
        );
        if (!active) {
          return;
        }

        setState((current) => ({ ...current, tasks }));
      } catch (error) {
        handleSessionError(error);
        if (!active) {
          return;
        }

        setState((current) => ({
          ...current,
          logs: pushLog(
            current.logs,
            "error",
            error instanceof Error ? error.message : "No se pudieron cargar las tareas."
          )
        }));
      }
    };

    void loadTasks();

    return () => {
      active = false;
    };
  }, [sessionToken, viewMode]);

  useEffect(() => {
    if (!sessionToken || viewMode !== "operator") {
      return;
    }

    socket.emit("viewer:focusRobot", {
      robotId: selectedRobotId
    });
  }, [selectedRobotId, sessionToken, viewMode]);

  useEffect(() => {
    if (!sessionToken) {
      socket.disconnect();
      return;
    }

    socket.auth = { sessionToken };

    const onConnect = () => {
      setState((current) => ({
        ...current,
        connectionState: "connected",
        logs: pushLog(current.logs, "info", "Conexion en tiempo real establecida.")
      }));
    };

    const onDisconnect = () => {
      setState((current) => ({
        ...current,
        connectionState: "disconnected",
        logs: pushLog(current.logs, "warn", "Conexion en tiempo real interrumpida.")
      }));
    };

    const onBootstrap = (payload: WorldBootstrap) => {
      setState((current) => ({
        ...current,
        width: payload.width,
        height: payload.height,
        robots: payload.robots,
        obstacles: payload.obstacles,
        tasks: payload.tasks ?? current.tasks,
        previewRoutes: payload.previewRoutes ?? current.previewRoutes,
        logs: pushLog(current.logs, "info", "Estado inicial del mundo recibido.")
      }));
    };

    const onSnapshot = (payload: WorldSnapshot) => {
      setState((current) => ({
        ...current,
        tick: payload.tick,
        width: payload.width,
        height: payload.height,
        robots: payload.robots,
        obstacles: payload.obstacles,
        tasks: payload.tasks ?? current.tasks,
        previewRoutes: payload.previewRoutes ?? current.previewRoutes
      }));
    };

    const onRobotUpdated = (robot: RobotState) => {
      const robotMessage =
        robot.status === "OFFLINE" && robot.catalogStatus === "averiado"
          ? `${robot.name} sufrio una falla y quedo fuera de servicio.`
          : `${robot.name} actualizado a ${robot.status}.`;

      setState((current) => ({
        ...current,
        robots: current.robots.some((entry) => entry.id === robot.id)
          ? current.robots.map((entry) => (entry.id === robot.id ? robot : entry))
          : [...current.robots, robot],
        logs: pushLog(current.logs, robot.status === "OFFLINE" ? "warn" : "info", robotMessage)
      }));
    };

    const onTaskUpdated = (task: Task) => {
      const taskMessage =
        task.status === "WAITING_ASSISTANCE"
          ? `La tarea ${task.name} quedo interrumpida y espera asistencia.`
          : task.status === "REASSIGNED"
            ? `La tarea ${task.name} fue reasignada.`
            : `Tarea ${task.name} actualizada.`;

      setState((current) => ({
        ...current,
        tasks:
          viewMode === "central"
            ? current.tasks.some((entry) => entry.id === task.id)
              ? current.tasks.map((entry) => (entry.id === task.id ? task : entry))
              : [task, ...current.tasks]
            : current.tasks.some((entry) => entry.id === task.id)
              ? current.tasks.map((entry) => (entry.id === task.id ? task : entry))
              : current.tasks,
        logs: pushLog(current.logs, task.status === "WAITING_ASSISTANCE" ? "warn" : "info", taskMessage)
      }));
    };

    const onTaskList = (tasks: Task[]) => {
      setState((current) => ({
        ...current,
        tasks
      }));
    };

    const onObstacleList = (obstacles: GridPosition[]) => {
      setState((current) => ({
        ...current,
        obstacles,
        logs: pushLog(current.logs, "info", "Mapa de obstaculos actualizado.")
      }));
    };

    const onPreviewList = (previewRoutes: PreviewRoute[]) => {
      setState((current) => ({
        ...current,
        previewRoutes,
        logs: pushLog(current.logs, "info", "Previsualizacion de rutas actualizada.")
      }));
    };

    const onError = (payload: { message: string }) => {
      if (payload.message.includes("ya no es valida")) {
        onSessionInvalid?.();
      }

      setState((current) => ({
        ...current,
        logs: pushLog(current.logs, "error", payload.message)
      }));
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("world:bootstrap", onBootstrap);
    socket.on("world:snapshot", onSnapshot);
    socket.on("robot:updated", onRobotUpdated);
    socket.on("task:updated", onTaskUpdated);
    socket.on("tasks:list", onTaskList);
    socket.on("obstacle:list", onObstacleList);
    socket.on("preview:list", onPreviewList);
    socket.on("gateway:error", onError);

    socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("world:bootstrap", onBootstrap);
      socket.off("world:snapshot", onSnapshot);
      socket.off("robot:updated", onRobotUpdated);
      socket.off("task:updated", onTaskUpdated);
      socket.off("tasks:list", onTaskList);
      socket.off("obstacle:list", onObstacleList);
      socket.off("preview:list", onPreviewList);
      socket.off("gateway:error", onError);
      socket.disconnect();
    };
  }, [onSessionInvalid, sessionToken, viewMode]);

  const visibleRobots = useMemo(() => state.robots, [state.robots]);

  return {
    ...state,
    visibleRobots,
    async assignTask(taskId: string, robotId: string) {
      let task: Task;
      try {
        task = await api.assignTask(taskId, robotId, sessionToken);
      } catch (error) {
        handleSessionError(error);
        throw error;
      }
      setState((current) => ({
        ...current,
        tasks: current.tasks.some((entry) => entry.id === task.id)
          ? current.tasks.map((entry) => (entry.id === task.id ? task : entry))
          : [task, ...current.tasks],
        logs: pushLog(current.logs, "info", `Tarea ${task.name} asignada al robot ${robotId}.`)
      }));
      socket.emit("world:refresh");
      try {
        await refreshTasks(undefined);
      } catch {
        // The session handler already emitted feedback if needed.
      }
    },
    async startTask(taskId: string, robotId: string) {
      let task: Task;
      try {
        task = await api.startTask(taskId, robotId, sessionToken);
      } catch (error) {
        handleSessionError(error);
        throw error;
      }
      setState((current) => ({
        ...current,
        tasks: current.tasks.map((entry) => (entry.id === task.id ? task : entry)),
        logs: pushLog(current.logs, "info", `Viaje iniciado para la tarea ${task.name}.`)
      }));
      socket.emit("world:refresh");
      try {
        await refreshTasks(undefined);
      } catch {
        // The session handler already emitted feedback if needed.
      }
    },
    async cancelTaskPreparation(taskId: string) {
      let task: Task;
      try {
        task = await api.cancelTaskPreparation(taskId, sessionToken);
      } catch (error) {
        handleSessionError(error);
        throw error;
      }

      setState((current) => ({
        ...current,
        tasks: current.tasks.map((entry) => (entry.id === task.id ? task : entry)),
        previewRoutes: current.previewRoutes.filter((entry) => entry.taskId !== taskId),
        logs: pushLog(current.logs, "info", `Preparacion cancelada para la tarea ${task.name}.`)
      }));
      socket.emit("world:refresh");

      try {
        await refreshTasks(undefined);
      } catch {
        // The session handler already emitted feedback if needed.
      }
    },
    async addObstacle(position: GridPosition) {
      try {
        await api.addObstacle(position.x, position.y, sessionToken);
      } catch (error) {
        handleSessionError(error);
        throw error;
      }
      setState((current) => ({
        ...current,
        logs: pushLog(current.logs, "warn", `Obstaculo agregado en ${position.x},${position.y}.`)
      }));
    },
    async removeObstacle(position: GridPosition) {
      try {
        await api.removeObstacle(position.x, position.y, sessionToken);
      } catch (error) {
        handleSessionError(error);
        throw error;
      }
      setState((current) => ({
        ...current,
        logs: pushLog(current.logs, "info", `Obstaculo retirado de ${position.x},${position.y}.`)
      }));
    }
  };
};
