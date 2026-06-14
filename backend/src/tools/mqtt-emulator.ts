import dotenv from "dotenv";
import mqtt from "mqtt";

import { MQTT_TOPICS } from "../config/constants.js";

dotenv.config();

type EmulatorCommand = "PAUSE" | "RESUME" | "EMERGENCY_STOP" | "SET_SPEED";
type EmulatorStatus = "IDLE" | "MOVING" | "WAITING" | "BLOCKED";

interface RobotEmulatorState {
  status: EmulatorStatus;
  speedCellsPerSec: number;
  x: number;
  y: number;
}

const MQTT_URL = process.env.MQTT_URL?.trim() || "mqtt://localhost:1883";
const SOURCE = "external-mqtt-emulator";

const robotStates = new Map<string, RobotEmulatorState>();

const getRobotState = (robotId: string): RobotEmulatorState => {
  const current = robotStates.get(robotId);
  if (current) {
    return current;
  }

  const initialState: RobotEmulatorState = {
    status: "IDLE",
    speedCellsPerSec: 1,
    x: 0,
    y: 0
  };
  robotStates.set(robotId, initialState);
  return initialState;
};

const client = mqtt.connect(MQTT_URL);

client.on("connect", () => {
  console.log(`[MQTT emulator] Conectado a ${MQTT_URL}`);
  client.subscribe(MQTT_TOPICS.robotCommandsWildcard, (error) => {
    if (error) {
      console.error("[MQTT emulator] No se pudo suscribir a comandos:", error.message);
      return;
    }

    console.log(`[MQTT emulator] Escuchando comandos en ${MQTT_TOPICS.robotCommandsWildcard}`);
  });
});

client.on("reconnect", () => {
  console.log("[MQTT emulator] Reconectando...");
});

client.on("close", () => {
  console.log("[MQTT emulator] Conexión cerrada.");
});

client.on("error", (error) => {
  console.error("[MQTT emulator] Error MQTT:", error.message);
});

client.on("message", (topic, buffer) => {
  const match = topic.match(/^gridbot\/robots\/([^/]+)\/commands$/);
  const robotId = match?.[1];
  if (!robotId) {
    return;
  }

  try {
    const payload = JSON.parse(buffer.toString("utf8")) as {
      command?: EmulatorCommand;
      speedCellsPerSec?: number;
      sentAt?: string;
    };

    if (!payload.command) {
      console.warn(`[MQTT emulator] Comando inválido para ${robotId}:`, payload);
      return;
    }

    const state = { ...getRobotState(robotId) };
    const commandTime = new Date().toISOString();

    switch (payload.command) {
      case "PAUSE":
        state.status = "WAITING";
        break;
      case "RESUME":
        state.status = state.status === "BLOCKED" ? "IDLE" : "MOVING";
        break;
      case "EMERGENCY_STOP":
        state.status = "BLOCKED";
        break;
      case "SET_SPEED":
        if (typeof payload.speedCellsPerSec === "number" && Number.isFinite(payload.speedCellsPerSec)) {
          state.speedCellsPerSec = payload.speedCellsPerSec;
        }
        state.status = state.status === "WAITING" ? "WAITING" : "MOVING";
        break;
      default:
        break;
    }

    if (state.status === "MOVING") {
      state.x += 1;
      state.y += 1;
    }

    robotStates.set(robotId, state);

    console.log(
      `[MQTT emulator] ${commandTime} robot=${robotId} command=${payload.command} payload=${JSON.stringify(payload)}`
    );

    client.publish(
      MQTT_TOPICS.robotStatus(robotId),
      JSON.stringify({
        robotId,
        status: state.status,
        speedCellsPerSec: state.speedCellsPerSec,
        source: SOURCE,
        respondedAt: commandTime
      })
    );

    client.publish(
      MQTT_TOPICS.robotTelemetry(robotId),
      JSON.stringify({
        robotId,
        x: state.x,
        y: state.y,
        status: state.status,
        speedCellsPerSec: state.speedCellsPerSec,
        source: SOURCE,
        emittedAt: commandTime
      })
    );
  } catch (error) {
    console.error("[MQTT emulator] No se pudo procesar el comando:", error);
  }
});
