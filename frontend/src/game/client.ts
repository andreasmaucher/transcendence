import { WS_PROTOCOL, WS_HOST, WS_PORT, ROOM_ID } from "../config/endpoints";
import { applyBackendState, State, BackendStateMessage } from "./state";
import { setActiveSocket } from "./input";
import { draw } from "../rendering/canvas";

export function startGameClient(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  const socket = new WebSocket(
    `${WS_PROTOCOL}://${WS_HOST}:${WS_PORT}/api/single-game/${ROOM_ID}/ws`
  );
  setActiveSocket(socket);

  const state: State = {
    width: canvas.width,
    height: canvas.height,
    left: { x: 30, y: 250, w: 10, h: 100, speed: 0 },
    right: { x: 760, y: 250, w: 10, h: 100, speed: 0 },
    ball: { x: 400, y: 300, vx: 0, vy: 0, r: 8 },
    scoreL: 0,
    scoreR: 0,
    gameOver: false,
    winner: null,
    winningScore: 5,
    tick: 0,
  };

  let connected = false;
  let animationFrame: number | null = null;

  let lastSnapshot: BackendStateMessage | null = null;
  let nextSnapshot: BackendStateMessage | null = null;
  let lastTime = performance.now();

  socket.onopen = () => { connected = true; };
  socket.onclose = () => { connected = false; };
  socket.onerror = (err) => console.error("WebSocket error:", err);

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === "state") {
      lastSnapshot = nextSnapshot;
      nextSnapshot = data as BackendStateMessage;
    }
  };

  const renderLoop = () => {
    const now = performance.now();
    lastTime = now;

    if (lastSnapshot && nextSnapshot) {
      const t = nextSnapshot.tick === lastSnapshot.tick
        ? 1
        : (state.tick - lastSnapshot.tick) /
          (nextSnapshot.tick - lastSnapshot.tick);

      const alpha = Math.max(0, Math.min(t, 1));
      const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

      // safer deep clone
      const interp: BackendStateMessage = structuredClone(nextSnapshot);

      interp.ball.x = lerp(lastSnapshot.ball.x, nextSnapshot.ball.x, alpha);
      interp.ball.y = lerp(lastSnapshot.ball.y, nextSnapshot.ball.y, alpha);

      applyBackendState(state, interp);
    } else if (nextSnapshot) {
      applyBackendState(state, nextSnapshot);
    }

    draw(ctx, state);
    animationFrame = requestAnimationFrame(renderLoop);
  };

  renderLoop();

  return function stop() {
    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    animationFrame = null;

    if (connected) socket.close();
    setActiveSocket(null);
  };
}
