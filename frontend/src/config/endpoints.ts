// web socket protocol selection (wss if https, ws if http)
export const WS_PROTOCOL = window.location.protocol === "https:" ? "wss" : "ws";

// web socket host selection (default to localhost if not specified)
export const WS_HOST = new URLSearchParams(window.location.search).get("wsHost") ?? window.location.hostname;

export const WS_PORT = Number(new URLSearchParams(window.location.search).get("wsPort") ?? 4000);

// REST API base is built from the same host/port as WebSocket to avoid mismatches
// export const API_BASE = `${window.location.protocol === "https:" ? "https" : "http"}://${WS_HOST}:${WS_PORT}`;
// console.log("import.meta.env:", import.meta.env);

// console.log("VITE_API_BASE:", import.meta.env.VITE_API_BASE);
// console.log("VITE_API_BASE1:", import.meta.env.VITE_API_BASE1);
// console.log("VITE_TEST:", import.meta.env.VITE_TEST);

// export const API_BASE: string = (import.meta as any).env?.VITE_API_BASE || "";

export const API_BASE = import.meta.env.VITE_API_BASE || "https://localhost:4000"; // <--- Check this fallback!
console.log("API_BASE:", import.meta.env.API_BASE);

// room ID selection (default to "default" if not specified)
export const ROOM_ID = new URLSearchParams(window.location.search).get("roomId") ?? "default";
