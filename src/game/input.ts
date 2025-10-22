type PaddleSide = "left" | "right";
type Direction = "up" | "down" | "stop";

let activeSocket: WebSocket | null = null;
const pendingInputs: Array<{ paddle: PaddleSide; direction: Direction }> = [];
const lastSent: Record<PaddleSide, Direction> = { left: "stop", right: "stop" };

export function setActiveSocket(ws: WebSocket | null): void {
  activeSocket = ws;
}

export function queueInput(paddle: PaddleSide, direction: Direction): void {
  const current = lastSent[paddle];
  if (current === direction && direction !== "stop") return;
  pendingInputs.push({ paddle, direction });
  flushInputs();
}

export function flushInputs(): void {
  if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) return;
  while (pendingInputs.length) {
    const cmd = pendingInputs.shift();
    if (!cmd) break;
    lastSent[cmd.paddle] = cmd.direction;
    try {
      activeSocket.send(
        JSON.stringify({ type: "input", paddle: cmd.paddle, direction: cmd.direction })
      );
    } catch (err) {
      // push command back for retry
      pendingInputs.unshift(cmd);
      break;
    }
  }
}

export function setupInputs(): void {
  addEventListener("keydown", (e) => {
    if (e.key === "w") queueInput("left", "up");
    if (e.key === "s") queueInput("left", "down");
    if (e.key === "ArrowUp") queueInput("right", "up");
    if (e.key === "ArrowDown") queueInput("right", "down");
  });
  addEventListener("keyup", (e) => {
    if (e.key === "w" || e.key === "s") queueInput("left", "stop");
    if (e.key === "ArrowUp" || e.key === "ArrowDown") queueInput("right", "stop");
  });
}

