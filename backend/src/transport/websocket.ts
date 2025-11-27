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

			// ANDY: add socket to clients BEFORE addPlayerToMatch so it receives countdown messages
			// reason is that addPlayerToMatch triggers startGameCountdown as soon as the second player joins but the new socket was not in match.clients yet
			// so it missed the entire countdown process and stayed in waiting for opponent mode
			match.clients.add(socket);

			// determine which side this player will be assigned to before calling addPlayerToMatch
			const playerSide = !match.players.left ? "left" : "right";

			socket.send(
				buildPayload("match-assigned", {
					matchId: match.id,
					playerSide: playerSide,
				})
			);

			socket.send(buildPayload("state", match.state));

			// if the match is not full yet, send "waiting" message to all clients
			if (!checkMatchFull(match)) {
				for (const client of match.clients) {
					client.send(buildPayload("waiting", undefined));
				}
			}

			// add player to match (this may trigger countdown if match becomes full)
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
		// ANDY: added this part to ensure that in the second round of the tournament the sides are correctly assigned to the players
		// Find which match this player will join and determine their side BEFORE adding them
		let playerSide: "left" | "right" = "left";
		const matches = tournament.matches.get(tournament.state.round);
		// scan the matches to find one with an open slot and then determine the side the player will be assigned to
		if (matches) {
			for (const m of matches) {
				if (!m.players.left || !m.players.right) {
					// this is the match the player will join
					playerSide = !m.players.left ? "left" : "right";
					console.log(`[WS] Player ${payload.username} will be assigned to match ${m.id} as ${playerSide}`);
					break;
				}
			}
		}
		
		const match = addPlayerToTournament(tournament, socket.username, socket);
		if (match) {
			match.clients.add(socket);
			// ANDY: store reference for Round 2 reassignment so we can pick a socket up after a match is over and drop it into the next match
			socket.currentTournamentMatch = match; // track wich match the socket belongs to
			socket.tournamentId = tournament.id; // tracks the tournament this socket belongs to

			socket.send(
				buildPayload("match-assigned", {
					matchId: match.id,
					playerSide: playerSide,
					tournamentMatchType: match.tournament?.type,
					round: tournament.state.round,
				} as any)
			);

			socket.send(buildPayload("state", match.state));
            // ANDY: for tournaments using socket.currentMatch which will be updated between rounds
			// wrapper ensures every incoming message (player input, reset, etc.) is routed to whichever match the socket is currently assigned to
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
