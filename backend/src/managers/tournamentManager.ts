import type { Tournament } from "../types/game.js";
import {
	createTournamentDB,
	startTournamentDB,
	removeTournamentDB,
	endTournamentDB,
	forfeitTournamentDB,
} from "../database/tournaments/setters.js";
import { addPlayerToMatch, checkMatchFull, startGameCountdown } from "./matchManager.js";
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
import { forfeitMatchDB } from "../database/matches/setters.js";
import { buildPayload } from "../transport/broadcaster.js";

// Get or Create a tournament, called only when creating a socket connection
export function getOrCreateTournament(id: string, name?: string, size?: number): Tournament {
	let tournament = tournaments.get(id);
	if (!tournament) {
		// use the provided id from URL so players can find each other
		tournament = {
			id: id,
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
		tournaments.set(id, tournament);
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
			for (const match of matches) startGameCountdown(match);
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
		// Build a map of playerId -> WebSocket from previous round
		const playerSockets = new Map<string, any>();
		for (const match of prevRound) {
			for (const client of match.clients) {
				const username = (client as any).username;
				if (username) {
					playerSockets.set(username, client);
				}
			}
		}

		// Assign winners to new matches
		for (const match of prevRound) {
			const winner = extractMatchWinner(match);
			const newMatch = addPlayerToTournament(tournament, winner);
			// Add winner's socket to the new match
			const winnerSocket = playerSockets.get(winner);
			if (newMatch && winnerSocket) {
				newMatch.clients.add(winnerSocket);
				// Notify player of new match assignment
				const playerSide = newMatch.players.left === winner ? "left" : "right";
				winnerSocket.send(
					buildPayload("match-assigned", {
						matchId: newMatch.id,
						playerSide: playerSide,
					})
				);
			}
		}
		
		// Assign losers to new matches
		for (const match of prevRound) {
			const loser = extractMatchLoser(match);
			const newMatch = addPlayerToTournament(tournament, loser);
			// Add loser's socket to the new match
			const loserSocket = playerSockets.get(loser);
			if (newMatch && loserSocket) {
				newMatch.clients.add(loserSocket);
				// Notify player of new match assignment
				const playerSide = newMatch.players.left === loser ? "left" : "right";
				loserSocket.send(
					buildPayload("match-assigned", {
						matchId: newMatch.id,
						playerSide: playerSide,
					})
				);
			}
		}
	}
}

// Move tournament logic to the next round
export function goToNextRound(tournament: Tournament) {
	tournament.state.round++;
	const matches = initTournamentMatches(tournament, tournament.state.size);
	tournament.matches.set(tournament.state.round, matches);
	
	// Notify all players about round transition
	const prevRoundMatches = tournament.matches.get(tournament.state.round - 1);
	if (prevRoundMatches) {
		for (const match of prevRoundMatches) {
			for (const client of match.clients) {
				const username = (client as any).username;
				const winner = extractMatchWinner(match);
				const isWinner = username === winner;
				
				client.send(
					buildPayload("round-transition", {
						round: tournament.state.round,
						result: isWinner ? "winner" : "loser",
						message: isWinner 
							? "You won! Advancing to finals..." 
							: "Advancing to 3rd place match...",
					})
				);
			}
		}
	}
	
	assignPlayersToRound(tournament);
	for (const match of matches) startGameCountdown(match);
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

export function forfeitTournament(tournamentId: string, playerId: string) {
	const tournament = getTournament(tournamentId);
	if (tournament) {
		tournament.state.isRunning = false;
		const roundMatches = tournament.matches.get(tournament.state.round);
		if (roundMatches) {
			for (const match of roundMatches) {
				match.state.isRunning = false;
				for (const client of tournament.clients) {
					// Send a message BEFORE closing
					client.send(
						buildPayload("player-left", {
							matchId: match.id,
							player: playerId,
						})
					);
					client.close(1000, "A player left");
				}
				forfeitMatchDB(match.id, playerId);
			}
		}
		forfeitTournamentDB(tournament.id, playerId);
		tournaments.delete(tournament.id);
	}
}
