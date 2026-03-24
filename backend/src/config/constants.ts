export const SOCKET_ROOMS = {
  operators: "operators",
  observers: "observers"
} as const;

export const MQTT_TOPICS = {
  obstacles: "gridrobot/world/obstacles",
  state: "gridrobot/world/state",
  robots: "gridrobot/robots"
} as const;
