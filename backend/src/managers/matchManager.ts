import type { SingleGame, Tournament } from "../types/game.js";
import { createInitialMatchState } from "../game/state.js";
import {
	addPlayerMatchDB,
	createMatchDB,
	endMatchDB,
	forfeitMatchDB,
	startMatchDB,
} from "../database/matches/setters.js";
import { forfeitSingleGame, getSingleGame } from "./singleGameManager.js";
import { tournaments } from "../config/structures.js";
import { isRoundOver, isTournamentOver } from "./tournamentManagerHelpers.js";
import { endTournament, forfeitTournament, goToNextRound } from "./tournamentManager.js";
import { Match, TournamentMatchInfo, TournamentMatchType } from "../types/match.js";
import { buildPayload, gameBroadcast } from "../transport/broadcaster.js";

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
	singleGame,
	tournament,
	type,
	placementRange,
}: {
	id: string;
	mode: string;
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
		players2: [],
		mode: mode,
		clients: new Set(),
	} as Match;

	if (tournament && type && placementRange)
		match.tournament = initTournamentMatchInfo(tournament, type, placementRange);

	try {
		createMatchDB(match); // Add new match to database (without starting it)
	} catch (error: any) {
		console.error("[MM]", error.message);
	}
	return match;
}

// Start match
export function startMatch(match: Match) {
	try {
		if (match.singleGameId && match.mode === "local") {
			startMatchDB(match.id);
		} else if (match.singleGameId && match.mode === "remote") {
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
		console.error("[MM]", error.message);
	}
}

export function startGameCountdown(match: Match) {
	let sec = 3;
	console.log(`[MM] Countdown starting for match ${match.id} with ${match.clients.size} clients`);

	const interval = setInterval(() => {
		// Broadcast countdown to all players in the match
		console.log(`[MM] Broadcasting countdown ${sec} to ${match.clients.size} clients`);
		gameBroadcast(buildPayload("countdown", { value: sec }), match);

	if (sec === 0) {
		clearInterval(interval);
		console.log(`[MM] Countdown finished, starting match ${match.id}`);

		setTimeout(() => {
			startMatch(match);
			gameBroadcast(buildPayload("start", undefined), match);
		}, 1000);
	}

		sec--;
	}, 1000);
}

// End match
export function endMatch(match: Match) {
	match.state.isRunning = false;
	endMatchDB(match); // Update database
	// Stops here if it's a single game
	if (!match.tournament) return;
	const tournament = tournaments.get(match.tournament.id);
	if (!tournament) return;
	if (isTournamentOver(tournament)) {
		// Delay ending tournament to show final score
		setTimeout(() => {
			endTournament(tournament);
		}, 1000); // 1 second to show final score
	} else if (isRoundOver(tournament)) {
		// Delay advancing to next round to show final scores
		console.log(`[TM] Round ${tournament.state.round} complete, advancing to next round in 1 second...`);
		setTimeout(() => {
			goToNextRound(tournament);
		}, 1000); // 1 second to show final scores
	}
}

// Add player to open match
export function addPlayerToMatch(match: Match, playerId: string, socket: any) {
	try {
		// ANDY: had to update in-memory object here since checkMatchFull was returning undefined
		// previously it only updated the database but did not update the in-memory match.players object
		console.log(`[MM] addPlayerToMatch: adding ${playerId} to match ${match.id}`);
		console.log(`[MM]   Before: left=${match.players.left?.username || 'empty'}, right=${match.players.right?.username || 'empty'}`);
		
		if (!match.players.left) {
			addPlayerMatchDB(match.id, playerId, "left");
			match.players.left = {
				username: playerId,
				socket: socket,
			}; // Update in-memory object
			console.log(`[MM]   Added ${playerId} as LEFT`);
		} else if (!match.players.right) {
			addPlayerMatchDB(match.id, playerId, "right");
			match.players.right = {
				username: playerId,
				socket: socket,
			};
			console.log(`[MM]   Added ${playerId} as RIGHT`);
		} else {
			console.log(`[MM]   ERROR: Match ${match.id} is already FULL!`);
		}
		
		console.log(`[MM]   After: left=${match.players.left?.username || 'empty'}, right=${match.players.right?.username || 'empty'}`);
		
		if (match.singleGameId && checkMatchFull(match)) {
			startGameCountdown(match);
		}
	} catch (error: any) {
		console.error("[MM]", error.message);
	}
}

// Check if match is full
export function checkMatchFull(match: Match) {
	return match.players.left && match.players.right;
}

export function forfeitMatch(match: Match, playerId: string) {
	if (match.singleGameId) {
		match.state.isRunning = false;
		for (const client of match.clients) {
			// Send a message BEFORE closing
			client.send(
				buildPayload("player-left", {
					username: playerId,
				})
			);

			client.close(1000, "A player left");
		}
		forfeitSingleGame(match.singleGameId);
		forfeitMatchDB(match.id, playerId);
	} else if (match.tournament) forfeitTournament(match.tournament.id, playerId);
}
