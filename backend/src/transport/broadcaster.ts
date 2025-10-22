// sends the current game state to all connected players (clients)
import type { WebSocket } from "ws";
import type { Room } from "../types/game.js";

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

export function broadcast(room: Room): void {
  if (!room.clients.size) return;
  const payload = JSON.stringify(buildStatePayload(room));
  for (const socket of Array.from(room.clients)) {
    const ws = socket as WebSocket;
    if (ws.readyState !== ws.OPEN) {
      room.clients.delete(socket);
      continue;
    }
    try {
      ws.send(payload);
    } catch {
      room.clients.delete(socket);
      try {
        ws.close();
      } catch {}
    }
  }
}

