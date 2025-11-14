import type { WebSocket } from "ws";
import { Match } from "../types/match.js";

// Create state payload for socket
export function buildStatePayload(match: Match) {
	const { state } = match;
	return {
		type: "state" as const,
		...state,
	};
}

export function broadcast(match: Match): void {
	const { state } = match;
	// Skip broadcasting only when the match hasn't started yet; still send the final game-over snapshot.
	if (!state.isRunning && !state.isOver) return;
	if (!match.clients.size) return;
	const payload = JSON.stringify(buildStatePayload(match));
	//console.log("[DEBUG BACKEND → CLIENT]", payload);
	for (const socket of Array.from(match.clients)) {
		const ws = socket as WebSocket;
		if (ws.readyState !== ws.OPEN) {
			match.clients.delete(socket);
			continue;
		}
		try {
			ws.send(payload);
		} catch {
			match.clients.delete(socket);
			try {
				ws.close();
			} catch {}
		}
	}
}
