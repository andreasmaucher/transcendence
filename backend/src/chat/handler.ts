import { Message } from "../types/chat.js";

export function populateMessage(payload: any) {
	const message: Message = {
		id: payload.id,
		sender: payload.sender,
		receiver: payload.receiver,
		type: payload.type,
		content: payload.content,
		gameId: payload.gameId,
		sentAt: payload.sentAt,
	};
	return message;
}

function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

function isMessage(value: unknown): value is Message {
	if (!value || typeof value !== "object") return false;
	const v = value as Record<string, unknown>;
	const fields =
		typeof v.type === "string" &&
		["direct", "broadcast", "invite", "tournament", "profile-link", "block", "unblock"].includes(v.type) &&
		typeof v.id === "string" &&
		typeof v.sender === "string" &&
		typeof v.sentAt === "number" &&
		(v.receiver === undefined || typeof v.receiver === "string") &&
		(v.content === undefined || typeof v.content === "string") &&
		(v.gameId === undefined || typeof v.gameId === "string");

	return fields;
}
