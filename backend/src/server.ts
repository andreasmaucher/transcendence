// backend server that handles the game logic and websocket connections

import Fastify, { FastifyInstance } from "fastify";
import fastifyWebsocket from "@fastify/websocket";
import { RawData, WebSocket } from "ws";
import { GAME_CONSTANTS } from "./config/constants.js";

export type PaddleSide = "left" | "right";
type PaddleInput = -1 | 0 | 1; // -1=up, 0=stop, 1=down

type PaddleState = { y: number };

type BallState = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
};

export type GameState = {
  width: number;
  height: number;
  paddles: Record<PaddleSide, PaddleState>;
  ball: BallState;
  score: Record<PaddleSide, number>;
  tick: number;
  gameOver: boolean;
  winner: PaddleSide | null;
  winningScore: number;
};

export type Room = {
  id: string;
  state: GameState;
  inputs: Record<PaddleSide, PaddleInput>;
  clients: Set<WebSocket>;
};

//! constants file in frontend not needed anymore
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

// global storage for all active game rooms
const rooms = new Map<string, Room>();

export function resetRoomsForTest(): void {
  rooms.clear();
}

const PADDLE_X = {
  left: PADDLE_MARGIN,
  right: FIELD_WIDTH - PADDLE_MARGIN - PADDLE_WIDTH,
};

// creates a fresh game with everything in starting position
function createInitialState(): GameState {
  return {
    width: FIELD_WIDTH,
    height: FIELD_HEIGHT,
    paddles: {
      left: { y: (FIELD_HEIGHT - PADDLE_HEIGHT) / 2 },
      right: { y: (FIELD_HEIGHT - PADDLE_HEIGHT) / 2 },
    },
    ball: {
      x: FIELD_WIDTH / 2,
      y: FIELD_HEIGHT / 2,
      vx: BALL_SPEED,
      vy: BALL_SPEED * INITIAL_BALL_VY_RATIO,
      r: BALL_RADIUS,
    },
    score: { left: 0, right: 0 },
    tick: 0,
    gameOver: false,
    winner: null,
    winningScore: WINNING_SCORE,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// creates a new room if it doesn't exist, otherwise returns the existing room
// each room has game state, player inputs, connected clients
export function getOrCreateRoom(id: string): Room {
  let room = rooms.get(id);
  if (!room) {
    room = {
      id,
      state: createInitialState(),
      inputs: { left: 0, right: 0 },
      clients: new Set(),
    };
    rooms.set(id, room);
  }
  return room;
}

function resetBall(state: GameState, direction: -1 | 1): void {
  state.ball.x = state.width / 2;
  state.ball.y = state.height / 2;
  state.ball.vx = direction * BALL_SPEED;
  state.ball.vy = BALL_SPEED * INITIAL_BALL_VY_RATIO;
}

function applyInput(room: Room, paddle: PaddleSide, input: PaddleInput): void {
  room.inputs[paddle] = input;
}

// checks if someone won and if so stops the game
function maybeCompleteGame(room: Room): void {
  const state = room.state;
  const { score, winningScore } = state;
  if (state.gameOver) return;
  let gameEnded = false;
  if (score.left >= winningScore) {
    state.gameOver = true;
    state.winner = "left";
    gameEnded = true;
  }
  if (score.right >= winningScore) {
    state.gameOver = true;
    state.winner = "right";
    gameEnded = true;
  }
  if (state.gameOver) {
    room.inputs.left = 0;
    room.inputs.right = 0;
    if (gameEnded) {
      console.log(
        `[game] room=${room.id} event=game-over winner=${state.winner ?? "unknown"}`
      );
    }
  }
}

// main game loop that runs 60 times per second
function updateRoom(room: Room, dt: number): void {
  const { state, inputs } = room;
  if (state.gameOver) return;

  const maxPaddleY = state.height - PADDLE_HEIGHT;
  for (const side of ["left", "right"] as const) {
    const paddle = state.paddles[side];
    const input = inputs[side];
    const previousY = paddle.y;
    paddle.y = clamp(paddle.y + input * PADDLE_SPEED * dt, 0, maxPaddleY);
    if (Math.abs(paddle.y - previousY) > 0.001) {
      console.log(
        `[paddle] room=${room.id} paddle=${side} y=${paddle.y.toFixed(1)}`
      );
    }
  }

  const ball = state.ball;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  if (ball.y - ball.r <= 0 && ball.vy < 0) {
    console.log(`[ball] room=${room.id} event=wall-bounce wall=top`);
    ball.vy = Math.abs(ball.vy);
  }
  if (ball.y + ball.r >= state.height && ball.vy > 0) {
    console.log(`[ball] room=${room.id} event=wall-bounce wall=bottom`);
    ball.vy = -Math.abs(ball.vy);
  }

  const hitsLeft =
    ball.vx < 0 &&
    ball.x - ball.r <= PADDLE_X.left + PADDLE_WIDTH &&
    ball.y >= state.paddles.left.y &&
    ball.y <= state.paddles.left.y + PADDLE_HEIGHT;
  const hitsRight =
    ball.vx > 0 &&
    ball.x + ball.r >= PADDLE_X.right &&
    ball.y >= state.paddles.right.y &&
    ball.y <= state.paddles.right.y + PADDLE_HEIGHT;

  if (hitsLeft) {
    console.log(`[ball] room=${room.id} event=paddle-hit paddle=left`);
  }
  if (hitsRight) {
    console.log(`[ball] room=${room.id} event=paddle-hit paddle=right`);
  }

  if (hitsLeft || hitsRight) {
    ball.vx = -ball.vx;
  }

  if (ball.x < -SCORE_OUT_MARGIN) {
    state.score.right += 1;
    console.log(
      `[score] room=${room.id} scorer=right score=${state.score.left}-${state.score.right}`
    );
    maybeCompleteGame(room);
    resetBall(state, 1);
  } else if (ball.x > state.width + SCORE_OUT_MARGIN) {
    state.score.left += 1;
    console.log(
      `[score] room=${room.id} scorer=left score=${state.score.left}-${state.score.right}`
    );
    maybeCompleteGame(room);
    resetBall(state, -1);
  }

  state.tick += 1;
}

export function buildStatePayload(room: Room) {
  const { state } = room;
  return {
    type: "state" as const,
    tick: state.tick,
    paddles: {
      left: { y: state.paddles.left.y },
      right: { y: state.paddles.right.y },
    },
    ball: { ...state.ball },
    score: { ...state.score },
    gameOver: state.gameOver,
    winner: state.winner,
    winningScore: state.winningScore,
  };
}

// sends the current game state to all connected players (clients)
export function broadcast(room: Room): void {
  if (!room.clients.size) return;
  const payload = JSON.stringify(buildStatePayload(room));
  for (const socket of Array.from(room.clients)) {
    if (socket.readyState !== WebSocket.OPEN) {
      room.clients.delete(socket);
      continue;
    }
    try {
      socket.send(payload);
    } catch {
      room.clients.delete(socket);
      try {
        socket.close();
      } catch (err) {
        // ignore secondary close errors if connection is already closed
      }
    }
  }
}

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
    roomId?: string;
    paddle?: PaddleSide;
    direction?: "up" | "down" | "stop";
  };
  if (!roomId || !paddle || !direction) {
    reply.code(400);
    return { error: "roomId, paddle and direction are required" };
  }
  const room = getOrCreateRoom(roomId);
  const input: PaddleInput = direction === "up" ? -1 : direction === "down" ? 1 : 0;
  applyInput(room, paddle, input);
  return { ok: true };
});

