// backend server that handles the game logic and websocket connections

import Fastify, { FastifyInstance } from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import { GAME_CONSTANTS } from "./config/constants.js";
import { stepMatch } from "./game/engine.js";
import { broadcast } from "./transport/broadcaster.js";
import { registerWebsocketRoute } from "./transport/websocket.js";
import matchRoutes from "./routes/match.js";
import tournamentRoutes from "./routes/tournament.js";
import userRoutes from "./routes/user.js";
import testRoutes from "./routes/test.js";
import { getTournament } from "./managers/tournamentManagerHelpers.js";
import { forEachSingleGame } from "./managers/singleGameManager.js";
import { PaddleSide } from "./types/match.js";
import { usersOnline } from "./config/structures.js";
import { removeUserOnline } from "./user/online.js";

const FIELD_WIDTH = GAME_CONSTANTS.FIELD_WIDTH;
const FIELD_HEIGHT = GAME_CONSTANTS.FIELD_HEIGHT;
const PADDLE_WIDTH = GAME_CONSTANTS.PADDLE_WIDTH;
const PADDLE_HEIGHT = GAME_CONSTANTS.PADDLE_HEIGHT;
const PADDLE_MARGIN = GAME_CONSTANTS.PADDLE_MARGIN;
const PADDLE_SPEED = GAME_CONSTANTS.PADDLE_SPEED;
const BALL_RADIUS = GAME_CONSTANTS.BALL_RADIUS;
const BALL_SPEED = GAME_CONSTANTS.BALL_SPEED;
const INITIAL_BALL_VY_RATIO = GAME_CONSTANTS.INITIAL_BALL_VY_RATIO;
const SCORE_OUT_MARGIN = GAME_CONSTANTS.SCORE_OUT_MARGIN;
const WINNING_SCORE = GAME_CONSTANTS.WINNING_SCORE;
const UPDATE_FPS = GAME_CONSTANTS.UPDATE_FPS;

const fastify: FastifyInstance = Fastify({ logger: true });

await fastify.register(fastifyWebsocket);

fastify.get("/api/health", async () => ({ ok: true }));

// Expose gameplay constants to the frontend so it can size the canvas, paddles, etc.
fastify.get("/api/constants", async () => ({
	fieldWidth: FIELD_WIDTH,
	fieldHeight: FIELD_HEIGHT,
	paddleWidth: PADDLE_WIDTH,
	paddleHeight: PADDLE_HEIGHT,
	paddleMargin: PADDLE_MARGIN,
	paddleSpeed: PADDLE_SPEED,
	ballRadius: BALL_RADIUS,
	ballSpeed: BALL_SPEED,
	initialBallVyRatio: INITIAL_BALL_VY_RATIO,
	scoreOutMargin: SCORE_OUT_MARGIN,
	winningScore: WINNING_SCORE,
	updateFps: UPDATE_FPS,
}));

fastify.post("/api/control", async (request, reply) => {
	const { tournamentId, singleGameId, paddle, direction } = request.body as {
		tournamentId?: string;
		singleGameId?: string;
		paddle?: PaddleSide;
		direction?: "up" | "down" | "stop";
	};
	if (!tournamentId || !paddle || !direction) {
		reply.code(400);
		return { error: "tournamentId, paddle and direction are required" };
	}

	// const tournament = getTournament(tournamentId);
	// if (tournament) {
	// 	const input: PaddleInput = direction === "up" ? -1 : direction === "down" ? 1 : 0;
	// 	tournament.matches[0].inputs[paddle] = input; // hardcoded first match for now
	// 	return { ok: true };
	// } else return { ok: false };
});

fastify.get<{ Params: { id: string } }>("/api/tournaments/:id/state", async (request) => {
	const tournament = getTournament(request.params.id);
	//if (tournament) return buildStatePayload(tournament.matches[0]); // hardcoded first match for now
	//else return null;
});

await fastify.register(matchRoutes);
await fastify.register(tournamentRoutes);
await fastify.register(userRoutes);
await fastify.register(testRoutes);

registerWebsocketRoute(fastify);

let previousTick = process.hrtime.bigint();

// Updates game logic
setInterval(() => {
	const now = process.hrtime.bigint();
	const dt = Number(now - previousTick) / 1e9;
	previousTick = now;
	// forEachTournament((tournament) => {
	// 	stepMatch(tournament.matches[0], dt || 1 / UPDATE_FPS); // hardcoded first match for now
	// 	broadcast(tournament.matches[0]);
	// });
	forEachSingleGame((singleGame) => {
		const match = singleGame.match;
		stepMatch(match, dt || 1 / UPDATE_FPS);
		broadcast(match);
	});
}, 1000 / UPDATE_FPS);

// Ping the frontend to check if user is still online
setInterval(() => {
	// Loop through all the online users
	for (const [username, user] of usersOnline.entries()) {
		const socket = user.socket;

		// If socket is already not alive terminates it
		if (socket.isAlive === false) {
			console.log(`[WS] Socket of ${username} timed out`);
			socket.terminate();
			removeUserOnline(username);
			continue;
		}

		socket.isAlive = false;
		try {
			socket.ping();
		} catch {
			removeUserOnline(username);
		}
	}
}, 30000);

export default fastify;
