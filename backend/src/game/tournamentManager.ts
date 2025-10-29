import type { Match, Tournament, TournamentState } from "../types/game.js";
import { startTournament } from "../database/helpers/tournament_setters.js";
import { createMatch } from "./matchManager.js";
import crypto from "crypto";

const tournaments = new Map<string, Tournament>();

export function resetTournamentsForTest(): void {
  tournaments.clear();
}

export function createInitialTournamentState(): TournamentState {
  return { //hardcoded for now
	  size: 0,
	  tournamentOver: false,
	  winner: null,
  };
}

export function initTournamentMatches(tournamentId: string, size: number, ): Match[] {
	const matches: Match[] = [];
	for (let i = 0; i < size / 2; i++) {
		let matchId = crypto.randomUUID();
		matches[i] = createMatch(matchId, tournamentId);
	}
	return matches;
}

export function getOrCreateTournament(id: string): Tournament {
	let tournament = tournaments.get(id);
	if (!tournament) {
		let tournamentId = crypto.randomUUID();
		tournament = {
			id: tournamentId,              // temporary
			state: createInitialTournamentState(),
			matches: [],
		} as Tournament;
		// Log new tournament in SQLite
		try {
			startTournament(tournament.id, tournament.state.size);
		} catch (err) {
			console.error(`[db] Failed to insert tournament ${tournament.id}:`, err);
		}
		tournament.matches = initTournamentMatches(tournamentId, 2); //hardcoded size of 2 for now
		tournaments.set(tournament.id, tournament);
  	}
	
	return tournament;
}

export function Tournament(fn: (tournament: Tournament) => void): void {
  for (const tournament of tournaments.values()) fn(tournament);
}
