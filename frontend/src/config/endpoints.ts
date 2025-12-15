export const WS_PROTOCOL = window.location.protocol === "https:" ? "wss" : "ws";

export const WS_HOST = new URLSearchParams(window.location.search).get("wsHost") ?? window.location.hostname;

const defaultPort =
	window.location.port !== "" ? Number(window.location.port) : window.location.protocol === "https:" ? 443 : 80;

export const WS_PORT = Number(new URLSearchParams(window.location.search).get("wsPort") ?? defaultPort);

export const API_BASE = `${window.location.protocol}//${WS_HOST}${WS_PORT ? `:${WS_PORT}` : ""}`;

function getHashQueryParam(key: string): string | null {
	const hash = window.location.hash || "";
	const query = hash.includes("?") ? hash.split("?").slice(1).join("?") : "";
	return new URLSearchParams(query).get(key);
}

// Used as a fallback by parts of the app that don't thread the id through explicitly.
// Most game views pass `id` via `#/game?...`.
export const ROOM_ID = getHashQueryParam("id") ?? new URLSearchParams(window.location.search).get("id") ?? "local";
