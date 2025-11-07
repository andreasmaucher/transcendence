import type { Match, Tournament, TournamentState } from "../types/game.js";
import { createTournamentDB, startTournamentDB } from "../database/tournaments/setters.js";
import { createMatch } from "./matchManager.js";
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
		} catch (err) {
			console.error(`[db] Failed to insert tournament ${tournament.id}:`, err);
		}
		tournament.matches = initTournamentMatches(tournamentId, size);
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

export function forEachTournament(fn: (tournament: Tournament) => void): void {
	for (const tournament of tournaments.values()) fn(tournament);
}
