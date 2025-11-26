import { RawData } from "ws";
import { Match, PaddleSide } from "../types/match.js";
import { resetMatchState } from "../game/state.js";
import { addMessageDB } from "../database/messages/setters.js";
import { blockUserDB, unblockUserDB } from "../database/users/setters.js";
import { userBroadcast } from "./broadcaster.js";
import { createUTCTimestamp } from "../utils/time.js";
import { convertToMessage } from "../chat/utils.js";
import { ChatMessage } from "../types/chat.js";

// Handles the "message" type of socket messages for the user sockets
export function handleChatMessages(raw: RawData) {
	let rawMsg;
	try {
		rawMsg = JSON.parse(raw.toString());
	} catch {
		console.log("[WS] Unable to parse Json");
		return;
	}
	const msg: ChatMessage = convertToMessage(rawMsg);
	msg.id = crypto.randomUUID();
	msg.sentAt = createUTCTimestamp();
	try {
		addMessageDB(msg);
		if (msg.type === "block" && msg.receiver) blockUserDB(msg.sender, msg.receiver);
		else if (msg.type === "unblock" && msg.receiver) unblockUserDB(msg.sender, msg.receiver);
		userBroadcast("chat", msg);
	} catch (error: any) {
		console.log("[WS] ", error.message);
	}
}

// Handles the "message" type of socket messages for the game sockets
export function handleGameMessages(raw: RawData, match: Match) {
	let msg;
	try {
		msg = JSON.parse(raw.toString());
	} catch {
		console.log("[WS] Unable to parse Json");
		return;
	}
	if (msg.type === "input") {
		const dir = msg.direction === "up" ? -1 : msg.direction === "down" ? 1 : 0;
		match.inputs[msg.paddle as PaddleSide] = dir;
	} else if (msg.type === "reset") {
		resetMatchState(match);
	}
}
