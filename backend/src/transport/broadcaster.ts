import type { WebSocket } from "ws";
import { Match } from "../types/match.js";
import { Payload, PayloadDataTypes, PayloadTypes } from "../types/payload.js";
import { ChatMessage } from "../types/chat.js";
import { usersOnline } from "../config/structures.js";
import { removeUserWS } from "../user/online.js";
import { User } from "../types/user.js";

// Create and stringify the Payload for the WebSocket
export function buildPayload(type: PayloadTypes, data: PayloadDataTypes): string {
	const payload = { type, data } as Payload;
	return JSON.stringify(payload);
}

// Send the payload to all the clients in the match
export function gameBroadcast(payload: string, match: Match): void {
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

export function shouldSendMessage(message: ChatMessage, user: User): boolean {
	if (message.sender === user.username) return true;
	else if (message.receiver === user.username) return true;
	else if (message.type === "broadcast") return true;
	else if (message.type === "tournament" && user.gameId && user.gameId === message.gameId) return true;
	else return false;
}

export function userBroadcast(type: PayloadTypes, data: PayloadDataTypes): void {
	usersOnline.forEach((user) => {
		// Check 'shouldSendMessage' ONCE per user, not per socket
		if (type === "chat") {
			const message = data as ChatMessage;
			if (!shouldSendMessage(message, user)) {
				return; // Skip this user entirely
			}
		}

		// Iterate over all active connections for this user
		for (const [socket] of user.connections) {
			if (socket.readyState === socket.OPEN) {
				try {
					socket.send(buildPayload(type, data));
				} catch {
					// If sending fails, remove ONLY this specific socket.
					try {
						socket.terminate();
						removeUserWS(user.username, socket);
					} catch {}
				}
			}
		}
	});
}
