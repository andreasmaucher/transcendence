// web socket protocol selection (wss if https, ws if http)
export const WS_PROTOCOL = window.location.protocol === "https:" ? "wss" : "ws";

// web socket host selection (default to localhost if not specified)
const WS_HOSTNAME = window.location.hostname;

const WS_PORT = window.location.port || (window.location.protocol === "https:" ? "5173" : "5173");

export const WS_BASE = `${WS_PROTOCOL}://${WS_HOSTNAME}:${WS_PORT}/api`;

// REST API base is built from the same host/port as WebSocket to avoid mismatches
// export const API_BASE = `${window.location.protocol === "https:" ? "https" : "http"}://${WS_HOST}:${WS_PORT}`;
// console.log("import.meta.env:", import.meta.env);

// console.log("VITE_API_BASE:", import.meta.env.VITE_API_BASE);
// console.log("VITE_API_BASE1:", import.meta.env.VITE_API_BASE1);
// console.log("VITE_TEST:", import.meta.env.VITE_TEST);

// export const API_BASE: string = (import.meta as any).env?.VITE_API_BASE || "";

// export const API_BASE = import.meta.env.VITE_API_BASE;
// console.log("API_BASE:", import.meta.env.API_BASE);
console.log("[WS CONFIG]", {
	href: window.location.href,
	hostname: WS_HOSTNAME,
	port: WS_PORT,
	WS_BASE,
});

// room ID selection (default to "default" if not specified)
export const ROOM_ID = new URLSearchParams(window.location.search).get("roomId") ?? "default";
