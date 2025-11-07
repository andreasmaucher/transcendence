import type { SingleGame, Match, Tournament } from "../types/game.js";
import { createInitialMatchState } from "./state.js";
import { addPlayerMatchDB, createMatchDB, startMatchDB } from "../database/matches/setters.js";
import { getSingleGame } from "./singleGameManager.js";
import { getTournament } from "./tournamentManager.js";

export function createMatch(
	id: string,
	userId: string,
	mode: string,
	singleGame?: SingleGame,
	tournament?: Tournament
): Match {
	let match = {
		id,
		tournamentId: tournament?.id,
		singleGameId: singleGame?.id,
		isRunning: false,
		state: createInitialMatchState(),
		inputs: { left: 0, right: 0 },
		players: { left: undefined, right: undefined },
		clients: new Set(),
	} as Match;
	// Log new match in SQLite
	try {
		createMatchDB(match.id, tournament?.id);
		if (mode == "local") {
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
			let singleGame = getSingleGame(match.singleGameId);
			if (singleGame && singleGame.expirationTimer) {
				clearTimeout(singleGame.expirationTimer);
				delete singleGame.expirationTimer;
				console.log(`[WS] Match ${match.id} now full — timer cleared`);
				startMatchDB(match.id);
			}
		} else if (match.tournamentId) {
			let tournament = getTournament(match.tournamentId);
			if (tournament && tournament.expirationTimer) {
				clearTimeout(tournament.expirationTimer);
				delete tournament.expirationTimer;
				console.log(`[WS] Match ${match.id} now full — timer cleared`);
				startMatchDB(match.id, tournament.id);
			}
		}
		match.isRunning = true;
	} catch (error: any) {
		console.error(error.message);
	}
}

export function addPlayerToMatch(match: Match, playerId: string, singleGameId?: string) {
	try {
		if (!match.players.left) addPlayerMatchDB(match.id, playerId, "left");
		else if (!match.players.right) addPlayerMatchDB(match.id, playerId, "right");
		if (checkMatchFull(match)) startMatch(match);
	} catch (error: any) {
		console.error(error.message);
	}
}

export function checkMatchFull(match: Match) {
	return match.players.left && match.players.right;
}
