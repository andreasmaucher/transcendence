// Backend-controlled Pong viewer. The frontend now renders the game state pushed
// over a WebSocket connection from the backend while sending paddle input
// commands back to the server.

import { type GameConstants } from "./constants";
import { fetchGameConstants, fetchMe, registerUser, loginUser } from "./api/http";
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

// Renders a minimal authentication UI. Returns a promise that resolves
// once the user is authenticated.
async function ensureAuthenticated(): Promise<void> {
  const app = document.getElementById("app");
  if (!app) throw new Error("#app not found");

  // Fast path: already logged in
  const me = await fetchMe();
  if (me) return;

  // Build a simple tabbed form: Login and Register
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = "12px";
  container.style.fontFamily = "system-ui";
  container.style.maxWidth = "320px";
  container.style.margin = "40px auto";

  const title = document.createElement("h2");
  title.textContent = "Sign in to play";
  title.style.textAlign = "center";
  container.appendChild(title);

  const tabs = document.createElement("div");
  tabs.style.display = "flex";
  tabs.style.gap = "8px";

  const loginTab = document.createElement("button");
  loginTab.textContent = "Login";
  const registerTab = document.createElement("button");
  registerTab.textContent = "Register";
  [loginTab, registerTab].forEach((b) => {
    b.style.padding = "6px 10px";
    b.style.cursor = "pointer";
  });
  tabs.appendChild(loginTab);
  tabs.appendChild(registerTab);
  container.appendChild(tabs);

  // Forms
  const loginForm = document.createElement("form");
  loginForm.innerHTML = `
    <label style="display:block;margin-top:8px;">Username<input name="username" required style="width:100%"/></label>
    <label style="display:block;margin-top:8px;">Password<input type="password" name="password" required style="width:100%"/></label>
    <button type="submit" style="margin-top:12px;padding:6px 10px;cursor:pointer;">Login</button>
    <div class="error" style="color:#ef4444;margin-top:8px;display:none;"></div>
  `;

  const registerForm = document.createElement("form");
  registerForm.style.display = "none";
  registerForm.innerHTML = `
    <label style="display:block;margin-top:8px;">Username<input name="username" required style="width:100%"/></label>
    <label style="display:block;margin-top:8px;">Password<input type="password" name="password" required style="width:100%"/></label>
    <label style="display:block;margin-top:8px;">Avatar URL<input name="avatar" placeholder="https://..." required style="width:100%"/></label>
    <button type="submit" style="margin-top:12px;padding:6px 10px;cursor:pointer;">Register</button>
    <div class="error" style="color:#ef4444;margin-top:8px;display:none;"></div>
  `;

  container.appendChild(loginForm);
  container.appendChild(registerForm);
  app.innerHTML = "";
  app.appendChild(container);

  function showLogin(): void {
    loginForm.style.display = "block";
    registerForm.style.display = "none";
  }
  function showRegister(): void {
    loginForm.style.display = "none";
    registerForm.style.display = "block";
  }
  showLogin();
  loginTab.onclick = showLogin;
  registerTab.onclick = showRegister;

  // Submit handlers
  const loginError = loginForm.querySelector(".error") as HTMLDivElement;
  loginForm.onsubmit = async (e) => {
    e.preventDefault();
    loginError.style.display = "none";
    const form = new FormData(loginForm);
    const username = String(form.get("username") || "").trim();
    const password = String(form.get("password") || "");
    try {
      await loginUser({ username, password });
      const isNowAuthed = await fetchMe();
      if (isNowAuthed) {
        app.innerHTML = "";
        return;
      }
      loginError.textContent = "Login failed";
      loginError.style.display = "block";
    } catch (err: any) {
      loginError.textContent = err?.message || "Login failed";
      loginError.style.display = "block";
    }
  };

  const registerError = registerForm.querySelector(".error") as HTMLDivElement;
  registerForm.onsubmit = async (e) => {
    e.preventDefault();
    registerError.style.display = "none";
    const form = new FormData(registerForm);
    const username = String(form.get("username") || "").trim();
    const password = String(form.get("password") || "");
    const avatar = String(form.get("avatar") || "").trim();
    if (!username || !password || !avatar) {
      registerError.textContent = "All fields are required";
      registerError.style.display = "block";
      return;
    }
    try {
      await registerUser({ username, password, avatar });
      const isNowAuthed = await fetchMe();
      if (isNowAuthed) {
        app.innerHTML = "";
        return;
      }
      registerError.textContent = "Registration failed";
      registerError.style.display = "block";
    } catch (err: any) {
      registerError.textContent = err?.message || "Registration failed";
      registerError.style.display = "block";
    }
  };

  // Wait until a successful login/register clears the UI
  await new Promise<void>((resolve) => {
    const observer = new MutationObserver(() => {
      if (!app.contains(container)) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(app, { childList: true });
  });
}

// Starts the program after loading the server config from the backend
// init() calls fetchConfig() → GET http://localhost:4000/api/config
async function init(): Promise<void> {
  try {
    const constants = await fetchGameConstants();
    GAME_CONSTANTS = constants;
    await ensureAuthenticated();
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