fastify.get<{ Params: { id: string } }>("/api/rooms/:id/state", async (request) => {
  const room = getOrCreateRoom(request.params.id);
  return buildStatePayload(room);
});

fastify.get<{ Params: { id: string } }>(
  "/api/rooms/:id/ws",
  { websocket: true },
  (socket, request) => {
    const roomId = request.params.id;
    if (!roomId) {
      try {
        socket.close(1011, "room id missing");
      } catch {
        // ignore close errors
      }
      return;
    }
    const room = getOrCreateRoom(roomId);
    room.clients.add(socket);
    console.log(
      `[client] room=${room.id} event=join ip=${request.ip} clients=${room.clients.size}`
    );
    const payload = JSON.stringify(buildStatePayload(room));
    socket.send(payload, (err) => {
      if (err) {
        request.log.error({ err }, "initial payload send failed");
      }
    });

    socket.on("message", (raw: RawData) => {
      let parsed: unknown;
      try {
        const text = typeof raw === "string" ? raw : raw.toString();
        parsed = JSON.parse(text);
      } catch {
        return;
      }
      if (!parsed || typeof parsed !== "object") return;
      const message = parsed as
        | { type: "input"; paddle: PaddleSide; direction: "up" | "down" | "stop" }
        | { type: "reset" };
      if (message.type === "input") {
        const input: PaddleInput =
          message.direction === "up" ? -1 : message.direction === "down" ? 1 : 0;
        applyInput(room, message.paddle, input);
      } else if (message.type === "reset") {
        room.state = createInitialState();
        room.inputs = { left: 0, right: 0 };
        console.log(`[game] room=${room.id} event=reset`);
      }
    });

    socket.on("close", () => {
      room.clients.delete(socket);
      console.log(
        `[client] room=${room.id} event=leave ip=${request.ip} clients=${room.clients.size}`
      );
    });
  }
);

let previousTick = process.hrtime.bigint();
setInterval(() => {
  const now = process.hrtime.bigint();
  const dt = Number(now - previousTick) / 1e9;
  previousTick = now;
  for (const room of rooms.values()) {
    updateRoom(room, dt || 1 / UPDATE_FPS);
    broadcast(room);
  }
}, 1000 / UPDATE_FPS);

export default fastify;
