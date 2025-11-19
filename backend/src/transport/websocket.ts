import { RawData } from "ws";
import type { FastifyInstance } from "fastify";
import crypto from "crypto";
import { buildPayload, buildStatePayload, chatBroadcast } from "./broadcaster.js";
import { parseCookies, verifySessionToken } from "../auth/session.js";
import { getOrCreateSingleGame } from "../managers/singleGameManager.js";
import { getOrCreateTournament, addPlayerToTournament } from "../managers/tournamentManager.js";
import { addPlayerToMatch, checkMatchFull, forfeitMatch, startMatch } from "../managers/matchManager.js";
import { Match } from "../types/match.js";
import { addUserOnline, removeUserOnline } from "../user/online.js";
import { Message } from "../chat/types.js";
import { handleSocketMessages } from "./messages.js";

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
		// listener for #message gets the rawData
		socket.on("message", (message: RawData) => {
			// translate binary into string
			const text = message.toString();
			
			let payload: any;

			// parses text into JSON and cast it as an ChatINboundMessage
			try {
				payload  = JSON.parse(text);
			} catch {
				console.error(`[WS] Not able to parse text to JSON`);
				return;
			}

			if (!isMessage(payload)) {
				console.error(`[WS] Not able to parse JSON to Message`);
				return;
			}

			const sentAt = Date.now();
			const id = crypto.randomUUID(); // Move to frontend

			console.log("Message received: ", payload.content);

			/* switch (payload.type) {
				case "direct": {
					if (!isNonEmptyString(payload.receiver) || !isNonEmptyString(payload.content)) {
						console.error(`[WS] Invalid direct message payload from ${socket.username}`);
						return;
					}
					console.log("Message received: ", payload.content);
					chatBroadcast(
						{
							type: payload.type,
							id: id,
							sentAt: sentAt,
							from: payload.sender,
							to: payload.receiver,
							body,
						},
						socket
					);
					break;
				}
				case "broadcast": {
					if (!isNonEmptyString(payload.content)) {
						console.error(`[WS] Empty broadcast from ${socket.username} ignored`);
						return;
					}
					chatBroadcast(
						{
							type,
							id: id,
							sentAt: sentAt,
							sender,
							content
						},
						socket
					);
					break;
				}
				case "invite": {
					if (!isNonEmptyString(payload.receiver) || !isNonEmptyString(payload.gameId)) {
						console.error(`[WS] Invalid invite payload from ${socket.username}`);
						return;
					}
					const inviteMessage =
						typeof payload.content === "string" && payload.content.trim().length
							? payload.content.trim()
							: undefined;
					chatBroadcast(
						{
							type,
							id: id,
							sentAt: sentAt,
							sender,
							receiver,
							gameId,
							content: inviteMessage,
						},
						socket
					);
					break;
				}
				case "profile-link": {
					if (!isNonEmptyString(payload.receiver) || !isNonEmptyString(payload.content)) {
						console.error(`[WS] Invalid profile-link payload from ${socket.username}`);
						return;
					}
					chatBroadcast(
						{
							type: payload.type,
							id: id,
							sentAt: sentAt,
							from: socket.username,
							to: payload.receiver.trim(),
							targetProfile: payload.content.trim(),
						},
						socket
					);
					break;
				}
				case "block": {
					if (!isNonEmptyString(payload.username)) {
						console.error(`[WS] Invalid block payload from ${socket.username}`);
						return;
					}
					if (payload.username.trim() === socket.username) {
						console.error("Block event: cannot block yourself");
						return;
					}
					if (!user.blockedUsers) {
						user.blockedUsers = new Set<string>();
					}
					chatBroadcast(
						{
							type: payload.type,
							id: id,
							sentAt: sentAt,
							from: socket.username,
							username: payload.username.trim(),
						},
						socket
					);
					try {
						user.blockedUsers.add(payload.username);
						console.log(`${socket.username} blocked ${payload.username}`);
					} catch (error) {
						console.error(`WebSocket BLOCK error for ${socket.username} on socket ${socket}:`, error);
					}
					break;
				}
				case "unblock": {
					if (!isNonEmptyString(payload.username)) {
						console.error(`[WS] Invalid block payload from ${socket.username}`);
						return;
					}
					if (!user.blockedUsers) {
						user.blockedUsers = new Set<string>();
					}
					chatBroadcast(
						{
							type: payload.type,
							id: id,
							sentAt: sentAt,
							from: socket.username,
							username: payload.username.trim(),
						},
						socket
					);
					try {
						if (user.blockedUsers.has(payload.username)) {
							user.blockedUsers.delete(payload.username);
							console.log(`${socket.username} unblocked ${payload.username}`);
						}
					} catch (error) {
						console.error(`WebSocket UNBLOCK error for ${socket.username} on socket ${socket}:`, error);
					}
					break;
				}
				default: {
					console.warn(`[WS] Unsupported chat payload type ${(payload as any).type}`);
				}*/
		}); 

		socket.on('error', (error: any) => {
			console.error(`WebSocket error for ${socket.username} on socket ${socket}:`, error);
		});

		socket.on("close", () => {
			/* chatBroadcast({
				type: "broadcast",
				id: crypto.randomUUID(),
				sentAt: Date.now(),
				from: "system",
				body: `User ${socket.username} left`,
			}); */
			removeUserOnline(socket.username);
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

function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

function isMessage(value: unknown): value is Message {
  if (!value || typeof value !== "object") 
		return false;
  const v = value as Record<string, unknown>;
  const fields =
    typeof v.type === "string" &&
    ["direct","broadcast","invite","tournament","profile-link","block","unblock"].includes(v.type) &&
    typeof v.id === "string" &&
    typeof v.sender === "string" &&
    typeof v.sentAt === "number" &&
    (v.receiver === undefined || typeof v.receiver === "string") &&
    (v.content === undefined || typeof v.content === "string") &&
    (v.gameId === undefined || typeof v.gameId === "string");

  return fields;
}
