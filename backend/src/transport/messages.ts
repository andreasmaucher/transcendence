import { RawData } from "ws";
import { Match, PaddleSide } from "../types/match.js";
import { resetMatchState } from "../game/state.js";

// Handles the "message" type of socket messages
export function handleSocketMessages(raw: RawData, match: Match) {
	let msg;
	try {
		msg = JSON.parse(raw.toString());
	} catch {
		return;
	}

	if (msg.type === "input") {
		const dir = msg.direction === "up" ? -1 : msg.direction === "down" ? 1 : 0;
		match.inputs[msg.paddle as PaddleSide] = dir;
	} else if (msg.type === "reset") {
		resetMatchState(match);
	}
}
