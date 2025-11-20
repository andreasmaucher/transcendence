import type { WebSocket } from "ws";
import { Match } from "../types/match.js";
import { Payload, PayloadDataTypes, PayloadTypes } from "../types/payload.js";
import { Message } from "../types/chat.js";
import { usersOnline } from "../config/structures.js";
import { removeUserOnline } from "../user/online.js";
import { User } from "../types/user.js";

// Create and stringify the Payload for the WebSocket
export function buildPayload(type: PayloadTypes, data: PayloadDataTypes): string {
	const payload = { type, data } as Payload;
	return JSON.stringify(payload);
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

export function shouldSendMessage(message: Message, user: User): boolean {
	if (message.sender == user.username) return true;
	else if (message.receiver == user.username) return true;
	else if (message.type == "broadcast") return true;
	else if (message.type == "tournament" && user.gameId && user.gameId == message.gameId) return true;
	else return false;
}

export function chatBroadcast(message: Message): void {
	usersOnline.forEach((user) => {
		const ws = user.userWS;

		if (ws.readyState === ws.OPEN) {
			if (shouldSendMessage(message, user)) {
				try {
					ws.send(buildPayload("chat", message));
				} catch {
					try {
						removeUserOnline(user.username);
						ws.close();
					} catch {}
				}
			}
		}
	});
}
