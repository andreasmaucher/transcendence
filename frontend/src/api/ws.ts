// establishes a WebSocket connection to the backend & sets up event listeners

import { WS_PROTOCOL, WS_HOST, WS_PORT, ROOM_ID } from "../config/endpoints";

export function connectToBackend(path: string, onOpen: (ws: WebSocket) => void, onMessage: (event: MessageEvent) => void, onClose: () => void): WebSocket {
  const wsUrl = `${WS_PROTOCOL}://${WS_HOST}:${WS_PORT}${path}`;
  // create a new WebSocket connection to the backend
  const ws = new WebSocket(wsUrl);
  // when the WebSocket connection is opened
  ws.addEventListener("open", () => onOpen(ws));
  // when the WebSocket connection receives a message
  ws.addEventListener("message", (e) => onMessage(e));
  // when the WebSocket connection is closed
  ws.addEventListener("close", onClose);
  // when the WebSocket connection encounters an error
  ws.addEventListener("error", () => ws.close());
  return ws;
}

// constructs the WebSocket path for the given room ID
export function roomWebsocketPath(): string {
  return `/api/rooms/${ROOM_ID}/ws`;
}

