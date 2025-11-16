import type { Tournament } from "../types/game.js";
import {
	createTournamentDB,
	startTournamentDB,
	removeTournamentDB,
	endTournamentDB,
} from "../database/tournaments/setters.js";
import { addPlayerToMatch, checkMatchFull, startMatch } from "./matchManager.js";
import { createInitialTournamentState } from "../game/state.js";
import { tournaments } from "../config/structures.js";
import {
	checkTournamentFull,
	extractMatchLoser,
	extractMatchWinner,
	getTournament,
	initTournamentMatches,
} from "./tournamentManagerHelpers.js";
import crypto from "crypto";
import { Match } from "../types/match.js";

// Get or Create a tournament, called only when creating a socket connection
export function getOrCreateTournament(id: string, name?: string, size?: number): Tournament {
	let tournament = tournaments.get(id);
	if (!tournament) {
		let tournamentId = crypto.randomUUID();
		tournament = {
			id: tournamentId,
			name: name,
			isRunning: false,
			state: createInitialTournamentState(size || 4),
			matches: new Map<number, Match[]>(),
			clients: new Set(),
		} as Tournament;

		try {
			// Add new tournament to database (without starting it)
			createTournamentDB(tournament.id, tournament.name, tournament.state.size);
			const matches = initTournamentMatches(tournament, tournament.state.size);
			tournament.matches.set(1, matches);
			console.log(`[TM] Starting 5-minute timeout for tournament ${tournament.id}`);

			// Set timer to wait for players
			tournament.expirationTimer = setTimeout(
				(tournament: Tournament) => {
					if (!checkTournamentFull(tournament)) {
						console.log(`[WS] Tournament ${tournament.id} expired — not enough players joined`);

						// Loop through all rounds
						for (const [round, matches] of tournament.matches) {
							for (const match of matches) {
								for (const s of match.clients) {
									s.close(1000, "Tournament expired: not enough players joined");
								}
								match.clients.clear();
							}
						}

						removeTournamentDB(tournament.id); // Remove tournament and its matches from database
						tournament.matches.clear();
						tournaments.delete(tournament.id);
					}
				},
				5 * 60 * 1000,
				tournament
			); // 5 minutes
		} catch (error: any) {
			console.error("[TM] " + error.message);
		}
		tournaments.set(tournament.id, tournament);
	}
	return tournament;
}

// Start a tournament
export function startTournament(tournament: Tournament) {
	try {
		clearTimeout(tournament.expirationTimer);
		delete tournament.expirationTimer;
		console.log(`[WS] Tournament ${tournament.id} now full — timer cleared`);
		const matches = tournament.matches.get(tournament.state.round);
		if (matches) {
			for (const match of matches) startMatch(match);
			startTournamentDB(tournament.id);
			tournament.state.isRunning = true;
		}
	} catch (error: any) {
		console.error("[TM] " + error.message);
	}
}

// Add a player to an open tournament
export function addPlayerToTournament(tournament: Tournament, playerId: string, socket?: any): Match | undefined {
	try {
		const matches = tournament.matches.get(tournament.state.round);
		if (matches) {
			for (const match of matches) {
				if (!checkMatchFull(match)) {
					addPlayerToMatch(match, playerId);
					if (tournament.state.round == 1) tournament.clients.add(socket);
					if (checkTournamentFull(tournament)) startTournament(tournament);
					return match;
				}
			}
		}

		return undefined; // If all matches already full
	} catch (error: any) {
		console.error("[TM] " + error.message);
	}
}

// Assign players to the next round based on the results
export function assignPlayersToRound(tournament: Tournament) {
	const prevRound = tournament.matches.get(tournament.state.round - 1);
	const nextRound = tournament.matches.get(tournament.state.round);
	if (prevRound && nextRound) {
		for (const match of prevRound) {
			const winner = extractMatchWinner(match);
			addPlayerToTournament(tournament, winner);
		}
		for (const match of prevRound) {
			const loser = extractMatchLoser(match);
			addPlayerToTournament(tournament, loser);
		}
	}
}

// Move tournament logic to the next round
export function goToNextRound(tournament: Tournament) {
	tournament.state.round++;
	const matches = initTournamentMatches(tournament, tournament.state.size);
	tournament.matches.set(tournament.state.round, matches);
	assignPlayersToRound(tournament);
	for (const match of matches) startMatch(match);
}

// End tournament on the database
export function endTournament(tournament: Tournament) {
	if (tournament.state.isOver) return;

	const finalRoundMatches = tournament.matches.get(tournament.state.round);
	if (!finalRoundMatches) return;
	const finalMatch = finalRoundMatches.find((m) => m.tournament?.type === "final");
	if (!finalMatch) {
		console.error(`[TM] No final match found for tournament ${tournament.id}`);
		return;
	}

	endTournamentDB(tournament.id, finalMatch.state.winner);
	tournament.state.isRunning = false;
	tournament.state.isOver = true;
}

export function quitTournament(tournamentId: string, playerId: string) {
	const tournament = getTournament(tournamentId);
	if (tournament) {
		for (const client of tournament.clients) {
			// Send a message BEFORE closing
			client.send(
				JSON.stringify({
					type: "player-left",
					player: playerId,
				})
			);

			client.close(1000, "A player quit");
		}
		removeTournamentDB(tournament.id);
		tournaments.delete(tournament.id);
	}
}
