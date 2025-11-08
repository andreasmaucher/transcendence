import type { SingleGame, Match, Tournament } from "../types/game.js";
import { createInitialMatchState } from "./state.js";
import { addPlayerMatchDB, createMatchDB, startMatchDB } from "../database/matches/setters.js";
import { getSingleGame } from "./singleGameManager.js";

export function createMatch({
	id,
	mode,
	round,
	userId,
	singleGame,
	tournament,
}: {
	id: string;
	mode: string;
	round: number;
	userId?: string;
	singleGame?: SingleGame;
	tournament?: Tournament;
}): Match {
	let match = {
		id,
		tournamentId: tournament?.id,
		singleGameId: singleGame?.id,
		isRunning: false,
		state: createInitialMatchState(round),
		inputs: { left: 0, right: 0 },
		players: { left: undefined, right: undefined },
		clients: new Set(),
	} as Match;

	try {
		// Add new match to database (without starting it)
		createMatchDB(match.id, round, tournament?.id);
		// Start it only if it's a local session
		if (mode == "local" && userId) {
			addPlayerMatchDB(match.id, userId, "left");
			startMatchDB(id);
			match.isRunning = true;
		}
	} catch (error: any) {
		console.error(error.message);
	}
	return match;
}

export function startMatch(match: Match) {
	try {
		if (match.singleGameId) {
			// If it's single game, handle the timeout cleanup here
			let singleGame = getSingleGame(match.singleGameId);
			if (singleGame && singleGame.expirationTimer) {
				clearTimeout(singleGame.expirationTimer);
				delete singleGame.expirationTimer;
				console.log(`[WS] Match ${match.id} now full — timer cleared`);
				startMatchDB(match.id);
			}
		} else if (match.tournamentId) startMatchDB(match.id, match.tournamentId);
		else return; // Temporary error handling
		match.isRunning = true;
	} catch (error: any) {
		console.error(error.message);
	}
}

export function addPlayerToMatch(match: Match, playerId: string) {
	try {
		if (!match.players.left) addPlayerMatchDB(match.id, playerId, "left");
		else if (!match.players.right) addPlayerMatchDB(match.id, playerId, "right");
		else return; // Temporary error handling
		if (match.singleGameId && checkMatchFull(match)) startMatch(match);
	} catch (error: any) {
		console.error(error.message);
	}
}

export function checkMatchFull(match: Match) {
	return match.players.left && match.players.right;
}
