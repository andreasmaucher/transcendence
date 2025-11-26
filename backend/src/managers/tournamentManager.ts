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
	console.log(`[TM] assignPlayersToRound called for tournament ${tournament.id}, current round: ${tournament.state.round}, prevRound exists: ${!!prevRound}, nextRound exists: ${!!nextRound}`);
	if (prevRound && nextRound) {
		//! LOGIC The real issue is: Tournament is progressing to Round 2 when only 1 of the 2 Round 1 matches finished!
		// Validate all previous round matches have winners
		console.log(`[TM] Validating Round ${tournament.state.round - 1} matches for winners...`);
		console.log(`[TM] prevRound has ${prevRound.length} matches:`, prevRound.map(m => m.id));
		let allHaveWinners = true;
		for (const match of prevRound) {
			console.log(`[TM] Match ${match.id} isOver: ${match.state.isOver}, winner: ${match.state.winner}, isRunning: ${match.state.isRunning}`);
			if (!match.state.winner) {
				console.error(`[TM] Match ${match.id} has no winner yet! Will skip player assignment.`);
				allHaveWinners = false;
			}
		}
		
		if (!allHaveWinners) {
			console.log(`[TM] Not all Round ${tournament.state.round - 1} matches have winners yet, skipping round advancement`);
			return;
		}
		
		//! LOGIC for tournaments
		// Create a map of username -> socket from previous round
		const playerSockets = new Map<string, any>();
		for (const match of prevRound) {
			console.log(`[TM] Round ${tournament.state.round - 1} match ${match.id} has ${match.clients.size} clients`);
			for (const client of match.clients) {
				if ((client as any).username) {
					const username = (client as any).username;
					playerSockets.set(username, client);
					console.log(`[TM] Mapped socket for player: ${username}`);
				}
			}
		}
		console.log(`[TM] Total sockets mapped: ${playerSockets.size}`);
		//! LOGIC for tournaments
		// Assign winners to new matches
		for (const match of prevRound) {
			const winner = extractMatchWinner(match);
			console.log(`[TM] Match ${match.id} winner: ${winner}, left: ${match.players.left}, right: ${match.players.right}, winner side: ${match.state.winner}`);
			if (winner === "error" || winner === "guest") {
				console.error(`[TM] Invalid winner extracted from match ${match.id}: ${winner}`);
				continue;
			}
			
			const newMatch = addPlayerToTournament(tournament, winner);
			if (!newMatch) {
				console.error(`[TM] Failed to assign winner ${winner} to new match`);
				continue;
			}
			
			// Move the winner's socket to the new match
			const socket = playerSockets.get(winner);
			if (!socket) {
				console.error(`[TM] Socket not found for winner ${winner}`);
				continue;
			}
			
			// Remove from old match
			match.clients.delete(socket);
			// Add to new match
			newMatch.clients.add(socket);
			// Update socket's current tournament match reference
			socket.currentTournamentMatch = newMatch;
			
			// Send new match assignment with tournament info
			const playerSide = newMatch.players.left === winner ? "left" : "right";
			socket.send(
				buildPayload("match-assigned", {
					matchId: newMatch.id,
					playerSide: playerSide,
					tournamentMatchType: newMatch.tournament?.type,
					round: tournament.state.round,
				} as any)
			);
			
			// Send initial state of new match
			socket.send(buildPayload("state", newMatch.state));
		}
		//! LOGIC basically whole file got revamped
		// Assign losers to new matches
		for (const match of prevRound) {
			const loser = extractMatchLoser(match);
			if (loser === "error" || loser === "guest") {
				console.error(`[TM] Invalid loser extracted from match ${match.id}: ${loser}`);
				continue;
			}
			
			const newMatch = addPlayerToTournament(tournament, loser);
			if (!newMatch) {
				console.error(`[TM] Failed to assign loser ${loser} to new match`);
				continue;
			}
			
			//! LOGIC for tournaments
			// Move the loser's socket to the new match
			const socket = playerSockets.get(loser);
			if (!socket) {
				console.error(`[TM] Socket not found for loser ${loser}`);
				continue;
			}
			
			// Remove from old match
			match.clients.delete(socket);
			// Add to new match
			newMatch.clients.add(socket);
			// Update socket's current tournament match reference
			socket.currentTournamentMatch = newMatch;
			
			// Send new match assignment with tournament info
			const playerSide = newMatch.players.left === loser ? "left" : "right";
			socket.send(
				buildPayload("match-assigned", {
					matchId: newMatch.id,
					playerSide: playerSide,
					tournamentMatchType: newMatch.tournament?.type,
					round: tournament.state.round,
				} as any)
			);
			
			// Send initial state of new match
			socket.send(buildPayload("state", newMatch.state));
		}
	}
}

