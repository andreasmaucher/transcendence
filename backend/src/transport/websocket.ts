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
			}

			addPlayerToMatch(match, socket.username);
			match.clients.add(socket);

			socket.send(
				buildPayload("match-assigned", {
					matchId: match.id,
					playerSide: match.players.left === payload.username ? "left" : "right",
				})
			);

			socket.send(buildPayload("state", match.state));

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
			const match = addPlayerToTournament(tournament, socket.username, socket);
			if (match) {
				match.clients.add(socket);

				socket.send(
					buildPayload("match-assigned", {
						matchId: match.id,
						playerSide: match.players.left === payload.username ? "left" : "right",
					})
				);

				socket.send(buildPayload("state", match.state));

				socket.on("message", (raw: RawData) => handleSocketMessages(raw, match));

				socket.on("close", () => {
					match.clients.delete(socket);
					forfeitMatch(match, socket.username);
				});
				socket.on("error", (err: any) => console.error(`[ws error] match=${match.id}`, err));
			} else {
				console.log(`[WS] Tournament ${tournament.id} is already full`);
				socket.close(1008, "Tournament is already full");
			}
		}
	);
}
