// backend server that handles the game logic and websocket connections

import Fastify, { FastifyInstance } from "fastify";
import fastifyWebsocket from "@fastify/websocket";
// import { WebSocket } from "ws";
import { GAME_CONSTANTS } from "./config/constants.js";
// import { createInitialState } from "./game/state.js";
import { updateRoom } from "./game/engine.js";
import { getOrCreateRoom, forEachRoom } from "./game/roomManager.js";
import { buildStatePayload, broadcast } from "./transport/broadcaster.js";
import { registerWebsocketRoute } from "./transport/websocket.js";

export type PaddleSide = "left" | "right";
type PaddleInput = -1 | 0 | 1; // -1=up, 0=stop, 1=down

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
  const { roomId, paddle, direction } = request.body as {
    roomId: string;
    paddle: PaddleSide;
    direction: "up" | "down" | "stop";
  };
  if (!roomId || !paddle || !direction) {
    reply.code(400);
    return { error: "roomId, paddle and direction are required" };
  }
  const room = getOrCreateRoom(roomId);
  const input: PaddleInput =
    direction === "up" ? -1 : direction === "down" ? 1 : 0;
  room.inputs[paddle] = input;
  return { ok: true };
});

fastify.get<{ Params: { id: string } }>(
  "/api/rooms/:id/state",
  async (request) => {
    const room = getOrCreateRoom(request.params.id);
    return buildStatePayload(room);
  }
);

registerWebsocketRoute(fastify);

let previousTick = process.hrtime.bigint();
setInterval(() => {
  const now = process.hrtime.bigint();
  const dt = Number(now - previousTick) / 1e9;
  previousTick = now;
  forEachRoom((room) => {
    updateRoom(room, dt || 1 / UPDATE_FPS);
    broadcast(room);
  });
}, 1000 / UPDATE_FPS);

export default fastify;
