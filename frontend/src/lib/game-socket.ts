import { io } from "socket.io-client";

import { SOCKET_PATH, SOCKET_URL } from "../config";

export const gameSocket = io(SOCKET_URL ? `${SOCKET_URL}/game` : "/game", {
  autoConnect: false,
  path: SOCKET_PATH,
  transports: ["websocket", "polling"],
  upgrade: true
});
