// Backend-controlled Pong viewer. The frontend now renders the game state pushed
// over a WebSocket connection from the backend while sending paddle input
// commands back to the server.

import { type GameConstants } from "./constants";
import { fetchGameConstants } from "./api/http";
import { ensureAuthenticated, renderAuthHeader } from "./auth/ui";
import { WS_PROTOCOL, WS_HOST, WS_PORT, ROOM_ID } from "./config/endpoints";
import { draw } from "./rendering/canvas";
import { applyBackendState, type BackendStateMessage, type State } from "./game/state";
import { setupInputs, setActiveSocket, queueInput, flushInputs } from "./game/input";

// global constants fetched from backend
let GAME_CONSTANTS: GameConstants | null = null;

// Make the initial game state, paddles starting centered
function createInitialState(): State {
  if (!GAME_CONSTANTS) throw new Error("Game constants not loaded");
  const centerY = (GAME_CONSTANTS.fieldHeight - GAME_CONSTANTS.paddleHeight) / 2;
  const left = {
    x: GAME_CONSTANTS.paddleMargin,
    y: centerY,
    w: GAME_CONSTANTS.paddleWidth,
    h: GAME_CONSTANTS.paddleHeight,
    speed: GAME_CONSTANTS.paddleSpeed,
  };
  const right = {
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

// function establishes a WebSocket connection to the backend & sets up event listeners
// also implements autmatic reconnection in case the connection is lost
function connectToBackend(state: State): void {
  // construct the WebSocket URL using the protocol, host, and port + room ID
  const wsUrl = `${WS_PROTOCOL}://${WS_HOST}:${WS_PORT}/api/tournaments/${ROOM_ID}/ws`;
  // create a new WebSocket connection to the backend
  const ws = new WebSocket(wsUrl);
  setActiveSocket(ws); // store the WebSocket connection in the activeSocket variable

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
    setActiveSocket(null);
    // schedule a new connection attempt after a 1 second delay
    setTimeout(() => connectToBackend(state), 1000);
  });

  // Handler: when the WebSocket connection encounters an error
  ws.addEventListener("error", () => {
    ws.close();
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
    await ensureAuthenticated();
    await renderAuthHeader();
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
