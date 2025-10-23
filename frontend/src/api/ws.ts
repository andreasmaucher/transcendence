import { WS_PROTOCOL, WS_HOST, WS_PORT, ROOM_ID } from "../config/endpoints";

export function connectToBackend(path: string, onOpen: (ws: WebSocket) => void, onMessage: (event: MessageEvent) => void, onClose: () => void): WebSocket {
  const wsUrl = `${WS_PROTOCOL}://${WS_HOST}:${WS_PORT}${path}`;
  const ws = new WebSocket(wsUrl);
  ws.addEventListener("open", () => onOpen(ws));
  ws.addEventListener("message", (e) => onMessage(e));
  ws.addEventListener("close", onClose);
  ws.addEventListener("error", () => ws.close());
  return ws;
}

export function roomWebsocketPath(): string {
  return `/api/rooms/${ROOM_ID}/ws`;
}

