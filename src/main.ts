// Backend-controlled Pong viewer. The frontend now renders the game state pushed
// over a WebSocket connection from the backend while sending paddle input
// commands back to the server.

import {
  WIDTH,
  HEIGHT,
  PADDLE_W,
  PADDLE_H,
  PADDLE_SPEED,
  BALL_R,
  PADDLE_MARGIN,
  COLOR_BACKGROUND,
  COLOR_CENTERLINE,
  COLOR_PADDLE_BALL_LIGHT,
  COLOR_SCORE,
  FONT_SCORE,
} from "./constants";

const API_BASE = "http://localhost:4000";
const WS_PORT = Number(
  new URLSearchParams(window.location.search).get("wsPort") ?? 4000
);
const WS_PROTOCOL = window.location.protocol === "https:" ? "wss" : "ws";
const WS_HOST =
  new URLSearchParams(window.location.search).get("wsHost") ??
  window.location.hostname;
const ROOM_ID =
  new URLSearchParams(window.location.search).get("roomId") ?? "default";
let WINNING_SCORE = 11;

async function fetchConfig(): Promise<{ winningScore: number }> {
  try {
    const res = await fetch(`${API_BASE}/api/config`, { credentials: "omit" });
    if (!res.ok) throw new Error("config fetch failed");
    const data = await res.json();
    const score =
      typeof data?.winningScore === "number" ? data.winningScore : 11;
    return { winningScore: score };
  } catch {
    return { winningScore: 11 };
  }
}

type PaddleSide = "left" | "right";
type Direction = "up" | "down" | "stop";

type Paddle = { x: number; y: number; w: number; h: number; speed: number };
type Ball = { x: number; y: number; vx: number; vy: number; r: number };

type State = {
  width: number;
  height: number;
  left: Paddle;
  right: Paddle;
  ball: Ball;
  scoreL: number;
  scoreR: number;
  gameOver: boolean;
  winner: "left" | "right" | null;
  winningScore: number;
  tick: number;
};

type BackendStateMessage = {
  type: "state";
  tick: number;
  paddles: { left?: { y: number }; right?: { y: number } };
  ball: { x: number; y: number; vx?: number; vy?: number; r: number };
  score: { left: number; right: number };
  gameOver: boolean;
  winner: "left" | "right" | null;
  winningScore?: number;
};

function createInitialState(): State {
  const centerY = (HEIGHT - PADDLE_H) / 2;
  const left: Paddle = {
    x: PADDLE_MARGIN,
    y: centerY,
    w: PADDLE_W,
    h: PADDLE_H,
    speed: PADDLE_SPEED,
  };
  const right: Paddle = {
    x: WIDTH - PADDLE_MARGIN - PADDLE_W,
    y: centerY,
    w: PADDLE_W,
    h: PADDLE_H,
    speed: PADDLE_SPEED,
  };
  return {
    width: WIDTH,
    height: HEIGHT,
    left,
    right,
    ball: {
      x: WIDTH / 2,
      y: HEIGHT / 2,
      vx: 0,
      vy: 0,
      r: BALL_R,
    },
    scoreL: 0,
    scoreR: 0,
    gameOver: false,
    winner: null,
    winningScore: WINNING_SCORE,
    tick: 0,
  };
}

function clamp(n: number, min: number, max: number): number {
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

function draw(ctx: CanvasRenderingContext2D, s: State): void {
  // wipes all previous pixels in the full canvas area
  ctx.clearRect(0, 0, s.width, s.height);
  ctx.fillStyle = COLOR_BACKGROUND;
  // paints the entire canvas area with the background color
  ctx.fillRect(0, 0, s.width, s.height);

  // this part draws the center line dividing the field in half
  ctx.strokeStyle = COLOR_CENTERLINE;
  ctx.setLineDash([6, 10]);
  ctx.beginPath();
  ctx.moveTo(s.width / 2, 0);
  ctx.lineTo(s.width / 2, s.height);
  ctx.stroke();
  ctx.setLineDash([]);

  // draws the two paddles as filled rectangles
  ctx.fillStyle = COLOR_PADDLE_BALL_LIGHT;
  ctx.fillRect(s.left.x, s.left.y, s.left.w, s.left.h); // left paddle
  ctx.fillRect(s.right.x, s.right.y, s.right.w, s.right.h); // right paddle

  // draws the ball as a circle
  ctx.beginPath();
  ctx.arc(s.ball.x, s.ball.y, s.ball.r, 0, Math.PI * 2);
  ctx.fill();

  // draws the score text near the top
  ctx.fillStyle = COLOR_SCORE;
  ctx.font = FONT_SCORE;
  ctx.fillText(String(s.scoreL), s.width * 0.4, 32);
  ctx.fillText(String(s.scoreR), s.width * 0.6, 32);

  // show winner message if game is over
  if (s.gameOver && s.winner) {
    ctx.fillStyle = "#fbbf24"; // bright yellow for winner text
    ctx.font = "32px system-ui";
    ctx.textAlign = "center";
    const winnerText =
      s.winner === "left" ? "Left Player Wins!" : "Right Player Wins!";
    ctx.fillText(winnerText, s.width / 2, s.height / 2);
    ctx.fillText("Refresh to play again", s.width / 2, s.height / 2 + 40);
    ctx.textAlign = "left"; // reset text alignment
  }
}

let activeSocket: WebSocket | null = null;
const pendingInputs: Array<{ paddle: PaddleSide; direction: Direction }> = [];
const lastSent: Record<PaddleSide, Direction> = { left: "stop", right: "stop" };

function queueInput(paddle: PaddleSide, direction: Direction): void {
  const current = lastSent[paddle];
  if (current === direction && direction !== "stop") return;
  pendingInputs.push({ paddle, direction });
  flushInputs();
}

function flushInputs(): void {
  if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) {
    return;
  }
  while (pendingInputs.length) {
    const cmd = pendingInputs.shift();
    if (!cmd) break;
    lastSent[cmd.paddle] = cmd.direction;
    try {
      activeSocket.send(
        JSON.stringify({
          type: "input",
          paddle: cmd.paddle,
          direction: cmd.direction,
        })
      );
    } catch (err) {
      console.error("failed to send input", err);
      // push command back for retry
      pendingInputs.unshift(cmd);
      break;
    }
  }
}

