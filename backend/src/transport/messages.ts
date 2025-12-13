import { RawData } from "ws";
import { Match, PaddleSide } from "../types/match.js";
import { resetMatchState } from "../game/state.js";
import { addMessageDB } from "../database/messages/setters.js";
import { blockUserDB, unblockUserDB } from "../database/users/setters.js";
import { userBroadcast } from "./broadcaster.js";
import { createUTCTimestamp } from "../utils/time.js";
import { convertToMessage } from "../chat/utils.js";
import { ChatMessage } from "../types/chat.js";
import { tournaments } from "../config/structures.js";
import { markTournamentUiReady } from "../managers/tournamentManager.js";

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
export function handleGameMessages(raw: RawData, match: Match, socket?: any) {
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
		// ANDY: For tournament matches, we should not reset the match state when a "reset" message is received, because we need to preserve the winner for round progression!
		if (!match.tournament) {
			resetMatchState(match);
		}
	} else if (msg.type === "tournament-ui-ready") {
		if (!match.tournament) return;
		const username = socket?.username;
		if (!username) return;
		const tournament = tournaments.get(match.tournament.id);
		if (!tournament) return;
		markTournamentUiReady(tournament, username);
	}
}
