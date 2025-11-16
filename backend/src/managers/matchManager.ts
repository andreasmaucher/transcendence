import type { SingleGame, Tournament } from "../types/game.js";
import { createInitialMatchState } from "../game/state.js";
import {
	addPlayerMatchDB,
	createMatchDB,
	endMatchDB,
	removeMatchDB,
	startMatchDB,
} from "../database/matches/setters.js";
import { getSingleGame, quitSingleGame } from "./singleGameManager.js";
import { tournaments } from "../config/structures.js";
import { isRoundOver, isTournamentOver } from "./tournamentManagerHelpers.js";
import { endTournament, goToNextRound, quitTournament } from "./tournamentManager.js";
import { Match, TournamentMatchInfo, TournamentMatchType } from "../types/match.js";

// Set the starting state of the tournament match info
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

// Create the match
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
		mode: mode,
		clients: new Set(),
	} as Match;

	if (tournament && type && placementRange)
		match.tournament = initTournamentMatchInfo(tournament, type, placementRange);

	try {
		createMatchDB(match); // Add new match to database (without starting it)
	} catch (error: any) {
		console.error(error.message);
	}
	return match;
}

// Start match
export function startMatch(match: Match) {
	try {
		if (match.singleGameId && match.mode == "local") {
			startMatchDB(match.id);
		} else if (match.singleGameId && match.mode == "remote") {
			// If it's a remote single game, handle the timeout cleanup here
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

// End match
export function endMatch(match: Match) {
	match.state.isRunning = false;
	endMatchDB(match); // Update database
	// Stops here if it's a single game
	if (!match.tournament) return;
	const tournament = tournaments.get(match.tournament.id);
	if (!tournament) return;
	if (isTournamentOver(tournament)) endTournament(tournament);
	else if (isRoundOver(tournament)) goToNextRound(tournament);
}

// Add player to open match
export function addPlayerToMatch(match: Match, playerId: string) {
	try {
		if (!match.players.left) addPlayerMatchDB(match.id, playerId, "left");
		else if (!match.players.right) addPlayerMatchDB(match.id, playerId, "right");
		else return; // Temporary error handling, match full
		if (match.singleGameId && checkMatchFull(match)) startMatch(match);
	} catch (error: any) {
		console.error(error.message);
	}
}

// Check if match is full
export function checkMatchFull(match: Match) {
	return match.players.left && match.players.right;
}

export function quitMatch(match: Match, playerId: string) {
	removeMatchDB(match.id);
	if (match.singleGameId) quitSingleGame(match.singleGameId);
	else if (match.tournament) quitTournament(match.tournament.id, playerId);
}

export function handlePlayerDisconnect(match: Match, playerId: string) {
	for (const client of match.clients) {
		// Send a message BEFORE closing
		client.send(
			JSON.stringify({
				type: "player-left",
				player: playerId,
			})
		);

		client.close(1000, "A player quit");
	}

	quitMatch(match, playerId);
}
