import { RawData } from "ws";
import { Match, PaddleSide } from "../types/match.js";
import { resetMatchState } from "../game/state.js";
import { addMessageDB } from "../database/messages/setters.js";
import { blockUserDB, unblockUserDB } from "../database/users/setters.js";
import { userBroadcast } from "./broadcaster.js";
import { createUTCTimestamp } from "../utils/time.js";
import { convertToMessage } from "../chat/utils.js";
import { ChatMessage } from "../types/chat.js";
import { isValidInput } from "../utils/sanitize.js";

// ANDY: added this to track when matches ended to delay reset requests (so final score is visible)
export const matchEndTimes = new Map<string, number>(); // matchId -> timestamp when game ended
const RESET_DELAY_MS = 3000; // 3 seconds - time to show final score before allowing reset

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
	if ((msg.type === "direct" || msg.type === "broadcast") && !isValidInput(msg.content)) {
		console.log("[WS] Chat message didn't pass validation");
		return;
	}
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
		// ANDY: For tournament matches, we should not reset the match state when a "reset" message is received, because we need to preserve the winner for round progression!
		if (!match.tournament) {
			// Delay reset if game just ended - allow final score to be visible for a few seconds
			const endTime = matchEndTimes.get(match.id);
			const now = Date.now();

			if (endTime && now - endTime < RESET_DELAY_MS) {
				// Game ended recently, delay the reset
				const remainingDelay = RESET_DELAY_MS - (now - endTime);
				setTimeout(() => {
					// Only reset if game is still over (user hasn't started a new game)
					if (match.state.isOver) {
						resetMatchState(match);
						matchEndTimes.delete(match.id);
					}
				}, remainingDelay);
			} else {
				// Enough time has passed or game didn't just end, reset immediately
				resetMatchState(match);
				matchEndTimes.delete(match.id);
			}
		}
	}
}
