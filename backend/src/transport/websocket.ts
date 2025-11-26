import { RawData } from "ws";
import type { FastifyInstance } from "fastify";
import { buildPayload } from "./broadcaster.js";
import { getOrCreateSingleGame } from "../managers/singleGameManager.js";
import { getOrCreateTournament, addPlayerToTournament } from "../managers/tournamentManager.js";
import { addPlayerToMatch, checkMatchFull, forfeitMatch, startMatch } from "../managers/matchManager.js";
import { Match } from "../types/match.js";
import { addUserOnline, removeUserOnline } from "../user/online.js";
import { handleSocketMessages } from "./messages.js";
import { authenticateWebSocket } from "../auth/verify.js";

export function registerWebsocketRoute(fastify: FastifyInstance) {
	// Register user socket
	fastify.get("/api/user/ws", { websocket: true }, (socket: any, request: any) => {
		const payload = authenticateWebSocket(request, socket);
		if (!payload) return;

		console.log(`[WS] Websocket for User: ${payload.username} registered`);

		socket.username = payload.username;
		const user = addUserOnline(payload.username, socket);
		if (!user) {
			socket.close(1011, "User not in database");
			return;
		}

		// Client responds to ping with pong automatically
		socket.on("pong", () => {
			user.isAlive = true;
		});

		socket.on("close", () => {
			removeUserOnline(payload.username);
		});
	});

	// Register/connect to a local single game
	fastify.get<{ Params: { id: string } }>(
		"/api/local-single-game/:id/ws",
		{ websocket: true },
		(socket: any, request: any) => {
			const payload = authenticateWebSocket(request, socket);
			if (!payload) return;

			const singleGameId = request.params.id;
			if (!singleGameId) {
				socket.close(1011, "singleGameId is missing");
				return;
			}

			console.log(`[WS] Websocket for LocalSingleGame: ${singleGameId} and User: ${payload.username} registered`);

			socket.username = payload.username;
			const singleGame = getOrCreateSingleGame(singleGameId, payload.username, "local");
			const match: Match = singleGame.match;
			// Since it's a local game add user and start the game
			addPlayerToMatch(match, socket.username);
			match.clients.add(socket);
			startMatch(match);

			socket.send(buildPayload("state", match.state));

			socket.on("message", (raw: RawData) => handleSocketMessages(raw, match));

			socket.on("close", () => {
				match.clients.delete(socket);
				forfeitMatch(match, socket.username);
			});
			socket.on("error", (err: any) => console.error(`[WS error] match=${match.id}`, err));
		}
	);

	// Register/connect to a single game (not local)
	fastify.get<{ Params: { id: string } }>(
		"/api/single-game/:id/ws",
		{ websocket: true },
		(socket: any, request: any) => {
			const payload = authenticateWebSocket(request, socket);
			if (!payload) return;

			const singleGameId = request.params.id;
			if (!singleGameId) {
				socket.close(1011, "singleGameId is missing");
				return;
			}

			if (singleGameId == "default")
				console.log(`[WS] Websocket for SingleGame: ${singleGameId} and User: ${payload.username} registered`);
			else console.log(`[WS] Websocket for SingleGame: ${singleGameId} and User: ${payload.username} connected`);

			socket.username = payload.username;

			const singleGame = getOrCreateSingleGame(singleGameId, payload.username, "remote");
			const match: Match = singleGame.match;

			if (checkMatchFull(match)) {
				console.log("[WS] Match already full");
				socket.close(1008, "Match is already full");
				return;
			}

			//! changed LOGIC here, need to be able to explain to jalombar
			// Add socket to clients BEFORE addPlayerToMatch so it receives countdown messages
			match.clients.add(socket);

			// determine which side this player will be assigned to
			const playerSide = !match.players.left ? "left" : "right";

			socket.send(
				buildPayload("match-assigned", {
					matchId: match.id,
					playerSide: playerSide,
				})
			);

			socket.send(buildPayload("state", match.state));

			// If match is not full yet, send "waiting" message to all clients
			if (!checkMatchFull(match)) {
				for (const client of match.clients) {
					client.send(buildPayload("waiting", undefined));
				}
			}

			// Add player to match (this may trigger countdown if match becomes full)
			addPlayerToMatch(match, socket.username);

			socket.on("message", (raw: RawData) => handleSocketMessages(raw, match));

			socket.on("close", () => {
				match.clients.delete(socket);
				forfeitMatch(match, socket.username);
			});
			socket.on("error", (err: any) => console.error(`[ws error] match=${match.id}`, err));
		}
	);

	// Register/connect to a tournament
	fastify.get<{ Params: { id: string }; Querystring: { name?: string; size?: number } }>(
		"/api/tournament/:id/ws",
		{ websocket: true },
		(socket: any, request: any) => {
			const payload = authenticateWebSocket(request, socket);
			if (!payload) return;

			const tournamentId = request.params.id;
			const tournamentName = request.query.name;
			const tournamentSize = request.query.size;
			if (!tournamentId) {
				socket.close(1011, "Tournament id missing");
				return;
			}

			if (tournamentId == "default")
				console.log(`[WS] Websocket for Tournament: ${tournamentId} and User: ${payload.username} registered`);
			else console.log(`[WS] Websocket for Tournament: ${tournamentId} and User: ${payload.username} connected`);
			socket.username = payload.username;

		const tournament = getOrCreateTournament(tournamentId, tournamentName, tournamentSize);
		//! LOGIC so the second game in the tournament sides are corretly assigned to the players
		// Find which match this player will join and determine their side BEFORE adding them
		let playerSide: "left" | "right" = "left";
		const matches = tournament.matches.get(tournament.state.round);
		if (matches) {
			for (const m of matches) {
				if (!m.players.left || !m.players.right) {
					// This is the match the player will join
					playerSide = !m.players.left ? "left" : "right";
					console.log(`[WS] Player ${payload.username} will be assigned to match ${m.id} as ${playerSide}`);
					break;
				}
			}
		}
		
		const match = addPlayerToTournament(tournament, socket.username, socket);
		if (match) {
			match.clients.add(socket);
			// Store reference for Round 2 reassignment
			socket.currentTournamentMatch = match;
			socket.tournamentId = tournament.id;

			console.log(`[WS] Player ${payload.username} joined match ${match.id} - left: ${match.players.left}, right: ${match.players.right}`);

			socket.send(
				buildPayload("match-assigned", {
					matchId: match.id,
					playerSide: playerSide,
					tournamentMatchType: match.tournament?.type,
					round: tournament.state.round,
				} as any)
			);

			socket.send(buildPayload("state", match.state));
			 //! LOGIC for tournaments
            // For tournaments, use socket.currentMatch which will be updated between rounds
			// Use a wrapper function that reads the current match from socket
			socket.on("message", (raw: RawData) => {
				const currentMatch = socket.currentTournamentMatch || match;
				handleSocketMessages(raw, currentMatch);
			});

			socket.on("close", () => {
				const currentMatch = socket.currentTournamentMatch || match;
				currentMatch.clients.delete(socket);
				forfeitMatch(currentMatch, socket.username);
			});
			socket.on("error", (err: any) => {
				const currentMatch = socket.currentTournamentMatch || match;
				console.error(`[ws error] match=${currentMatch?.id}`, err);
			});
			} else {
				console.log(`[WS] Tournament ${tournament.id} is already full`);
				socket.close(1008, "Tournament is already full");
			}
		}
	);
}
