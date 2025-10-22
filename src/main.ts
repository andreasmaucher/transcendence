// Backend-controlled Pong viewer. The frontend now renders the game state pushed
// over a WebSocket connection from the backend while sending paddle input
// commands back to the server.

import {
  COLOR_BACKGROUND,
  COLOR_CENTERLINE,
  COLOR_PADDLE_BALL_LIGHT,
  COLOR_SCORE,
  FONT_SCORE,
  type GameConstants,
} from "./constants";

const WS_PORT = Number(
  new URLSearchParams(window.location.search).get("wsPort") ?? 4000
);

// web socket protocol selection (wss if https, ws if http)
const WS_PROTOCOL = window.location.protocol === "https:" ? "wss" : "ws";
// web socket host selection (default to localhost if not specified)
const WS_HOST =
  new URLSearchParams(window.location.search).get("wsHost") ??
  window.location.hostname;
// REST API base is built from the same host/port as WebSocket to avoid mismatches
const API_BASE = `${window.location.protocol === "https:" ? "https" : "http"}://${WS_HOST}:${WS_PORT}`;
// room ID selection (default to "default" if not specified)
const ROOM_ID =
  new URLSearchParams(window.location.search).get("roomId") ?? "default";

  // global constants fetched from backend
let GAME_CONSTANTS: GameConstants | null = null;

async function fetchGameConstants(): Promise<GameConstants> {
  const res = await fetch(`${API_BASE}/api/constants`, { credentials: "omit" });
  if (!res.ok) throw new Error("constants fetch failed");
  const data = await res.json();
  return data as GameConstants;
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

// Make the initial game state, paddles starting centered
function createInitialState(): State {
  if (!GAME_CONSTANTS) throw new Error("Game constants not loaded");
  const centerY = (GAME_CONSTANTS.fieldHeight - GAME_CONSTANTS.paddleHeight) / 2;
  const left: Paddle = {
    x: GAME_CONSTANTS.paddleMargin,
    y: centerY,
    w: GAME_CONSTANTS.paddleWidth,
    h: GAME_CONSTANTS.paddleHeight,
    speed: GAME_CONSTANTS.paddleSpeed,
  };
  const right: Paddle = {
    x: GAME_CONSTANTS.fieldWidth - GAME_CONSTANTS.paddleMargin - GAME_CONSTANTS.paddleWidth,
    y: centerY,
    w: GAME_CONSTANTS.paddleWidth,
    h: GAME_CONSTANTS.paddleHeight,
    speed: GAME_CONSTANTS.paddleSpeed,
  };
  return {
    width: GAME_CONSTANTS.fieldWidth,
    height: GAME_CONSTANTS.fieldHeight,
    left,
    right,
    ball: {
      x: GAME_CONSTANTS.fieldWidth / 2,
      y: GAME_CONSTANTS.fieldHeight / 2,
      vx: 0,
      vy: 0,
      r: GAME_CONSTANTS.ballRadius,
    },
    scoreL: 0,
    scoreR: 0,
    gameOver: false,
    winner: null,
    winningScore: GAME_CONSTANTS.winningScore,
    tick: 0,
  };
}

// Clamp makes sure to keep numbers in between two limits
// Keep value within [min, max]
// Example: clamp(120, 0, 100) -> 100; clamp(-5, 0, 100) -> 0
function clamp(n: number, min: number, max: number): number {
  // If n is below the minimum, snap to min
  if (n < min) return min;
  // If n is above the maximum, snap to max
  if (n > max) return max;
  // Otherwise it is already in range
  return n;
}

// Draw everything (reads state but does not change it, since there is no game logic here)
// function takes in a 2D canvas context ctx and the gurrent game State s
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

// flush the input queue by sending input commands from players to the backend 
function flushInputs(): void {
  // if the socket is not connected or not open, do nothing
  if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) {
    return;
  }
  // loop through the pendingInputs array and send each input command to the backend
  while (pendingInputs.length) {
    const cmd = pendingInputs.shift(); // shift() removes and returns the first item from the array
    if (!cmd) break;
    lastSent[cmd.paddle] = cmd.direction; // update the last sent direction for this paddle
    // try to send the input command to the backend
    try {
      activeSocket.send(
        JSON.stringify({
          type: "input",
          paddle: cmd.paddle,
          direction: cmd.direction,
        })
      );
    } 
    //! TODO: if this retry design is still needed in the future, add MAX_RETRIES to avoid infinite retries
    // if the input command fails to send, log an error and push the command back to the front of the queue for retry
    catch (err) { 
      console.error("failed to send input", err);
      // push command back to the front of the queue for retry
      pendingInputs.unshift(cmd);
      break;
    }
  }
}