// Move tournament logic to the next round
export function goToNextRound(tournament: Tournament) {
	const currentRound = tournament.state.round;
	const nextRound = currentRound + 1;
	//! LOGIC so that the second round starts!!
	// Check if Round 2 matches already exist (from a previous failed attempt)
	if (tournament.matches.has(nextRound)) {
		console.log(`[TM] Round ${nextRound} matches already exist, trying player assignment again`);
		assignPlayersToRound(tournament);
		
		// Check if assignment succeeded this time
		const matches = tournament.matches.get(nextRound);
		if (matches) {
			let assignmentSucceeded = true;
			for (const match of matches) {
				if (!match.players.left || !match.players.right) {
					assignmentSucceeded = false;
					break;
				}
			}
			
			if (assignmentSucceeded) {
				// NOW increment the round
				tournament.state.round = nextRound;
				console.log(`[TM] Player assignment succeeded, advancing to Round ${nextRound}`);
				for (const match of matches) startGameCountdown(match);
			} else {
				console.log(`[TM] Player assignment still incomplete, waiting...`);
			}
		}
		return;
	}
	
	//! LOGIC for tournaments dont increment the round or create matches until after validation passed
	// Create matches for next round
	const matches = initTournamentMatches({ ...tournament, state: { ...tournament.state, round: nextRound } }, tournament.state.size);
	tournament.matches.set(nextRound, matches);
	
	// Temporarily increment round so assignPlayersToRound sees the correct round numbers
	const originalRound = tournament.state.round;
	tournament.state.round = nextRound;
	
	// Try to assign players - this might fail if winners aren't ready yet
	assignPlayersToRound(tournament);
	
	// Check if assignment actually succeeded by checking if matches have players
	let assignmentSucceeded = true;
	for (const match of matches) {
		if (!match.players.left || !match.players.right) {
			assignmentSucceeded = false;
			break;
		}
	}
	
	if (!assignmentSucceeded) {
		// Assignment failed - rollback the round increment
		tournament.state.round = originalRound;
		console.log(`[TM] Player assignment incomplete, rolling back to Round ${originalRound}, waiting for all matches to finish...`);
		return;
	}
	
	// Assignment succeeded, round is already incremented, just start the matches
	console.log(`[TM] Successfully advanced to Round ${nextRound}`);
	for (const match of matches) startGameCountdown(match);
}

// End tournament on the database
export function endTournament(tournament: Tournament) {
	if (tournament.state.isOver) return;

	const finalRoundMatches = tournament.matches.get(tournament.state.round);
	console.log(`[TM] endTournament called for ${tournament.id}, round: ${tournament.state.round}, matches in this round: ${finalRoundMatches?.length}`);
	if (!finalRoundMatches) return;
	
	// Log all matches in final round
	for (const m of finalRoundMatches) {
		console.log(`[TM] Final round match ${m.id}: type=${m.tournament?.type}, isOver=${m.state.isOver}, winner=${m.state.winner}`);
	}
	
	const finalMatch = finalRoundMatches.find((m) => m.tournament?.type === "final");
	if (!finalMatch) {
		console.error(`[TM] No final match found for tournament ${tournament.id}`);
		return;
	}

	console.log(`[TM] Declaring tournament winner: ${finalMatch.state.winner}`);
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