function applyBackendState(state: State, remote: BackendStateMessage): void {
  const leftY = remote.paddles.left?.y;
  if (typeof leftY === "number") {
    state.left.y = clamp(leftY, 0, state.height - state.left.h);
  }
  const rightY = remote.paddles.right?.y;
  if (typeof rightY === "number") {
    state.right.y = clamp(rightY, 0, state.height - state.right.h);
  }
  state.ball.x = remote.ball.x;
  state.ball.y = remote.ball.y;
  state.ball.vx = remote.ball.vx ?? state.ball.vx;
  state.ball.vy = remote.ball.vy ?? state.ball.vy;
  state.ball.r = remote.ball.r;
  state.scoreL = remote.score.left;
  state.scoreR = remote.score.right;
  state.gameOver = remote.gameOver;
  state.winner = remote.winner;
  if (typeof remote.winningScore === "number") {
    state.winningScore = remote.winningScore;
    WINNING_SCORE = remote.winningScore;
  }
  state.tick = remote.tick;
}

function connectToBackend(state: State): void {
  const wsUrl = `${WS_PROTOCOL}://${WS_HOST}:${WS_PORT}/api/rooms/${ROOM_ID}/ws`;
  const ws = new WebSocket(wsUrl);
  activeSocket = ws;

  ws.addEventListener("open", () => {
    queueInput("left", "stop");
    queueInput("right", "stop");
    flushInputs();
  });

  ws.addEventListener("message", (event) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(String(event.data));
    } catch (err) {
      console.warn("ignoring non-JSON message", err);
      return;
    }
    if (!parsed || typeof parsed !== "object") return;
    const payload = parsed as Partial<BackendStateMessage>;
    if (payload.type === "state" && payload.ball && payload.score) {
      applyBackendState(state, payload as BackendStateMessage);
    }
  });

  ws.addEventListener("close", () => {
    if (activeSocket === ws) {
      activeSocket = null;
    }
    setTimeout(() => connectToBackend(state), 1000);
  });

  ws.addEventListener("error", () => {
    ws.close();
  });
}

function setupInputs(): void {
  addEventListener("keydown", (e) => {
    if (e.key === "w") queueInput("left", "up");
    if (e.key === "s") queueInput("left", "down");
    if (e.key === "ArrowUp") queueInput("right", "up");
    if (e.key === "ArrowDown") queueInput("right", "down");
  });

  addEventListener("keyup", (e) => {
    if (e.key === "w" || e.key === "s") queueInput("left", "stop");
    if (e.key === "ArrowUp" || e.key === "ArrowDown")
      queueInput("right", "stop");
  });

  addEventListener("blur", () => {
    queueInput("left", "stop");
    queueInput("right", "stop");
    flushInputs();
  });
}

function main(): void {
  // Create a canvas and attach it to the page inside the #app container
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const app = document.getElementById("app");
  if (!app) throw new Error("#app not found"); // If the HTML container is missing
  app.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No 2D context"); // Older/unsupported browsers
  const ctx2 = ctx as CanvasRenderingContext2D; // assert non-null after guard

  const state = createInitialState();
  connectToBackend(state);
  setupInputs();

  function frame() {
    draw(ctx2, state);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// Starts the program after loading the server config from the backend
// init() calls fetchConfig() → GET http://localhost:4000/api/config
async function init(): Promise<void> {
  const cfg = await fetchConfig();
  WINNING_SCORE = cfg.winningScore;
  main();
}

init();
