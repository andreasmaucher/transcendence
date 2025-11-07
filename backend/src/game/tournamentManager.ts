import type { Match, Tournament, TournamentState } from "../types/game.js";
import { createTournamentDB, startTournamentDB, removeTournamentDB } from "../database/tournaments/setters.js";
import { removeMatchDB } from "../database/matches/setters.js";
import { checkMatchFull, createMatch } from "./matchManager.js";
import { createInitialTournamentState } from "./state.js";
import { tournaments } from "../config/structures.js";
import crypto from "crypto";

//const tournaments = new Map<string, Tournament>();

export function resetTournamentsForTest(): void {
	tournaments.clear();
}

export function initTournamentMatches(tournamentId: string, size: number): Match[] {
	const matches: Match[] = [];
	for (let i = 0; i < size / 2; i++) {
		let matchId = crypto.randomUUID();
		matches[i] = createMatch(matchId, tournamentId, "remote");
	}
	return matches;
}

export function getOrCreateTournament(id: string, size: number): Tournament {
	let tournament = tournaments.get(id);
	if (!tournament) {
		let tournamentId = crypto.randomUUID();
		tournament = {
			id: tournamentId,
			state: createInitialTournamentState(size),
			matches: [],
		} as Tournament;
		// Log new tournament in SQLite
		try {
			createTournamentDB(tournament.id, tournament.state.size);
			tournament.matches = initTournamentMatches(tournament.id, tournament.state.size);
			console.log(`[TM] Starting 5-minute timeout for tournament ${tournament.id}`);
			// Set timer to wait for players
			tournament.expirationTimer = setTimeout(() => {
				let tournament = getTournament(id);
				if (tournament && !checkTournamentFull(tournament)) {
					console.log(`[WS] Tournament ${tournament.id} expired — not enough players joined`);
					for (const match of tournament.matches) {
						removeMatchDB(match.id);
						for (const s of match.clients) s.close(1000, "Tournament expired: not enough players joined");
						match.clients.clear();
					}
					removeTournamentDB(tournament.id);
					tournaments.delete(tournament.id);
				}
			}, 5 * 60 * 1000); // 5 minutes
		} catch (error: any) {
			console.error(error.message);
		}
		tournaments.set(tournament.id, tournament);
	}
	return tournament;
}

// Retrive a specific tournament's data
export function getTournament(id: string): Tournament | undefined {
	let tournament = tournaments.get(id);
	if (!tournament) console.log("[TM] Tournament not found");
	return tournament;
}

export function startTournament(tournament: Tournament) {
	try {
		clearTimeout(tournament.expirationTimer);
		delete tournament.expirationTimer;
		console.log(`[WS] Tournament ${tournament.id} now full — timer cleared`);
		startTournamentDB(tournament.id);
	} catch (error: any) {
		console.error(error.message);
	}
}

export function checkTournamentFull(tournament: Tournament) {
	for (const match of tournament.matches) {
		if (!checkMatchFull(match)) return false;
	}
	return true;
}

export function forEachTournament(fn: (tournament: Tournament) => void): void {
	for (const tournament of tournaments.values()) fn(tournament);
}
