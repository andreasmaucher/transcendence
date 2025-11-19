import type { WebSocket } from "ws";
import { Match } from "../types/match.js";
import { removeUserOnline } from "../user/online.js";
import { usersOnline } from "../config/structures.js";
import {
	ChatEvent,
	InviteChatMessage,
	DirectChatMessage,
	ProfileLinkMessage,
	BroadcastChatMessage,
} from "../chat/types.js";
import { User } from "../types/user.js";

// Create state payload for socket
export function buildStatePayload(match: Match) {
	const { state } = match;
	return {
		type: "state" as const,
		...state,
	};
}

export function chatBroadcast(event: ChatEvent, sender: WebSocket | null = null) {
	const payload = JSON.stringify(event);

	usersOnline.forEach((user) => {
		const ws = user.socket;

		if (!shouldDeliverEvent(event, user, sender)) return;

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

function shouldDeliverEvent(event: ChatEvent, user: User, sender: WebSocket | null): boolean {
	if (sender && user.socket === sender) return false;

	if (eventHasSender(event) && user.blockedUsers?.has(event.from)) return false;

	switch (event.type) {
		case "direct":
		case "invite":
		case "profile-link":
			return user.username === event.to;
		case "tournament":
			return event.opponents.includes(user.username);
		case "broadcast":
		default:
			return true;
	}
}

function eventHasSender(
	event: ChatEvent
): event is DirectChatMessage | BroadcastChatMessage | InviteChatMessage | ProfileLinkMessage {
	return event.type !== "tournament";
}
