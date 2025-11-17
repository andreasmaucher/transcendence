import type { SingleGame } from "../types/game.js";
import { createMatch } from "./matchManager.js";
import crypto from "crypto";
import { singleGames } from "../config/structures.js";
import { checkMatchFull } from "./matchManager.js";
import { removeMatchDB } from "../database/matches/setters.js";
import { Match } from "../types/match.js";

export function resetSingleGamesForTest(): void {
	singleGames.clear();
}

export function forEachSingleGame(fn: (singleGame: SingleGame) => void): void {
	for (const singleGame of singleGames.values()) fn(singleGame);
}

// Get or Create a single game, called only when creating a socket connection
export function getOrCreateSingleGame(id: string, userId: string, mode: string): SingleGame {
	let singleGame = singleGames.get(id);
	if (!singleGame) {
		let singleGameId = crypto.randomUUID();
		singleGame = {
			id: singleGameId,
			mode: mode,
		} as SingleGame;

		try {
			let matchId = crypto.randomUUID();
			singleGame.match = createMatch({
				id: matchId,
				mode: mode,
				singleGame: singleGame,
			});
			if (mode == "remote") {
				console.log(`[SGM] Starting 5-minute timeout for match ${singleGame.match.id}`);
				// Set timer to wait for players
				singleGame.expirationTimer = setTimeout(
					(singleGame: SingleGame) => {
						if (!checkMatchFull(singleGame.match)) {
							console.log(`[WS] Match ${singleGame.match.id} expired — no opponent joined`);
							for (const s of singleGame.match.clients) s.close(1000, "Match expired: no opponent joined");
							removeMatchDB(singleGame.match.id);
							singleGame.match.clients.clear();
							singleGames.delete(singleGame.id);
						}
					},
					5 * 60 * 1000,
					singleGame
				); // 5 minutes
			}
		} catch (error: any) {
			console.error("[SGM]" + error.message);
		}
		singleGames.set(singleGame.id, singleGame);
	}

	return singleGame;
}

// Get a specific single game from the singleGames Map structure
export function getSingleGame(singleGameId: string): SingleGame | undefined {
	let singleGame = singleGames.get(singleGameId);
	if (!singleGame) console.log("[SGM] SingleGame not found");
	return singleGame;
}

// Get a specific match from the singleGames Map structure
export function getMatchInSingleGame(matchId: string): Match | undefined {
	let found: Match | undefined = undefined;

	forEachSingleGame((singleGame) => {
		if (singleGame.match.id === matchId) {
			found = singleGame.match;
		}
	});

	if (!found) throw new Error(`[SGM] Match ${matchId} not found`);
	return found;
}

// Get all open (waiting for players) single games
export function getOpenSingleGames(): SingleGame[] {
	const openSingleGames: SingleGame[] = [];
	for (const singleGame of singleGames.values()) {
		const { players } = singleGame.match;
		if (!players.right || !players.left) openSingleGames.push(singleGame);
	}
	return openSingleGames;
}

export function forfeitSingleGame(id: string) {
	singleGames.delete(id);
}
