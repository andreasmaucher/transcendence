// Backend server that handles the game logic and websocket connections

import Fastify, { FastifyInstance, FastifyServerOptions } from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import fs from "fs";
import { GAME_CONSTANTS } from "./config/constants.js";
import { stepMatch } from "./game/engine.js";
import { buildPayload, gameBroadcast, userBroadcast } from "./transport/broadcaster.js";
import { registerWebsocketRoute } from "./transport/websocket.js";
import matchRoutes from "./routes/match.js";
import tournamentRoutes from "./routes/tournament.js";
import userRoutes from "./routes/user.js";
import testRoutes from "./routes/test.js";
import oauthRoutes from "./routes/oauth.js";
import { forEachTournament } from "./managers/tournamentManagerHelpers.js";
import { forEachSingleGame } from "./managers/singleGameManager.js";
import { usersOnline, tournaments } from "./config/structures.js";
import singleGameRoutes from "./routes/singleGame.js";
import userManagementRoutes from "./routes/userManagement.js";
import chatRoutes from "./routes/chat.js";
import gamesRoutes from "./routes/games.js";
import { removeUserWS } from "./user/online.js";

function toPlayerInfo(player?: { username: string; displayName?: string } | null) {
	if (!player) return undefined;
	return { username: player.username, displayName: player.displayName };
}

const UPDATE_FPS = GAME_CONSTANTS.UPDATE_FPS;
const useHttps = (process.env.USE_HTTPS ?? "").toLowerCase() === "true";

let fastifyOptions: FastifyServerOptions & { https?: { key: Buffer; cert: Buffer } } = {
	//logger: true,
	logger: false,
};

if (useHttps) {
	const keyPath = process.env.HTTPS_KEY_PATH;
	const certPath = process.env.HTTPS_CERT_PATH;

	if (!keyPath || !certPath) {
		throw new Error("USE_HTTPS is true but HTTPS_KEY_PATH or HTTPS_CERT_PATH is not set");
	}

	fastifyOptions = {
		...fastifyOptions,
		https: {
			key: fs.readFileSync(keyPath),
			cert: fs.readFileSync(certPath),
		},
	};
}
const fastify: FastifyInstance = Fastify(fastifyOptions);

await fastify.register(fastifyWebsocket);

// Expose gameplay constants to the frontend so it can size the canvas, paddles, etc.
fastify.get("/api/constants", async () => {
	return {
		fieldWidth: GAME_CONSTANTS.FIELD_WIDTH,
		fieldHeight: GAME_CONSTANTS.FIELD_HEIGHT,
		paddleWidth: GAME_CONSTANTS.PADDLE_WIDTH,
		paddleHeight: GAME_CONSTANTS.PADDLE_HEIGHT,
		paddleMargin: GAME_CONSTANTS.PADDLE_MARGIN,
		paddleSpeed: GAME_CONSTANTS.PADDLE_SPEED,
		ballRadius: GAME_CONSTANTS.BALL_RADIUS,
		ballSpeed: GAME_CONSTANTS.BALL_SPEED,
		initialBallVyRatio: GAME_CONSTANTS.INITIAL_BALL_VY_RATIO,
		scoreOutMargin: GAME_CONSTANTS.SCORE_OUT_MARGIN,
		winningScore: GAME_CONSTANTS.WINNING_SCORE,
		updateFps: UPDATE_FPS,
	};
});

await fastify.register(userRoutes);
await fastify.register(userManagementRoutes);
await fastify.register(gamesRoutes);
await fastify.register(singleGameRoutes);
await fastify.register(tournamentRoutes);
await fastify.register(matchRoutes);
await fastify.register(testRoutes);
await fastify.register(chatRoutes);
await fastify.register(oauthRoutes);

registerWebsocketRoute(fastify);

let previousTick = process.hrtime.bigint();

// Updates game logic
setInterval(() => {
	const now = process.hrtime.bigint();
	const dt = Number(now - previousTick) / 1e9;
	previousTick = now;
	// Single games loop
	forEachSingleGame((singleGame) => {
		const match = singleGame.match;
		if (match.state.isRunning) {
			stepMatch(match, dt || 1 / UPDATE_FPS);
			gameBroadcast(
				buildPayload("state", {
					...match.state,
					playerLeft: toPlayerInfo(match.players.left),
					playerRight: toPlayerInfo(match.players.right),
				}),
				match
			);
			/*const wasRunning = match.state.isRunning;
		const wasOver = match.state.isOver;

		if (match.state.isRunning) {
			stepMatch(match, dt || 1 / UPDATE_FPS);
		}

		// Broadcast state if game was running (includes the frame when game just ended)
		// The reset delay in messages.ts ensures the final score stays visible
		if (wasRunning || (match.state.isOver && !wasOver)) {
			gameBroadcast(buildPayload("state", match.state), match);*/
		}
	});
	// Tournaments loop
	forEachTournament((tournament) => {
		if (tournament.state.isRunning) {
			const currentRound = tournament.state.round;
			const matches = tournament.matches.get(currentRound);

			if (!matches || matches.length === 0) return;

			for (const match of matches) {
				if (match.state.isRunning) {
					const wasOver = match.state.isOver;
					stepMatch(match, dt || 1 / UPDATE_FPS);
					const statePayload = buildPayload("state", {
						...match.state,
						playerLeft: toPlayerInfo(match.players.left),
						playerRight: toPlayerInfo(match.players.right),
						matchId: match.id, // ANDY: include matchId so frontend knows which match this state belongs to
					});
					
					// Broadcast to match clients (players in this match)
					gameBroadcast(statePayload, match);
					
					// ANDY: When a Round 2 match finishes, also broadcast to ALL tournament players
					// This ensures everyone (including 3rd place players) sees the final result and champion
					if (match.state.isOver && !wasOver && match.tournament && match.tournament.round === 2) {
						const tournament = tournaments.get(match.tournament.id);
						if (tournament) {
							for (const player of tournament.players) {
								if (player.socket && player.socket.readyState === 1) {
									// send state to all tournament players
									player.socket.send(statePayload);
								}
							}
						}
					}
				}
			}
		}
	});
}, 1000 / UPDATE_FPS);

// Ping the frontend to check if user is still online
setInterval(() => {
	for (const [username, user] of usersOnline.entries()) {
		// Iterate the Map
		for (const [socket, isAlive] of user.connections.entries()) {
			// 1. Check if dead
			if (isAlive === false) {
				console.log(`[WS] Killing a frozen tab for ${username}`);
				removeUserWS(username, socket);
				continue;
			}

			// Mark false and Ping
			user.connections.set(socket, false);
			socket.ping();
		}
	}
}, 30000);

export default fastify;
