import { io } from "socket.io-client";

import { SOCKET_PATH, SOCKET_URL } from "../config";

export const socket = io(SOCKET_URL, {
  autoConnect: false,
  path: SOCKET_PATH,
  transports: ["websocket", "polling"],
  upgrade: true
});
