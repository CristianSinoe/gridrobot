import { API_URL } from "../config";
import type { ActiveSessionView, OperatorNodeCode, Task } from "../types";

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
  async loginOperatorSession(nodeId: OperatorNodeCode): Promise<{ token: string; role: "operator"; nodeId: OperatorNodeCode }> {
    const response = await fetch(`${API_URL}/sessions/operator/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ nodeId })
    });

    return (await assertOk(response)).json() as Promise<{ token: string; role: "operator"; nodeId: OperatorNodeCode }>;
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
  }
};
