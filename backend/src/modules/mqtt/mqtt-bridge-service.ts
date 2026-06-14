import type { MqttClient } from "mqtt";

import { env } from "../../config/env.js";
import { MQTT_TOPICS } from "../../config/constants.js";
import type { EventLogService } from "../events/event-log-service.js";
import type { RobotService } from "../robots/robot-service.js";
import type { RobotTelemetryService } from "../telemetry/robot-telemetry-service.js";
import { badRequest } from "../../shared/errors.js";

export type MqttConnectionState = "connected" | "reconnecting" | "disconnected";
export type RobotCommandType = "PAUSE" | "RESUME" | "EMERGENCY_STOP" | "SET_SPEED";

export interface NetworkEventPayload {
  id: string;
  type: string;
  source: string;
  topic: string | null;
  robotId: string | null;
  taskId: string | null;
  payload: unknown;
  createdAt: string;
}

export class MqttBridgeService {
  private readonly networkListeners = new Set<(event: NetworkEventPayload) => void>();
  private readonly statusListeners = new Set<(state: MqttConnectionState) => void>();
  private connectionState: MqttConnectionState = "disconnected";

  public constructor(
    private readonly mqttClient: MqttClient,
    private readonly eventLogService: EventLogService,
    private readonly robotService: RobotService,
    private readonly robotTelemetryService: RobotTelemetryService
  ) {
    this.bindClient();
  }

  public getConnectionState(): MqttConnectionState {
    return this.connectionState;
  }

  public subscribeToNetworkEvents(listener: (event: NetworkEventPayload) => void): () => void {
    this.networkListeners.add(listener);
    return () => this.networkListeners.delete(listener);
  }

  public subscribeToStatus(listener: (state: MqttConnectionState) => void): () => void {
    this.statusListeners.add(listener);
    listener(this.connectionState);
    return () => this.statusListeners.delete(listener);
  }

  public publishRobotTelemetry(robotId: string): void {
    const robot = this.robotService.getById(robotId);
    this.mqttClient.publish(
      MQTT_TOPICS.robotTelemetry(robotId),
      JSON.stringify({
        robotId,
        x: robot.position.x,
        y: robot.position.y,
        status: robot.status,
        speedCellsPerSec: robot.speedCellsPerSec,
        taskId: robot.taskId,
        emittedAt: new Date().toISOString(),
        source: "simulador-mqtt-interno"
      })
    );
  }

  public publishTaskEvent(taskId: string, payload: Record<string, unknown>): void {
    this.mqttClient.publish(
      MQTT_TOPICS.tasksEvents,
      JSON.stringify({
        taskId,
        ...payload,
        emittedAt: new Date().toISOString()
      })
    );
  }

  public async publishCommand(
    robotId: string,
    command: RobotCommandType,
    payload: Record<string, unknown> = {}
  ): Promise<void> {
    if (this.connectionState !== "connected") {
      throw badRequest("No se puede enviar el comando porque la conexión MQTT está desconectada.");
    }

    this.robotService.canReceiveCommand(robotId);
    const topic = MQTT_TOPICS.robotCommands(robotId);
    await this.eventLogService.record({
      type: "ACTUATOR_COMMAND",
      source: "mqtt-bridge",
      topic,
      robotId,
      payload: {
        command,
        ...payload,
        sentAt: new Date().toISOString()
      }
    });

    this.mqttClient.publish(
      topic,
      JSON.stringify({
        robotId,
        command,
        ...payload,
        sentAt: new Date().toISOString()
      })
    );

    if (env.MQTT_INTERNAL_SIMULATOR_ENABLED) {
      this.simulateRobotResponse(robotId, command, payload);
    }
  }

  private bindClient(): void {
    this.mqttClient.on("connect", () => {
      this.handleConnected();
    });

    this.mqttClient.on("reconnect", () => {
      this.setConnectionState("reconnecting");
    });

    this.mqttClient.on("close", () => {
      this.setConnectionState("disconnected");
    });

    this.mqttClient.on("offline", () => {
      this.setConnectionState("disconnected");
    });

    this.mqttClient.on("message", (topic, payloadBuffer) => {
      void this.handleMessage(topic, payloadBuffer.toString("utf8"));
    });

    if (this.mqttClient.connected) {
      this.handleConnected();
    }
  }

