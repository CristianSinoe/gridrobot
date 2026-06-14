import type { Socket } from "socket.io";

import { env } from "../../config/env.js";
import { resolveClientIp } from "../../config/network.js";

export class SocketConnectionLimiter {
  private readonly activeConnectionsByIp = new Map<string, number>();

  public register(socket: Socket): { allowed: boolean; clientIp: string } {
    const clientIp = resolveClientIp(
      socket.handshake.headers["x-forwarded-for"],
      socket.handshake.address || null
    );

    if (!env.DEMO_MODE) {
      return {
        allowed: true,
        clientIp
      };
    }

    const currentConnections = this.activeConnectionsByIp.get(clientIp) ?? 0;
    if (currentConnections >= env.SOCKET_MAX_CONNECTIONS_PER_IP) {
      return {
        allowed: false,
        clientIp
      };
    }

    this.activeConnectionsByIp.set(clientIp, currentConnections + 1);

    return {
      allowed: true,
      clientIp
    };
  }

  public release(clientIp: string): void {
    const currentConnections = this.activeConnectionsByIp.get(clientIp) ?? 0;
    if (currentConnections <= 1) {
      this.activeConnectionsByIp.delete(clientIp);
      return;
    }

    this.activeConnectionsByIp.set(clientIp, currentConnections - 1);
  }
}
