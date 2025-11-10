import type { SingleGame, Match, Tournament, TournamentMatchType, TournamentMatchInfo } from "../types/game.js";
import { createInitialMatchState } from "../game/state.js";
import { addPlayerMatchDB, createMatchDB, endMatchDB, startMatchDB } from "../database/matches/setters.js";
import { getSingleGame } from "./singleGameManager.js";
import { endTournamentDB } from "../database/tournaments/setters.js";
import { tournaments } from "../config/structures.js";
import { isTournamentOver } from "./tournamentManagerHelpers.js";
import { endTournament } from "./tournamentManager.js";

export function initTournamentMatchInfo(
	tournament: Tournament,
	type: TournamentMatchType,
	placementRange: [number, number]
) {
	let tournamentMatchInfo: TournamentMatchInfo = {
		id: tournament.id,
		round: tournament.state.round,
		type: type,
		placementRange: placementRange,
	};
	return tournamentMatchInfo;
}

export function createMatch({
	id,
	mode,
	userId,
	singleGame,
	tournament,
	type,
	placementRange,
}: {
	id: string;
	mode: string;
	userId?: string;
	singleGame?: SingleGame;
	tournament?: Tournament;
	type?: TournamentMatchType;
	placementRange?: [number, number];
}): Match {
	let match = {
		id,
		tournament: undefined,
		singleGameId: singleGame?.id,
		state: createInitialMatchState(),
		inputs: { left: 0, right: 0 },
		players: { left: undefined, right: undefined },
		clients: new Set(),
	} as Match;

	if (tournament && type && placementRange)
		match.tournament = initTournamentMatchInfo(tournament, type, placementRange);

	try {
		// Add new match to database (without starting it)
		createMatchDB(match);
		// Start it only if it's a local session
		if (mode == "local" && userId) {
			addPlayerMatchDB(match.id, userId, "left");
			startMatchDB(id);
			match.state.isRunning = true;
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
		} else if (match.tournament) startMatchDB(match.id, match.tournament.id);
		else return; // Temporary error handling
		match.state.isRunning = true;
	} catch (error: any) {
		console.error(error.message);
	}
}

export function endMatch(match: Match) {
	match.state.isRunning = false;
	endMatchDB(match.id, match.state.winner); // Update database
	if (!match.tournament) return;
	const tournament = tournaments.get(match.tournament.id);
	if (tournament && isTournamentOver(tournament)) endTournament(tournament);
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
