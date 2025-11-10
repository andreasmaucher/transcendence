import type { Tournament } from "../types/game.js";
import { tournaments } from "../config/structures.js";
import { checkMatchFull, createMatch } from "./matchManager.js";
import { Match, TournamentMatchType } from "../types/match.js";

export function resetTournamentsForTest(): void {
	tournaments.clear();
}

export function forEachTournament(fn: (tournament: Tournament) => void): void {
	for (const tournament of tournaments.values()) fn(tournament);
}

export function initTournamentMatches(tournament: Tournament, size: number): Match[] {
	const matches: Match[] = [];
	const round = tournament.state.round;

	// How many matches in this round
	const matchCount = size / Math.pow(2, round);

	for (let i = 0; i < matchCount; i++) {
		let matchId = crypto.randomUUID();
		let type: TournamentMatchType = "normal";
		let placementRange: [number, number] = [0, 0];

		if (isFinalRound(tournament)) {
			if (i === 0) {
				type = "final";
				placementRange = [1, 2];
			} else if (i === 1 && size >= 4) {
				type = "thirdPlace";
				placementRange = [3, 4];
			} else {
				type = "placement";
				placementRange = [i * 2 + 1, i * 2 + 2];
			}
		}

		matches.push(
			createMatch({
				id: matchId,
				mode: "remote",
				tournament,
				type,
				placementRange,
			})
		);
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

export function getTotalRounds(tournament: Tournament) {
	return Math.ceil(Math.log2(tournament.state.size));
}

export function isFinalRound(tournament: Tournament) {
	return tournament.state.round >= getTotalRounds(tournament);
}

export function isTournamentOver(tournament: Tournament) {
	if (!isFinalRound(tournament)) return false;
	const matches = tournament.matches.get(tournament.state.round);
	if (matches) {
		for (const match of matches) {
			if (match.state.isRunning) return false;
		}
		return true;
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

// Retrive a specific tournament's data
export function getTournament(id: string): Tournament | undefined {
	let tournament = tournaments.get(id);
	if (!tournament) console.log("[TM] Tournament not found");
	return tournament;
}
