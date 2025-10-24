// apply the backend state to the local frontend game state
export function clamp(n: number, min: number, max: number): number {
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

type Paddle = { x: number; y: number; w: number; h: number; speed: number };
type Ball = { x: number; y: number; vx: number; vy: number; r: number };
export type State = {
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

export type BackendStateMessage = {
  type: "state";
  tick: number;
  paddles: { left?: { y: number }; right?: { y: number } };
  ball: { x: number; y: number; vx?: number; vy?: number; r: number };
  score: { left: number; right: number };
  gameOver: boolean;
  winner: "left" | "right" | null;
  winningScore?: number;
};

// apply the backend state to the local frontend game state
export function applyBackendState(state: State, remote: BackendStateMessage): void {
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

