const rawApiBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.trim() || import.meta.env.VITE_API_URL?.trim() || "";
const rawSocketUrl = import.meta.env.VITE_SOCKET_URL?.trim() || "";

export const API_URL = rawApiBaseUrl || "/api";
export const SOCKET_URL = rawSocketUrl || undefined;
export const SOCKET_PATH = "/socket.io";
export const GAME_ONLY_REDIRECT =
  import.meta.env.VITE_GAME_ONLY_REDIRECT?.trim() !== "false";
