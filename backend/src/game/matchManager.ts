import type { Match } from "../types/game.js";
import { createInitialMatchState } from "./state.js";
import {
	createMatchDB,
	setPlayerLeftMatchDB,
	setPlayerRightMatchDB,
	startMatchDB,
} from "../database/matches/setters.js";
import { getMatchInSingleGame } from "../game/singleGameManager.js";

export function createMatch(id: string, userId: string, type: string, tournament_id?: string): Match {
	let match = {
		id,
		tournament_id: tournament_id,
		isRunning: false,
		state: createInitialMatchState(),
		inputs: { left: 0, right: 0 },
		players: { left: undefined, right: undefined },
		clients: new Set(),
	} as Match;
	// Log new match in SQLite
	try {
		createMatchDB(match.id, tournament_id);
		if (type == "local") {
			setPlayerLeftMatchDB(match.id, userId);
			startMatchDB(id);
			match.isRunning = true;
		}
	} catch (err) {
		console.error(`[db] Failed to insert match ${id} for tournament ${tournament_id}:`, err);
	}
	return match;
}

export function startMatch(id: string, tournamentId?: string, playerLeftId?: string, playerRightId?: string) {
	try {
		if (playerLeftId) setPlayerLeftMatchDB(id, playerLeftId);
		else if (playerRightId) setPlayerRightMatchDB(id, playerRightId);
		startMatchDB(id, tournamentId);
		let match = getMatchInSingleGame(id);
		if (match) match.isRunning = true;
	} catch (error: any) {
		console.log(error.message);
	}
}
