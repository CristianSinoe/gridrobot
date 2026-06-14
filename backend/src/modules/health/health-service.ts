import type { PrismaClient } from "@prisma/client";

import type { MqttBridgeService } from "../mqtt/mqtt-bridge-service.js";
import type { SystemModeService } from "../system/system-mode-service.js";

export interface HealthSnapshot {
  status: "ok" | "degraded";
  api: "ok";
  database: "ok" | "error";
  mqtt: "connected" | "reconnecting" | "disconnected";
  timestamp: string;
  mode: "WAREHOUSE" | "GAME";
}

export class HealthService {
  public constructor(
    private readonly prisma: PrismaClient,
    private readonly mqttBridgeService: MqttBridgeService,
    private readonly systemModeService: SystemModeService
  ) {}

  public async getSnapshot(): Promise<HealthSnapshot> {
    const database = await this.checkDatabase();
    const mqtt = this.mqttBridgeService.getConnectionState();
    const status = database === "ok" && mqtt === "connected" ? "ok" : "degraded";

    return {
      status,
      api: "ok",
      database,
      mqtt,
      timestamp: new Date().toISOString(),
      mode: this.systemModeService.getMode()
    };
  }

  private async checkDatabase(): Promise<"ok" | "error"> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return "ok";
    } catch {
      return "error";
    }
  }
}