  private async handleMessage(topic: string, rawPayload: string): Promise<void> {
    let payload: Record<string, unknown> | string = rawPayload;

    try {
      payload = JSON.parse(rawPayload) as Record<string, unknown>;
    } catch {
      payload = rawPayload;
    }

    const robotMatch = topic.match(/^gridbot\/robots\/([^/]+)\/(telemetry|status)$/);
    const robotId = robotMatch?.[1] ?? null;
    const kind = robotMatch?.[2] ?? null;

    const event = await this.eventLogService.record({
      type: "MQTT_MESSAGE_RECEIVED",
      source: "mqtt-bridge",
      topic,
      robotId,
      payload: payload as never
    });

    if (robotId && kind === "status" && payload && typeof payload === "object") {
      const statusInput: Parameters<RobotService["applyExternalStatus"]>[1] = {};
      const status = this.resolveRobotStatus(payload.status);
      const speedCellsPerSec = this.readNumeric(payload.speedCellsPerSec);

      if (status) {
        statusInput.status = status;
      }
      if (speedCellsPerSec !== null) {
        statusInput.speedCellsPerSec = speedCellsPerSec;
      }

      await this.robotService.applyExternalStatus(robotId, statusInput);
    }

    if (robotId && kind === "telemetry" && payload && typeof payload === "object") {
      const telemetryInput: Parameters<RobotService["applyExternalTelemetry"]>[1] = {};
      const x = this.readNumeric(payload.x);
      const y = this.readNumeric(payload.y);
      const status = this.resolveRobotStatus(payload.status);
      const speedCellsPerSec = this.readNumeric(payload.speedCellsPerSec);

      if (x !== null) {
        telemetryInput.x = x;
      }
      if (y !== null) {
        telemetryInput.y = y;
      }
      if (status) {
        telemetryInput.status = status;
      }
      if (speedCellsPerSec !== null) {
        telemetryInput.speedCellsPerSec = speedCellsPerSec;
      }

      const robot = await this.robotService.applyExternalTelemetry(robotId, telemetryInput);
      await this.robotTelemetryService.record({
        robotId,
        x: robot.position.x,
        y: robot.position.y,
        status: robot.status,
        speedCellsPerSec: robot.speedCellsPerSec,
        taskId: robot.taskId,
        source: typeof payload.source === "string" ? payload.source : "mqtt-bridge",
        recordedAt:
          typeof payload.emittedAt === "string"
            ? new Date(payload.emittedAt)
            : typeof payload.respondedAt === "string"
              ? new Date(payload.respondedAt)
              : new Date()
      });
    }

    this.emitNetworkEvent({
      id: event.id,
      type: event.type,
      source: event.source,
      topic: event.topic,
      robotId: event.robotId,
      taskId: event.taskId,
      payload: event.payload,
      createdAt: event.createdAt.toISOString()
    });
  }

  private simulateRobotResponse(
    robotId: string,
    command: RobotCommandType,
    payload: Record<string, unknown>
  ): void {
    const robot = this.robotService.getById(robotId);
    const nextStatus =
      command === "PAUSE"
        ? "WAITING"
        : command === "RESUME"
          ? robot.targetPosition || this.robotService.hasPausedRoute(robotId) ? "MOVING" : "IDLE"
          : command === "EMERGENCY_STOP"
            ? "BLOCKED"
            : robot.status;
    const nextSpeed =
      command === "SET_SPEED" && typeof payload.speedCellsPerSec === "number"
        ? payload.speedCellsPerSec
        : robot.speedCellsPerSec;

    setTimeout(() => {
      this.mqttClient.publish(
        MQTT_TOPICS.robotStatus(robotId),
        JSON.stringify({
          robotId,
          status: nextStatus,
          speedCellsPerSec: nextSpeed,
          source: "simulador-mqtt-interno",
          respondedAt: new Date().toISOString()
        })
      );
    }, 100);

    setTimeout(() => {
      this.mqttClient.publish(
        MQTT_TOPICS.robotTelemetry(robotId),
        JSON.stringify({
          robotId,
          x: robot.position.x,
          y: robot.position.y,
          status: nextStatus,
          speedCellsPerSec: nextSpeed,
          taskId: robot.taskId,
          source: "simulador-mqtt-interno",
          emittedAt: new Date().toISOString()
        })
      );
    }, 180);
  }

  private emitNetworkEvent(event: NetworkEventPayload): void {
    this.networkListeners.forEach((listener) => listener(event));
  }

  private handleConnected(): void {
    this.setConnectionState("connected");
    this.mqttClient.subscribe([
      MQTT_TOPICS.robotTelemetryWildcard,
      MQTT_TOPICS.robotStatusWildcard,
      MQTT_TOPICS.tasksEvents,
      MQTT_TOPICS.obstacles
    ]);
  }

  private setConnectionState(state: MqttConnectionState): void {
    this.connectionState = state;
    this.statusListeners.forEach((listener) => listener(state));
  }

  private readNumeric(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  }

  private resolveRobotStatus(value: unknown): "IDLE" | "MOVING" | "WAITING" | "BLOCKED" | "OFFLINE" | undefined {
    return value === "IDLE" ||
      value === "MOVING" ||
      value === "WAITING" ||
      value === "BLOCKED" ||
      value === "OFFLINE"
      ? value
      : undefined;
  }
}
