import { RawData } from "ws";
import type { FastifyInstance } from "fastify";
import crypto from "crypto";
import { buildStatePayload, chatBroadcast } from "./broadcaster.js";
import { parseCookies, verifySessionToken } from "../auth/session.js";
import { getOrCreateSingleGame } from "../managers/singleGameManager.js";
import { getOrCreateTournament, addPlayerToTournament } from "../managers/tournamentManager.js";
import { addPlayerToMatch, checkMatchFull } from "../managers/matchManager.js";
import { resetMatchState } from "../game/state.js";
import { Match, PaddleSide } from "../types/match.js";
import { addUserOnline, removeUserOnline } from "../user/online.js";
import { ChatInboundMessage } from "../chat/types.js";

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
		// listener for #message gets the rawData
        socket.on("message", (message: RawData) => {
			// translate binary into string
            const text = message.toString();
			// creates a payload which is either in the format of the given list (ChatInboundMessage) or set to null
            let payload: ChatInboundMessage | null = null;

			// parses text into JSON and cast it as an ChatINboundMessage
            try {
                payload = JSON.parse(text) as ChatInboundMessage;
            } catch {
                payload = null;
            }

			const sentAt = Date.now();
			const id = crypto.randomUUID();

			// Checks if payload exists, is an object and has a type which is a string; If it's not a defined type, the text will be printed into the chat;
            if (!payload || typeof payload !== "object" || typeof payload.type !== "string") {
                if (!text.trim()) return;
                chatBroadcast(
                    {
                        type: "broadcast",
                        id,
                        sentAt,
                        from: socket.username,
                        body: text,
                    },
                    socket
                );
                return;
            }

            switch (payload.type) {
                case "direct": {
                    if (!isNonEmptyString(payload.to) || !isNonEmptyString(payload.body)) {
                        console.error(`[WS] Invalid direct message payload from ${socket.username}`);
                        return;
                    }
                    chatBroadcast(
                        {
                            type: "direct",
                            id,
                            sentAt,
                            from: socket.username,
                            to: payload.to.trim(),
                            body: payload.body.trim(),
                        },
                        socket
                    );
                    break;
                }
                case "broadcast": {
                    if (!isNonEmptyString(payload.body)) {
                        console.error(`[WS] Empty broadcast from ${socket.username} ignored`);
                        return;
                    }
                    chatBroadcast(
                        {
                            type: "broadcast",
                            id,
                            sentAt,
                            from: socket.username,
                            body: payload.body.trim(),
                        },
                        socket
                    );
                    break;
                }
				case "invite": {
					if (!isNonEmptyString(payload.to) || !isNonEmptyString(payload.gameId)) {
						console.error(`[WS] Invalid invite payload from ${socket.username}`);
						return;
					}
					const inviteMessage =
						typeof payload.message === "string" && payload.message.trim().length
							? payload.message.trim()
							: undefined;
					chatBroadcast(
						{
							type: "invite",
							id,
							sentAt,
							from: socket.username,
							to: payload.to.trim(),
							gameId: payload.gameId.trim(),
							message: inviteMessage,
						},
						socket
					);
					break;
				}
                case "profile-link": {
                    if (!isNonEmptyString(payload.to) || !isNonEmptyString(payload.targetProfile)) {
                        console.error(`[WS] Invalid profile-link payload from ${socket.username}`);
                        return;
                    }
                    chatBroadcast(
                        {
                            type: "profile-link",
                            id,
                            sentAt,
                            from: socket.username,
                            to: payload.to.trim(),
                            targetProfile: payload.targetProfile.trim(),
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
					if (payload.username === socket.username) {
						console.error("Block event: cannot block yourself");
						return;
               		}
					if (!user.blockedUsers) {
                    	user.blockedUsers = new Set<string>();
                	}
                    chatBroadcast(
                        {
                            type: "block",
                            id,
                            sentAt,
                            from: socket.username,
                            to: payload.to.trim(),
                            username: payload.username.trim(),
                        },
                        socket
                    );
					try {
						user.blockedUsers.add(username);
                		console.log(`${socket.username} blocked ${username}`);
					} catch (error) {
                		console.error(`WebSocket BLOCK error for ${socket.username} on socket ${socket}:`, error);
            		}
                    break;
                }
                default: {
                    console.warn(`[WS] Unsupported chat payload type ${(payload as any).type}`);
                }
            }
        });

        socket.on("block", (username: string) => {
            try {
                // Initialize block list if it doesn't exist yet
                if (!user.blockedUsers) {
                    user.blockedUsers = new Set<string>();
                }
                // Validate input: username must be a non-empty string
                if (!isNonEmptyString(username)) {
                    console.error("Block event: username missing");
                    return;
                }
                // Do not allow blocking yourself
                if (username === socket.username) {
                    console.error("Block event: cannot block yourself");
                    return;
                }
                // Add the username to the block list
                user.blockedUsers.add(username);
                console.log(`${socket.username} blocked ${username}`);
            } catch (error) {
                console.error(`WebSocket BLOCK error for ${socket.username} on socket ${socket}:`, error);
            }
        });

        socket.on("unblock", (username: string) => {
            try {
                // Make sure the user even has a block list
                if (!user.blockedUsers) {
                    return;
                }
                // Ensure input is valid
                if (!isNonEmptyString(username)) {
                    console.error("Unblock event: invalid username");
                    return;
                }
                // Only unblock if the username is actually blocked
                if (user.blockedUsers.has(username)) {
                    user.blockedUsers.delete(username);
                    console.log(`${socket.username} unblocked ${username}`);
                }
            } catch (error) {
                console.error(`WebSocket UNBLOCK error for ${socket.username}:`, error);
            }
        });

        socket.on('error', (error: any) => {
            console.error(`WebSocket error for ${socket.username} on socket ${socket}:`, error);
        });

        socket.on("close", () => {
            chatBroadcast({
                type: "broadcast",
                id: crypto.randomUUID(),
                sentAt: Date.now(),
                from: "system",
                body: `User ${socket.username} left`,
            });
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

function isNonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}
