// Shared backend game types
import type { WebSocket } from "ws";
export type PaddleSide = "left" | "right";
export type PaddleInput = -1 | 0 | 1; // -1=up, 0=stop, 1=down

export type PaddleState = { y: number };

export type BallState = {
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

