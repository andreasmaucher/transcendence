import { RawData } from "ws";
import type { FastifyInstance } from "fastify";
import crypto from "crypto";
import { buildPayload, chatBroadcast } from "./broadcaster.js";
import { parseCookies, verifySessionToken } from "../auth/session.js";
import { getOrCreateSingleGame } from "../managers/singleGameManager.js";
import { getOrCreateTournament, addPlayerToTournament } from "../managers/tournamentManager.js";
import { addPlayerToMatch, checkMatchFull, forfeitMatch, startMatch } from "../managers/matchManager.js";
import { Match } from "../types/match.js";
import { addUserOnline, getAllOnlineUsers, removeUserOnline } from "../user/online.js";
import { handleSocketMessages } from "./messages.js";
import { populateMessage, isNonEmptyString, getOnlineUserList } from "../chat/handler.js";
import { addMessageDB } from "../database/messages/setters.js";
import { Message } from "../types/chat.js";
import { User } from "../types/user.js";


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

		// Send ChatHistory with Timeout
		setTimeout(() => {
			socket.send(JSON.stringify(populateMessage({
				type: "init",
				sender: socket.username
			})));
			chatBroadcast(populateMessage({type: "onlineUser"}));
	 	}, 20);

		// Client responds to ping with pong automatically
		socket.on("pong", () => {
			user.isAlive = true;
		});

		// Adds the User to the OnlineList
		chatBroadcast(populateMessage({type: "onlineUser"}));

		// listener for #message gets the rawData
		socket.on("message", (message: RawData) => {
			// translate binary into string
			const text = message.toString();

			let payload: any;

			// parses text into JSON and cast it as an ChatINboundMessage
			try {
				payload = JSON.parse(text);
			} catch {
				console.error(`[WS] Not able to parse text to JSON`);
				return;
			}

			const parsedMessage = populateMessage(payload);
			addMessageDB(parsedMessage);

			console.log("Message received: ", parsedMessage.content);
			
			switch (parsedMessage.type) {
				case "direct": {
					if (!isNonEmptyString(parsedMessage.receiver) || !isNonEmptyString(parsedMessage.content)) {
						console.error(`[WS] Invalid direct message from ${socket.username}`);
						return;
					}
					chatBroadcast(
						parsedMessage,
						socket
					);
					break;
				}
				case "broadcast": {
					if (!isNonEmptyString(parsedMessage.content)) {
						console.error(`[WS] Empty broadcast from ${socket.username} ignored`);
						return;
					}
					chatBroadcast(
						parsedMessage,
						socket
					);
					break;
				}/*
				case "invite": {
					if (!isNonEmptyString(parsedMessage.receiver) || !isNonEmptyString(parsedMessage.gameId)) {
						console.error(`[WS] Invalid invite payload from ${socket.username}`);
						return;
					}
					const inviteMessage =
						typeof parsedMessage.content === "string" && parsedMessage.content.trim().length
							? parsedMessage.content.trim()
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
					if (!isNonEmptyString(parsedMessage.receiver) || !isNonEmptyString(parsedMessage.content)) {
						console.error(`[WS] Invalid profile-link payload from ${socket.username}`);
						return;
					}
					chatBroadcast(
						{
							type: parsedMessage.type,
							id: id,
							sentAt: sentAt,
							from: socket.username,
							to: parsedMessage.receiver.trim(),
							targetProfile: parsedMessage.content.trim(),
						},
						socket
					);
					break;
				}
				case "block": {
					if (!isNonEmptyString(parsedMessage.username)) {
						console.error(`[WS] Invalid block payload from ${socket.username}`);
						return;
					}
					if (parsedMessage.username.trim() === socket.username) {
						console.error("Block event: cannot block yourself");
						return;
					}
					if (!user.blockedUsers) {
						user.blockedUsers = new Set<string>();
					}
					chatBroadcast(
						{
							type: parsedMessage.type,
							id: id,
							sentAt: sentAt,
							from: socket.username,
							username: parsedMessage.username.trim(),
						},
						socket
					);
					try {
						user.blockedUsers.add(parsedMessage.username);
						console.log(`${socket.username} blocked ${parsedMessage.username}`);
					} catch (error) {
						console.error(`WebSocket BLOCK error for ${socket.username} on socket ${socket}:`, error);
					}
					break;
				}
				case "unblock": {
					if (!isNonEmptyString(parsedMessage.username)) {
						console.error(`[WS] Invalid block payload from ${socket.username}`);
						return;
					}
					if (!user.blockedUsers) {
						user.blockedUsers = new Set<string>();
					}
					chatBroadcast(
						{
							type: parsedMessage.type,
							id: id,
							sentAt: sentAt,
							from: socket.username,
							username: parsedMessage.username.trim(),
						},
						socket
					);
					try {
						if (user.blockedUsers.has(parsedMessage.username)) {
							user.blockedUsers.delete(parsedMessage.username);
							console.log(`${socket.username} unblocked ${parsedMessage.username}`);
						}
					} catch (error) {
						console.error(`WebSocket UNBLOCK error for ${socket.username} on socket ${socket}:`, error);
					}
					break;
				}*/
				default: {
					console.warn(`[WS] Unsupported chat payload type ${(parsedMessage as any).type}`);
				}
			}
		});

		socket.on("error", (error: any) => {
			console.error(`WebSocket error for ${socket.username} on socket ${socket}:`, error);
		});

		socket.on("close", () => {
			removeUserOnline(socket.username);
			chatBroadcast(populateMessage({type: "onlineUser"}));
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
