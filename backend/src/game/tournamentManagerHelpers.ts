import type { Match, Tournament } from "../types/game.js";
import { tournaments } from "../config/structures.js";
import { addPlayerToTournament } from "./tournamentManager.js";
import { createMatch, startMatch } from "./matchManager.js";

export function initTournamentMatches(tournament: Tournament, size: number): Match[] {
	const matches: Match[] = [];
	for (let i = 0; i < size / 2; i++) {
		let matchId = crypto.randomUUID();
		matches[i] = createMatch({
			id: matchId,
			mode: "remote",
			round: tournament.state.round,
			tournament: tournament,
		});
	}
	return matches;
}

export function extractMatchWinner(match: Match): string {
	const { players, state } = match;

	if (state.winner === "left") {
		if (players.left) return players.left;
		return "error";
	}

	if (state.winner === "right") {
		if (players.right) return players.right;
		// If there is no right player, then it's guest
		return "guest";
	}

	return "error";
}

export function extractMatchLoser(match: Match): string {
	const { players, state } = match;

	if (state.winner === "left") {
		if (players.right) return players.right;
		// If there is no right player, then it's guest
		return "guest";
	} else if (state.winner === "right") {
		if (players.left) return players.left;
		return "error";
	}

	return "error";
}

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

export function goToNextRound(tournament: Tournament) {
	tournament.state.round++;
	const matches = initTournamentMatches(tournament, tournament.state.size);
	tournament.matches.set(tournament.state.round, matches);
	assignPlayersToRound(tournament);
	for (const match of matches) startMatch(match);
}

// Retrive a specific tournament's data
export function getTournament(id: string): Tournament | undefined {
	let tournament = tournaments.get(id);
	if (!tournament) console.log("[TM] Tournament not found");
	return tournament;
}
