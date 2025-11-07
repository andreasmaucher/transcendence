import type { SingleGame, Match } from "../types/game.js";
import { createMatch } from "./matchManager.js";
import crypto from "crypto";
import { singleGames } from "../config/structures.js";

export function resetSingleGamesForTest(): void {
	singleGames.clear();
}

// Get or Create a single game, called only when creating a socket connection
export function getOrCreateSingleGame(id: string, userId: string, type: string): SingleGame {
	let singleGame = singleGames.get(id);
	if (!singleGame) {
		let singleGameId = crypto.randomUUID();
		singleGame = {
			id: singleGameId,
			type: type,
		} as SingleGame;
		// Log new match in SQLite
		try {
			let matchId = crypto.randomUUID();
			singleGame.match = createMatch(matchId, userId, type);
		} catch (err) {
			console.error(`[db] Failed to insert Match ${singleGame.id}:`, err);
		}
		singleGames.set(singleGame.id, singleGame);
	}

	return singleGame;
}

// Retrieve a specific single game
export function getSingleGame(singleGameId: string): SingleGame | undefined {
	let singleGame = singleGames.get(singleGameId);
	if (!singleGame) console.log("[SGM] SingleGame not found");
	return singleGame;
}

export function getMatchInSingleGame(matchId: string): Match | undefined {
	let found: Match | undefined = undefined;

	forEachSingleGame((singleGame) => {
		if (singleGame.match.id === matchId) {
			found = singleGame.match;
		}
	});

	if (!found) throw new Error(`[SGM] Match ${matchId} not found`); // If DB run fails, throws error
	return found;
}

export function forEachSingleGame(fn: (singleGame: SingleGame) => void): void {
	for (const singleGame of singleGames.values()) fn(singleGame);
}