// apply the backend state to the local frontend game state
function applyBackendState(state: State, remote: BackendStateMessage): void {
  // update the left paddle's y position
  const leftY = remote.paddles.left?.y;
  if (typeof leftY === "number") {
    state.left.y = clamp(leftY, 0, state.height - state.left.h);
  }
  // update the right paddle's y position
  const rightY = remote.paddles.right?.y;
  if (typeof rightY === "number") {
    state.right.y = clamp(rightY, 0, state.height - state.right.h);
  }
  // ball state updates
  state.ball.x = remote.ball.x;
  state.ball.y = remote.ball.y;
  state.ball.vx = remote.ball.vx ?? state.ball.vx;
  state.ball.vy = remote.ball.vy ?? state.ball.vy;
  state.ball.r = remote.ball.r;
  // game state updates
  state.scoreL = remote.score.left;
  state.scoreR = remote.score.right;
  state.gameOver = remote.gameOver;
  state.winner = remote.winner;
  //! ANDY: do we really need this case? when will the winning score change in our game?
  if (typeof remote.winningScore === "number") {
    state.winningScore = remote.winningScore;
  }
  // update the tick counter to the latest tick from the backend (helps with syncing the game state)
  state.tick = remote.tick;
}

// function establishes a WebSocket connection to the backend & sets up event listeners
// also implements autmatic reconnection in case the connection is lost
function connectToBackend(state: State): void {
  // construct the WebSocket URL using the protocol, host, and port + room ID
  const wsUrl = `${WS_PROTOCOL}://${WS_HOST}:${WS_PORT}/api/rooms/${ROOM_ID}/ws`;
  // create a new WebSocket connection to the backend
  const ws = new WebSocket(wsUrl);
  activeSocket = ws; // store the WebSocket connection in the activeSocket variable

  // Handler: when the WebSocket connection is opened
  ws.addEventListener("open", () => {
    // Reset game to fresh state on connection
    ws.send(JSON.stringify({ type: "reset" }));
    
    // stop the paddles from moving when the connection is established
    queueInput("left", "stop");
    queueInput("right", "stop");
    flushInputs(); // sends any queued input commands to the backend
  });

  // Handler: when the WebSocket connection receives a message
  ws.addEventListener("message", (event) => {
    let parsed: unknown;
    // try to parse the message as JSON
    try {
      parsed = JSON.parse(String(event.data));
    } catch (err) {
      console.warn("ignoring non-JSON message", err);
      return;
    }
    // if the message is not valid JSON or not an object, ignore it
    if (!parsed || typeof parsed !== "object") return;
    const payload = parsed as Partial<BackendStateMessage>;
    // if the message is a state message and has the required fields, apply the backend state to the local frontend game state
    if (payload.type === "state" && payload.ball && payload.score) {
      applyBackendState(state, payload as BackendStateMessage);
    }
  });

  // Handler: when the WebSocket connection is closed
  ws.addEventListener("close", () => {
    if (activeSocket === ws) {
      activeSocket = null;
    }
    // schedule a new connection attempt after a 1 second delay
    setTimeout(() => connectToBackend(state), 1000);
  });

  // Handler: when the WebSocket connection encounters an error
  ws.addEventListener("error", () => {
    ws.close();
  });
}

// sets up event listeners to capture keyboard input and convert it into movements
function setupInputs(): void {
  // when a key is pressed down
  addEventListener("keydown", (e) => {
    if (e.key === "w") queueInput("left", "up");
    if (e.key === "s") queueInput("left", "down");
    if (e.key === "ArrowUp") queueInput("right", "up");
    if (e.key === "ArrowDown") queueInput("right", "down");
  });

  // when a key is released
  addEventListener("keyup", (e) => {
    if (e.key === "w" || e.key === "s") queueInput("left", "stop");
    if (e.key === "ArrowUp" || e.key === "ArrowDown")
      queueInput("right", "stop");
  });
}

// create the game canvas, connect to backend, set up controls and start rendering loop
function main(): void {
  if (!GAME_CONSTANTS) throw new Error("Game constants not loaded");
  // Create a canvas and attach it to the page inside the app container
  const canvas = document.createElement("canvas");
  canvas.width = GAME_CONSTANTS.fieldWidth;
  canvas.height = GAME_CONSTANTS.fieldHeight;
  const app = document.getElementById("app");
  if (!app) throw new Error("#app not found"); // if the HTML container is missing
  app.appendChild(canvas);
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

  const state = createInitialState();
  connectToBackend(state);
  setupInputs();

  function frame() {
    draw(ctx, state); // draw the current game state to the canvas
    requestAnimationFrame(frame); // request the next frame
  }
  requestAnimationFrame(frame);
}

// Starts the program after loading the server config from the backend
// init() calls fetchConfig() → GET http://localhost:4000/api/config
async function init(): Promise<void> {
  try {
    const constants = await fetchGameConstants();
    GAME_CONSTANTS = constants;
    main();
  } catch (err) {
    console.error("Failed to initialize game", err);
    const app = document.getElementById("app");
    if (app) {
      app.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;font-family:system-ui;color:#ef4444;text-align:center;padding:2rem;">
          <h1 style="font-size:2rem;margin-bottom:1rem;">Connection Error</h1>
          <p style="font-size:1.1rem;margin-bottom:0.5rem;">Unable to reach backend.</p>
          <button onclick="location.reload()" style="background:#3b82f6;color:#fff;border:none;padding:0.6rem 1.1rem;border-radius:0.5rem;font-size:1rem;cursor:pointer;">Retry</button>
        </div>`;
    }
  }
}

init();
