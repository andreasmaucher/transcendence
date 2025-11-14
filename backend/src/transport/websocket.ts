import { RawData } from "ws";
import type { FastifyInstance } from "fastify";
import { buildStatePayload } from "./broadcaster.js";
import { parseCookies, verifySessionToken } from "../auth/session.js";
import { getOrCreateSingleGame } from "../managers/singleGameManager.js";
import { getOrCreateTournament, addPlayerToTournament } from "../managers/tournamentManager.js";
import { addPlayerToMatch, checkMatchFull } from "../managers/matchManager.js";
import { resetMatchState } from "../game/state.js";
import { Match, PaddleSide } from "../types/match.js";
import { addUserOnline, removeUserOnline } from "../user/online.js";

function authenticateWebSocket(request: any, socket: any) {
	const cookies = parseCookies(request.headers.cookie);
	const sid = cookies["sid"];
	const payload = verifySessionToken(sid);
	if (!payload) {
		try {
			socket.close(4401, "Unauthorized");
		} catch {}
		return null;
	}
	return payload;
}

export function registerWebsocketRoute(fastify: FastifyInstance) {
	// Register user socket
	fastify.get("/api/user/ws", { websocket: true }, (request: any, socket: any) => {
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

			if (singleGameId == "default")
				console.log(`[WS] Websocket for LocalSingleGame: ${singleGameId} and User: ${payload.username} registered`);
			else
				console.log(`[WS] Websocket for LocalSingleGame: ${singleGameId} and User: ${payload.username} connected`);

			const singleGame = getOrCreateSingleGame(singleGameId, payload.username, "local");
			const match: Match = singleGame.match;
			socket.username = payload.username;
			match.clients.add(socket);

			socket.send(JSON.stringify(buildStatePayload(match)));

			socket.on("message", (raw: RawData) => {
				let msg;
				try {
					msg = JSON.parse(raw.toString());
				} catch {
					return;
				}

				if (msg.type === "input") {
					const dir = msg.direction === "up" ? -1 : msg.direction === "down" ? 1 : 0;
					match.inputs[msg.paddle as PaddleSide] = dir;
				} else if (msg.type === "reset") {
					resetMatchState(match);
				}
			});

			socket.on("close", () => match.clients.delete(socket));
			socket.on("error", (err: any) => console.error(`[ws error] match=${match.id}`, err));
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

			const singleGame = getOrCreateSingleGame(singleGameId, payload.username, "remote");
			const match: Match = singleGame.match;
			socket.username = payload.username;
			if (!checkMatchFull(match)) {
				addPlayerToMatch(match, socket.username);

				match.clients.add(socket);

				socket.send(
					JSON.stringify({
						type: "match-assigned",
						matchId: match.id,
						playerSide: match.players.left === payload.username ? "left" : "right",
					})
				);

				socket.send(JSON.stringify(buildStatePayload(match)));

				socket.on("message", (raw: RawData) => {
					let msg;
					try {
						msg = JSON.parse(raw.toString());
					} catch {
						return;
					}

					if (msg.type === "input") {
						const dir = msg.direction === "up" ? -1 : msg.direction === "down" ? 1 : 0;
						match.inputs[msg.paddle as PaddleSide] = dir;
					} else if (msg.type === "reset") {
						resetMatchState(match);
					}
				});
				socket.on("close", () => match.clients.delete(socket));
				socket.on("error", (err: any) => console.error(`[ws error] match=${match.id}`, err));
			} else {
				console.log("[WS] Match already full");
				socket.close(1008, "Match is already full");
			}
		}
	);

	// Register/connect to a tournament
	fastify.get<{ Params: { id: string } }>(
		"/api/tournament/:id/ws",
		{ websocket: true },
		(socket: any, request: any) => {
			const payload = authenticateWebSocket(request, socket);
			if (!payload) return;

			const tournamentId = request.params.id;
			if (!tournamentId) {
				socket.close(1011, "Tournament id missing");
				return;
			}

			if (tournamentId == "default")
				console.log(`[WS] Websocket for Tournament: ${tournamentId} and User: ${payload.username} registered`);
			else console.log(`[WS] Websocket for Tournament: ${tournamentId} and User: ${payload.username} connected`);

			const tournament = getOrCreateTournament(tournamentId);
			const match = addPlayerToTournament(tournament, socket.username);
			if (match) {
				socket.username = payload.username;

				match.clients.add(socket);

				socket.send(
					JSON.stringify({
						type: "match-assigned",
						matchId: match.id,
						playerSide: match.players.left === payload.username ? "left" : "right",
					})
				);

				socket.send(JSON.stringify(buildStatePayload(match)));

				socket.on("message", (raw: RawData) => {
					let msg;
					try {
						msg = JSON.parse(raw.toString());
					} catch {
						return;
					}

					if (msg.type === "input") {
						const dir = msg.direction === "up" ? -1 : msg.direction === "down" ? 1 : 0;
						match.inputs[msg.paddle as PaddleSide] = dir;
					} else if (msg.type === "reset") {
						resetMatchState(match);
					}
				});

				socket.on("close", () => match.clients.delete(socket));
				socket.on("error", (err: any) => console.error(`[ws error] match=${match.id}`, err));
			} else {
				console.log(`[WS] Tournament ${tournament.id} is already full`);
				socket.close(1008, "Tournament is already full");
			}
		}
	);
}
