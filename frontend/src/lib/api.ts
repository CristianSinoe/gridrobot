import { API_URL } from "../config";
import type {
  ActiveSessionView,
  EventLogEntry,
  GameStateSnapshot,
  Operator,
  OperatorAdminInput,
  OperatorNodeCode,
  RobotAdminInput,
  RobotTelemetryEntry,
  RobotCommandType,
  RobotState,
  SystemMode,
  Task
} from "../types";

const assertOk = async (response: Response) => {
  if (response.ok) {
    return response;
  }

  let message = "La solicitud fallo.";

  try {
    const body = (await response.json()) as { message?: string };
    message = body.message ?? message;
  } catch {
    message = response.statusText || message;
  }

  throw new Error(message);
};

const buildSessionHeaders = (sessionToken?: string | null): Record<string, string> =>
  sessionToken ? { "x-session-token": sessionToken } : {};

export const api = {
  async loginCentralSession(password: string): Promise<{ token: string; role: "central"; nodeId: null }> {
    const response = await fetch(`${API_URL}/sessions/central/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ password })
    });

    return (await assertOk(response)).json() as Promise<{ token: string; role: "central"; nodeId: null }>;
  },
  async loginOperatorSession(
    nodeId: OperatorNodeCode,
    username: string,
    password: string
  ): Promise<{
    token: string;
    role: "operator";
    nodeId: OperatorNodeCode;
    operatorId: string | null;
    operatorUsername: string | null;
  }> {
    const response = await fetch(`${API_URL}/sessions/operator/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ nodeId, username, password })
    });

    return (await assertOk(response)).json() as Promise<{
      token: string;
      role: "operator";
      nodeId: OperatorNodeCode;
      operatorId: string | null;
      operatorUsername: string | null;
    }>;
  },
  async logoutSession(token: string): Promise<void> {
    const response = await fetch(`${API_URL}/sessions/logout`, {
      method: "POST",
      headers: {
        "x-session-token": token
      }
    });

    await assertOk(response);
  },
  async getActiveSessions(sessionToken: string): Promise<ActiveSessionView[]> {
    const response = await fetch(`${API_URL}/sessions`, {
      headers: buildSessionHeaders(sessionToken)
    });

    return (await assertOk(response)).json() as Promise<ActiveSessionView[]>;
  },
  async releaseSession(
    payload: { role: "central" } | { role: "operator"; nodeId: OperatorNodeCode },
    sessionToken: string
  ): Promise<void> {
    const response = await fetch(`${API_URL}/sessions/release`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildSessionHeaders(sessionToken)
      },
      body: JSON.stringify(payload)
    });

    await assertOk(response);
  },
  async getTasks(robotId?: string, sessionToken?: string | null): Promise<Task[]> {
    const query = robotId ? `?robotId=${encodeURIComponent(robotId)}` : "";
    const response = await fetch(`${API_URL}/tasks${query}`, {
      headers: buildSessionHeaders(sessionToken)
    });
    return (await assertOk(response)).json() as Promise<Task[]>;
  },
  async assignTask(taskId: string, robotId: string, sessionToken?: string | null): Promise<Task> {
    const response = await fetch(`${API_URL}/tasks/${taskId}/assign`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildSessionHeaders(sessionToken)
      },
      body: JSON.stringify({ robotId })
    });

    return (await assertOk(response)).json() as Promise<Task>;
  },
  async startTask(taskId: string, robotId: string, sessionToken?: string | null): Promise<Task> {
    const response = await fetch(`${API_URL}/tasks/${taskId}/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildSessionHeaders(sessionToken)
      },
      body: JSON.stringify({ robotId })
    });

    return (await assertOk(response)).json() as Promise<Task>;
  },
  async cancelTaskPreparation(taskId: string, sessionToken?: string | null): Promise<Task> {
    const response = await fetch(`${API_URL}/tasks/${taskId}/cancel`, {
      method: "POST",
      headers: {
        ...buildSessionHeaders(sessionToken)
      }
    });

    return (await assertOk(response)).json() as Promise<Task>;
  },
  async addObstacle(x: number, y: number, sessionToken?: string | null): Promise<void> {
    const response = await fetch(`${API_URL}/obstacles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildSessionHeaders(sessionToken)
      },
      body: JSON.stringify({ x, y })
    });

    await assertOk(response);
  },
  async removeObstacle(x: number, y: number, sessionToken?: string | null): Promise<void> {
    const response = await fetch(`${API_URL}/obstacles`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...buildSessionHeaders(sessionToken)
      },
      body: JSON.stringify({ x, y })
    });

    await assertOk(response);
  },
  async getSystemMode(): Promise<SystemMode> {
    const response = await fetch(`${API_URL}/system/mode`);
    const payload = (await assertOk(response)).json() as Promise<{ mode: SystemMode }>;
    return (await payload).mode;
  },
  async setSystemMode(mode: SystemMode, sessionToken: string): Promise<SystemMode> {
    const response = await fetch(`${API_URL}/system/mode`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildSessionHeaders(sessionToken)
      },
      body: JSON.stringify({ mode })
    });
    const payload = (await assertOk(response)).json() as Promise<{ mode: SystemMode }>;
    return (await payload).mode;
  },
  async getGameState(): Promise<GameStateSnapshot> {
    const response = await fetch(`${API_URL}/game/state`);
    return (await assertOk(response)).json() as Promise<GameStateSnapshot>;
  },
  async getHistoryEvents(
    sessionToken: string,
    options?: {
      type?: string;
      source?: string;
      from?: string;
      to?: string;
      limit?: number;
      cursor?: string;
    }
  ): Promise<EventLogEntry[]> {
    const search = new URLSearchParams();
    if (options?.type) search.set("type", options.type);
    if (options?.source) search.set("source", options.source);
    if (options?.from) search.set("from", options.from);
    if (options?.to) search.set("to", options.to);
    if (typeof options?.limit === "number") search.set("limit", String(options.limit));
    if (options?.cursor) search.set("cursor", options.cursor);
    const response = await fetch(`${API_URL}/history/events${search.size ? `?${search.toString()}` : ""}`, {
      headers: buildSessionHeaders(sessionToken)
    });
    return (await assertOk(response)).json() as Promise<EventLogEntry[]>;
  },
  async getTelemetryHistory(
    sessionToken: string,
    options?: {
      robotId?: string;
      from?: string;
      to?: string;
      limit?: number;
    }
  ): Promise<RobotTelemetryEntry[]> {
    const search = new URLSearchParams();
    if (options?.from) search.set("from", options.from);
    if (options?.to) search.set("to", options.to);
    if (typeof options?.limit === "number") search.set("limit", String(options.limit));
    const path = options?.robotId
      ? `/history/telemetry/${options.robotId}`
      : `/history/telemetry`;
    const response = await fetch(`${API_URL}${path}${search.size ? `?${search.toString()}` : ""}`, {
      headers: buildSessionHeaders(sessionToken)
    });
    return (await assertOk(response)).json() as Promise<RobotTelemetryEntry[]>;
  },
  async sendRobotCommand(
    robotId: string,
    payload: { command: RobotCommandType; speedCellsPerSec?: number },
    sessionToken: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_URL}/robots/${robotId}/commands`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildSessionHeaders(sessionToken)
      },
      body: JSON.stringify(payload)
    });
    return (await assertOk(response)).json() as Promise<{ success: boolean; message: string }>;
  },
  async createRobot(payload: RobotAdminInput, sessionToken: string): Promise<RobotState> {
    const response = await fetch(`${API_URL}/robots`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildSessionHeaders(sessionToken)
      },
      body: JSON.stringify(payload)
    });
    return (await assertOk(response)).json() as Promise<RobotState>;
  },
  async updateRobot(robotId: string, payload: RobotAdminInput, sessionToken: string): Promise<RobotState> {
    const response = await fetch(`${API_URL}/robots/${robotId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...buildSessionHeaders(sessionToken)
      },
      body: JSON.stringify(payload)
    });
    return (await assertOk(response)).json() as Promise<RobotState>;
  },
  async updateRobotStatus(
    robotId: string,
    payload: Pick<RobotAdminInput, "status" | "isActive">,
    sessionToken: string
  ): Promise<RobotState> {
    const response = await fetch(`${API_URL}/robots/${robotId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...buildSessionHeaders(sessionToken)
      },
      body: JSON.stringify(payload)
    });
    return (await assertOk(response)).json() as Promise<RobotState>;
  },
  async getOperators(sessionToken: string): Promise<Operator[]> {
    const response = await fetch(`${API_URL}/operators`, {
      headers: buildSessionHeaders(sessionToken)
    });
    return (await assertOk(response)).json() as Promise<Operator[]>;
  },
  async createOperator(payload: OperatorAdminInput & { password: string }, sessionToken: string): Promise<Operator> {
    const response = await fetch(`${API_URL}/operators`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildSessionHeaders(sessionToken)
      },
      body: JSON.stringify(payload)
    });
    return (await assertOk(response)).json() as Promise<Operator>;
  },
  async updateOperator(operatorId: string, payload: OperatorAdminInput, sessionToken: string): Promise<Operator> {
    const response = await fetch(`${API_URL}/operators/${operatorId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...buildSessionHeaders(sessionToken)
      },
      body: JSON.stringify(payload)
    });
    return (await assertOk(response)).json() as Promise<Operator>;
  },
  async updateOperatorStatus(operatorId: string, isActive: boolean, sessionToken: string): Promise<Operator> {
    const response = await fetch(`${API_URL}/operators/${operatorId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...buildSessionHeaders(sessionToken)
      },
      body: JSON.stringify({ isActive })
    });
    return (await assertOk(response)).json() as Promise<Operator>;
  }
};
