// src/views/game/ui.ts
import { type GameConstants } from "../../constants";
import { navigate } from "../../router/router";
import { fetchGameConstants } from "../../api/http";
import { WS_PROTOCOL, WS_HOST, WS_PORT, ROOM_ID } from "../../config/endpoints";
import { draw } from "../../rendering/canvas";
import { t } from "../../i18n";

import {
  applyBackendState,
  type BackendStateMessage,
  type State,
} from "../../game/state";
import {
  setupInputs,
  setActiveSocket,
  queueInput,
  flushInputs,
} from "../../game/input";

let GAME_CONSTANTS: GameConstants | null = null;

function createInitialState(): State {
  if (!GAME_CONSTANTS) throw new Error("Game constants not loaded");
  const centerY =
    (GAME_CONSTANTS.fieldHeight - GAME_CONSTANTS.paddleHeight) / 2;

  const left = {
    x: GAME_CONSTANTS.paddleMargin,
    y: centerY,
    w: GAME_CONSTANTS.paddleWidth,
    h: GAME_CONSTANTS.paddleHeight,
    speed: GAME_CONSTANTS.paddleSpeed,
  };

  const right = {
    x:
      GAME_CONSTANTS.fieldWidth -
      GAME_CONSTANTS.paddleMargin -
      GAME_CONSTANTS.paddleWidth,
    y: centerY,
    w: GAME_CONSTANTS.paddleWidth,
    h: GAME_CONSTANTS.paddleHeight,
    speed: GAME_CONSTANTS.paddleSpeed,
  };

  return {
    isRunning: true,
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
    isOver: false,
    winner: null,
    winningScore: GAME_CONSTANTS.winningScore,
    tick: 0,
  };
}

function connectToBackend(state: State): () => void {
  const wsUrl = `${WS_PROTOCOL}://${WS_HOST}:${WS_PORT}/api/local-single-game/${ROOM_ID}/ws`;

  const ws = new WebSocket(wsUrl);
  setActiveSocket(ws);

  let resetRequested = false;

  ws.addEventListener("open", () => {
    queueInput("left", "stop");
    queueInput("right", "stop");
    flushInputs();
  });

  ws.addEventListener("message", (event) => {
    let parsed: unknown;

    try {
      parsed = JSON.parse(String(event.data));
    } catch {
      return;
    }

    if (!parsed || typeof parsed !== "object") return;
    const payload = parsed as BackendStateMessage;

    if (payload.type === "state") {
      const wasOver = state.isOver;
      applyBackendState(state, payload);

      if (state.isOver && !wasOver && !resetRequested) {
        ws.send(JSON.stringify({ type: "reset" }));
        resetRequested = true;
      } else if (!state.isOver) {
        resetRequested = false;
      }
    }
  });

  ws.addEventListener("close", () => {
    setActiveSocket(null);
    resetRequested = false;
    setTimeout(() => connectToBackend(state), 1000);
  });

  ws.addEventListener("error", () => ws.close());

  return () => ws.close();
}

function startGameLoop(canvas: HTMLCanvasElement, state: State): () => void {
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;

  let running = true;

  function frame() {
    if (!running) return;
    draw(ctx, state);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);

  return () => {
    running = false;
  };
}

export async function renderGame(container: HTMLElement) {
  container.innerHTML = "";
  let cancelled = false;
  const hash = location.hash;
  const mode = hash.includes("mode=online") ? "online" : "local";
  console.log("GAME MODE =", mode);

  const wrapper = document.createElement("div");
  wrapper.style.position = "relative";
  wrapper.style.width = "fit-content";
  wrapper.style.margin = "0 auto";
  container.append(wrapper);

  const exitBtn = document.createElement("button");
  exitBtn.textContent = t("game.exit");
  exitBtn.style.padding = "4px 8px";
  exitBtn.style.fontSize = "14px";
  exitBtn.style.cursor = "pointer";
  exitBtn.style.position = "fixed";
  exitBtn.style.top = "900px";
  exitBtn.style.right = "20px";
  exitBtn.style.zIndex = "9999";
  exitBtn.onclick = () => navigate("#/menu");
  wrapper.append(exitBtn);

  GAME_CONSTANTS = await fetchGameConstants();
  if (cancelled) return;

  const canvas = document.createElement("canvas");
  canvas.width = GAME_CONSTANTS.fieldWidth;
  canvas.height = GAME_CONSTANTS.fieldHeight;
  wrapper.append(canvas);

  const state = createInitialState();
  const cleanupWS = connectToBackend(state);
  setupInputs();

  const cleanupLoop = startGameLoop(canvas, state);

  return () => {
    cancelled = true;
    cleanupLoop();
    cleanupWS();
    setActiveSocket(null);
  };
}
