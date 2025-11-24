import { Message } from "../types/chat.js";
import { getAllOnlineUsers } from "../user/online.js";
import { buildChatHistory } from "./history.js";

export function populateMessage(
	payload: Partial<Message>) : Message {
	const sentAt = new Date().toISOString();
	const message: Message = {
		id: payload.id ?? crypto.randomUUID(),
		sender: payload.sender ?? "system",
		receiver: payload.receiver ?? null,
		type: payload.type ?? "broadcast",
		content: payload.content ?? "",
		gameId: payload.gameId ?? undefined,
		sentAt: sentAt,
		onlineUser: payload.type === "onlineUser" ? getOnlineUserList() : undefined,
		chatHistory: payload.type === "init" && payload.sender ? buildChatHistory(payload.sender) : undefined
	};
	return message;
}

export function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

export function getOnlineUserList(sender: WebSocket | null = null): string[] {
	const onlineUsers = getAllOnlineUsers();
	let onlineUserList: string[] = [];

	onlineUsers.forEach((user) => {
		//if (!sender || sender.username !== user.username)
		onlineUserList.push(user.username);
	});
	console.log("Online users:", onlineUserList);

	return onlineUserList;
}

/*function isMessage(value: unknown): value is Message {
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
}*/