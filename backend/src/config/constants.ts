export const SOCKET_ROOMS = {
  operators: "operators",
  observers: "observers"
} as const;

export const MQTT_TOPICS = {
  obstacles: "gridrobot/world/obstacles",
  state: "gridrobot/world/state",
  robots: "gridbot/robots",
  tasksEvents: "gridbot/tasks/events",
  robotTelemetry: (robotId: string) => `gridbot/robots/${robotId}/telemetry`,
  robotCommands: (robotId: string) => `gridbot/robots/${robotId}/commands`,
  robotStatus: (robotId: string) => `gridbot/robots/${robotId}/status`,
  robotCommandsWildcard: "gridbot/robots/+/commands",
  robotTelemetryWildcard: "gridbot/robots/+/telemetry",
  robotStatusWildcard: "gridbot/robots/+/status"
} as const;
