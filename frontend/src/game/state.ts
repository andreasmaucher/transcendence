import { MatchState } from "../types/game";
import { BackendStateMessage } from "../types/ws_message";

// apply the backend state to the local frontend game state
export function clamp(n: number, min: number, max: number): number {
	if (n < min) return min;
	if (n > max) return max;
	return n;
}

/* type Paddle = { x: number; y: number; w: number; h: number; speed: number };
type Ball = { x: number; y: number; vx: number; vy: number; r: number };
export type State = {
	isRunning: boolean;
	width: number;
	height: number;
	left: Paddle;
	right: Paddle;
	ball: Ball;
	scoreL: number;
	scoreR: number;
	isOver: boolean;
	winner: "left" | "right" | null;
	winningScore: number;
	tick: number;
};

export type BackendStateMessage = {
	type: "state";
	isRunning: boolean;
	width: number;
	height: number;
	paddles: { left: { y: number }; right: { y: number } };
	ball: { x: number; y: number; vx: number; vy: number; r: number };
	score: { left: number; right: number };
	isOver: boolean;
	winner: "left" | "right" | null;
	winningScore: number;
	tick: number;
}; */

// apply the backend state to the local frontend game state
export function applyBackendState(state: MatchState, remote: BackendStateMessage): void {
	// update the left paddle's y position
	state.width = remote.width;
	state.height = remote.height;

	const leftY = remote.paddles.left.y;
	state.left.y = clamp(leftY, 0, state.height - state.left.h);
	// update the right paddle's y position
	const rightY = remote.paddles.right.y;
	state.right.y = clamp(rightY, 0, state.height - state.right.h);
	// ball state updates
	state.ball.x = remote.ball.x;
	state.ball.y = remote.ball.y;
	state.ball.vx = remote.ball.vx;
	state.ball.vy = remote.ball.vy;
	state.ball.r = remote.ball.r;
	// game state updates
	state.isRunning = remote.isRunning;
	state.scoreL = remote.score.left;
	state.scoreR = remote.score.right;
	state.isOver = remote.isOver;
	state.winner = remote.winner;
	state.winningScore = remote.winningScore;
	// update the tick counter to the latest tick from the backend (helps with syncing the game state)
	state.tick = remote.tick;
}
