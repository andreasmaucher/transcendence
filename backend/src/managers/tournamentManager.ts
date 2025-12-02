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
import { Match } from "../types/match.js";
import { forfeitMatchDB } from "../database/matches/setters.js";
import { buildPayload } from "../transport/broadcaster.js";
import { createTournamentPlayerDB } from "../database/tournament_players/setters.js";

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
			players: [],
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
			console.error("[TM]", error.message);
		}
		tournaments.set(id, tournament);
		console.log("NEW OPEN TOURNAMENT:", tournament.id, tournament.name);
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
		console.error("[TM]", error.message);
	}
}

// Add a player to an open tournament
export function addPlayerToTournament({
	tournament,
	playerId,
	playerDisplayName,
	socket,
}: {
	tournament: Tournament;
	playerId: string;
	playerDisplayName?: string;
	socket?: any;
}): Match | undefined {
	try {
		const matches = tournament.matches.get(tournament.state.round);
		if (matches) {
			for (const match of matches) {
				if (!checkMatchFull(match)) {
					if (tournament.state.round === 1 && playerDisplayName && socket) {
						tournament.players.push({
							username: playerId,
							displayName: playerDisplayName,
							socket: socket,
							currentMatch: match,
						});
						createTournamentPlayerDB(tournament.id, playerId, playerDisplayName);
					}
					addPlayerToMatch(match, playerId, socket);
					if (checkTournamentFull(tournament)) startTournament(tournament);
					return match;
				}
			}
		}
		return undefined; // If all matches already full
	} catch (error: any) {
		console.error("[TM]", error.message);
	}
}

// Assign players to the next round based on the results
export function assignPlayersToRound(tournament: Tournament) {
	const prevRound = tournament.matches.get(tournament.state.round - 1);
	const nextRound = tournament.matches.get(tournament.state.round);
	if (prevRound && nextRound) {
		// ANDY: issue is was that Tournament is progressing to Round 2 when only 1 of the 2 Round 1 matches finished!
		// validate all previous round matches have winners
		let allHaveWinners = true;
		for (const match of prevRound) {
			if (!match.state.winner) {
				allHaveWinners = false;
			}
		}

		if (!allHaveWinners) {
			return;
		}

		// ANDY: creates a map of username -> socket from previous round
		// we need to be able to find the socket for the winner / loser to assign them to the new match
		// attach to the new match by updating socket.currentTournamentMatch
		const playerSockets = new Map<string, any>();
		for (const match of prevRound) {
			for (const client of match.clients) {
				if ((client as any).username) {
					const username = (client as any).username;
					playerSockets.set(username, client);
				}
			}
		}

		// assign winners to new matches
		for (const match of prevRound) {
			const winner = extractMatchWinner(match);
			// "error" means game has no winner yet and "guest" means invalid
			if (winner === "error" || winner === "guest") {
				continue;
			}

			const newMatch = addPlayerToTournament({ tournament: tournament, playerId: winner });
			if (!newMatch) {
				continue;
			}

			// move the socket of the winning player to the new match
			const socket = playerSockets.get(winner);
			if (!socket) {
				continue;
			}

			// remove the client from old match (semi-final)
			match.clients.delete(socket);
			// add the same socket to the new match (final or 3rd place game)
			newMatch.clients.add(socket);
			// update the sockets current tournament match reference so input messages are routed to the new match
			socket.currentTournamentMatch = newMatch;

			// build & send new match assignment with tournament info to the frontend
			const playerSide = newMatch.players.left?.username === winner ? "left" : "right";
			socket.send(
				buildPayload("match-assigned", {
					matchId: newMatch.id,
					playerSide: playerSide,
					tournamentMatchType: newMatch.tournament?.type,
					round: tournament.state.round,
				} as any)
			);

			// send initial state of new match to the frontend so when a player joins the new match the canvas can render the right scene
			socket.send(buildPayload("state", newMatch.state));
		}

		// second loop that assigns the losers to the 3rd place game starts from here, basically same logic as the first loop
		for (const match of prevRound) {
			const loser = extractMatchLoser(match);
			if (loser === "error" || loser === "guest") {
				continue;
			}

			// add the loser to the new match
			const newMatch = addPlayerToTournament({ tournament: tournament, playerId: loser });
			if (!newMatch) {
				continue;
			}

			// move the looser socket to the new match
			const socket = playerSockets.get(loser);
			if (!socket) {
				continue;
			}

			match.clients.delete(socket);
			newMatch.clients.add(socket);
			socket.currentTournamentMatch = newMatch;

			// send new match assignment with tournament info
			const playerSide = newMatch.players.left?.username === loser ? "left" : "right";
			socket.send(
				buildPayload("match-assigned", {
					matchId: newMatch.id,
					playerSide: playerSide,
					tournamentMatchType: newMatch.tournament?.type,
					round: tournament.state.round,
				} as any)
			);

			// send initial state of new match
			socket.send(buildPayload("state", newMatch.state));
		}
	}
}

// Move tournament logic to the next round
export function goToNextRound(tournament: Tournament) {
	// ANDY: added logic to ensure that second round starts when both matches of the first round have finished
	const currentRound = tournament.state.round;
	const nextRound = currentRound + 1;

	// check if Round 2 matches already exist (from a previous failed attempt where we left the match objects in the database)
	if (tournament.matches.has(nextRound)) {
		console.log(`[TM] Round ${nextRound} matches already exist, trying player assignment again`);
		assignPlayersToRound(tournament);

		// check if player assignment for round 2 is possibel this time
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
				// if player assignment succeeded increment the round
				tournament.state.round = nextRound;
				console.log(`[TM] Player assignment succeeded, advancing to Round ${nextRound}`);
				for (const match of matches) startGameCountdown(match);
			} else {
				console.log(`[TM] Player assignment still incomplete, waiting...`);
			}
		}
		return;
	}

	// pre-build the matches for the next round without assuming that the players are ready yet
	const matches = initTournamentMatches(
		{ ...tournament, state: { ...tournament.state, round: nextRound } },
		tournament.state.size
	);
	tournament.matches.set(nextRound, matches);

	// temporarily increment round so assignPlayersToRound sees the correct round numbers
	const originalRound = tournament.state.round;
	tournament.state.round = nextRound;

	// try to assign players (this might fail if winners aren't ready yet)
	assignPlayersToRound(tournament);

	// check if assignPlayersToRound succeeded by checking if matches have players
	let assignmentSucceeded = true;
	for (const match of matches) {
		if (!match.players.left || !match.players.right) {
			assignmentSucceeded = false;
			break;
		}
	}

	// if the assignment failed roll back the round increment and wait for all matches to finish (but we leave the match objects in the database)
	// we only advance to the next step when every game of the next round has both players ready
	if (!assignmentSucceeded) {
		tournament.state.round = originalRound;
		console.log(
			`[TM] Player assignment incomplete, rolling back to Round ${originalRound}, waiting for all matches to finish...`
		);
		return;
	}

	// when the assignment succeeded the round is already incremented so we can just start the matches
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

	const tournamentWinner: string | undefined =
		finalMatch.state.winner == "left" ? finalMatch.players.left?.username : finalMatch.players.right?.username;
	endTournamentDB(tournament.id, tournamentWinner);
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
				const clients = tournament.players.map((player) => player.socket);
				for (const client of clients) {
					// Send a message BEFORE closing
					client.send(
						buildPayload("player-left", {
							username: playerId,
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
