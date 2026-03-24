const browserHost =
  typeof window !== "undefined" ? window.location.hostname : "localhost";

const backendProtocol = import.meta.env.VITE_BACKEND_PROTOCOL ?? "http";
const backendPort = import.meta.env.VITE_BACKEND_PORT ?? "4000";

export const API_URL =
  import.meta.env.VITE_API_URL ?? `${backendProtocol}://${browserHost}:${backendPort}/api`;
export const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ?? `${backendProtocol}://${browserHost}:${backendPort}`;
