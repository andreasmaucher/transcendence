import type { Match, Tournament } from "../types/game.js";
import { createTournamentDB, startTournamentDB, removeTournamentDB } from "../database/tournaments/setters.js";
import { addPlayerToMatch, checkMatchFull, createMatch, startMatch } from "./matchManager.js";
import { createInitialTournamentState } from "./state.js";
import { tournaments } from "../config/structures.js";
import { initTournamentMatches } from "./tournamentManagerHelpers.js";
import crypto from "crypto";

export function resetTournamentsForTest(): void {
	tournaments.clear();
}

export function getOrCreateTournament(id: string): Tournament {
	let tournament = tournaments.get(id);
	if (!tournament) {
		let tournamentId = crypto.randomUUID();
		tournament = {
			id: tournamentId,
			isRunning: false,
			state: createInitialTournamentState(4), // Hardcoded size of 4 for now
			matches: new Map<number, Match[]>(),
		} as Tournament;

		try {
			// Add new tournament to database (without starting it)
			createTournamentDB(tournament.id, tournament.state.size);
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
			console.error(error.message);
		}
		tournaments.set(tournament.id, tournament);
	}
	return tournament;
}

export function startTournament(tournament: Tournament) {
	try {
		clearTimeout(tournament.expirationTimer);
		delete tournament.expirationTimer;
		console.log(`[WS] Tournament ${tournament.id} now full — timer cleared`);
		const matches = tournament.matches.get(tournament.state.round);
		if (matches) {
			for (const match of matches) startMatch(match);
			startTournamentDB(tournament.id);
			tournament.isRunning = true;
		}
	} catch (error: any) {
		console.error(error.message);
	}
}

export function addPlayerToTournament(tournament: Tournament, playerId: string): Match | undefined {
	try {
		const matches = tournament.matches.get(tournament.state.round);
		if (matches) {
			for (const match of matches) {
				if (!checkMatchFull(match)) {
					addPlayerToMatch(match, playerId);
					if (checkTournamentFull(tournament)) startTournament(tournament);
					return match;
				}
			}
		}

		return undefined; // If all matches already full
	} catch (error: any) {
		console.error(error.message);
	}
}

export function checkTournamentFull(tournament: Tournament) {
	const matches = tournament.matches.get(tournament.state.round);
	if (matches) {
		for (const match of matches) {
			if (!checkMatchFull(match)) return false;
		}
	}

	return true;
}

export function forEachTournament(fn: (tournament: Tournament) => void): void {
	for (const tournament of tournaments.values()) fn(tournament);
}
