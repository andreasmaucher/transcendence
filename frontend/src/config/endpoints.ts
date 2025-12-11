// web socket protocol selection (wss if https, ws if http)
export const WS_PROTOCOL = window.location.protocol === "https:" ? "wss" : "ws";

// web socket host selection (default to localhost if not specified)
export const WS_HOST = new URLSearchParams(window.location.search).get("wsHost") ?? window.location.hostname;

export const WS_PORT = Number(new URLSearchParams(window.location.search).get("wsPort") ?? 4000);

// REST API base is built from the same host/port as WebSocket to avoid mismatches
export const API_BASE = `${window.location.protocol === "https:" ? "https" : "http"}://${WS_HOST}:${WS_PORT}`;

// room ID selection (default to "default" if not specified)
export const ROOM_ID = new URLSearchParams(window.location.search).get("roomId") ?? "default";
