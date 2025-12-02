import type { Tournament } from "../types/game.js";
import { tournaments } from "../config/structures.js";
import { checkMatchFull, createMatch } from "./matchManager.js";
import { Match, Player, TournamentMatchType } from "../types/match.js";

export function resetTournamentsForTest(): void {
	tournaments.clear();
}

export function forEachTournament(fn: (tournament: Tournament) => void): void {
	for (const tournament of tournaments.values()) fn(tournament);
}

// Create all the matches of the actual round of the tournament
export function initTournamentMatches(tournament: Tournament, size: number): Match[] {
	const matches: Match[] = [];
	const round = tournament.state.round;

	// How many matches in this round
	let matchCount = size / Math.pow(2, round);
	// ANDY: with the formula above only one final would be possible but we need also the game for 3rd place
	if (isFinalRound(tournament) && size >= 4) {
		matchCount = 2;
	}

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

// Get the player id of the match winner
export function extractMatchWinner(match: Match): string {
	const { players, state } = match;

	if (state.winner === "left") {
		if (players.left) return players.left?.username;
		return "error";
	}

	if (state.winner === "right") {
		if (players.right) return players.right?.username;
		// If there is no right player, then it's guest
		return "guest";
	}

	return "error";
}

// Get the player id of the match loser
export function extractMatchLoser(match: Match): string {
	const { players, state } = match;

	if (state.winner === "left") {
		if (players.right) return players.right?.username;
		// If there is no right player, then it's guest
		return "guest";
	} else if (state.winner === "right") {
		if (players.left) return players.left?.username;
		return "error";
	}

	return "error";
}

// Get a tournament's total rounds based on the size
export function getTotalRounds(tournament: Tournament) {
	return Math.ceil(Math.log2(tournament.state.size));
}

// Check if tournament is in final round
export function isFinalRound(tournament: Tournament) {
	return tournament.state.round >= getTotalRounds(tournament);
}

// Check if round is over
export function isRoundOver(tournament: Tournament): boolean {
	const matches = tournament.matches.get(tournament.state.round);
	if (!matches) return false;
	for (const match of matches) {
		if (match.state.isRunning) return false;
	}
	return true;
}

// Check if tournament is over
export function isTournamentOver(tournament: Tournament): boolean {
	if (!isFinalRound(tournament)) return false;
	const matches = tournament.matches.get(tournament.state.round);
	if (!matches) return false;
	for (const match of matches) {
		if (match.state.isRunning) return false;
	}
	return true;
}

// Check if tournament is full (all matches of first round have players)
export function checkTournamentFull(tournament: Tournament) {
	const matches = tournament.matches.get(tournament.state.round);
	if (matches) {
		for (const match of matches) {
			if (!checkMatchFull(match)) return false;
		}
	}

	return true;
}

// Get a specific tournament from the tournaments Map structure
export function getTournament(id: string): Tournament | undefined {
	let tournament = tournaments.get(id);
	if (!tournament) console.log("[TM] Tournament not found");
	return tournament;
}

// Check if tournament is open (waiting for players)
export function isTournamentOpen(tournament: Tournament): boolean {
	if (tournament.state.isRunning || tournament.state.isOver) return false;

	const matches = tournament.matches.get(1);
	if (!matches) return false;

	// If any match has an empty player slot, tournament is open
	return matches.some((match) => !match.players.left || !match.players.right);
}

// Get all open (waiting for players) tournaments
export function getOpenTournaments(): Tournament[] {
	let openTournaments: Tournament[] = [];
	for (const tournament of tournaments.values()) {
		if (isTournamentOpen(tournament)) openTournaments.push(tournament);
	}
	return openTournaments;
}
