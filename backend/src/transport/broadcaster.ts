import type { WebSocket } from "ws";
import { Match } from "../types/match.js";
import { removeUserOnline } from "../user/online.js";
import { usersOnline } from "../config/structures.js";
import { Message } from "../types/chat.js"; // Codex change: broadcast using stored message shape
import { Payload, PayloadDataTypes, PayloadTypes } from "../types/payload.js";

// Create and stringify the Payload for the WebSocket
export function buildPayload(type: PayloadTypes, data: PayloadDataTypes): string {
	const payload = { type, data } as Payload;
	return JSON.stringify(payload);
}

export function chatBroadcast(event: Message, sender: WebSocket | null = null) {
	const payload = JSON.stringify(event);

	usersOnline.forEach((user) => {
		const ws = user.socket;

		if (ws.readyState === ws.OPEN) {
			try {
				ws.send(payload);
			} catch (error) {
				console.error("Broadcast error:", error);
				removeUserOnline(user.username);
			}
		}
	});
}

// Send the payload to all the clients in the match
export function broadcast(payload: string, match: Match): void {
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