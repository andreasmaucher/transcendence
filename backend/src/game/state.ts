// creates a fresh game with everything in starting position
import { GAME_CONSTANTS } from "../config/constants.js";
import { broadcast, buildPayload } from "../transport/broadcaster.js";
import type { TournamentState } from "../types/game.js";
import { Match, MatchState } from "../types/match.js";

export function createInitialTournamentState(size: number): TournamentState {
	return {
		isRunning: false,
		size: size,
		round: 1,
		isOver: false,
		winner: null,
	};
}

// creates a fresh game with everything in starting position
// every tick, the backend updates this state and broadcasts a snapshot to clients
export function createInitialMatchState(): MatchState {
	return {
		isRunning: false,
		width: GAME_CONSTANTS.FIELD_WIDTH,
		height: GAME_CONSTANTS.FIELD_HEIGHT,
		paddles: {
			left: {
				y: (GAME_CONSTANTS.FIELD_HEIGHT - GAME_CONSTANTS.PADDLE_HEIGHT) / 2,
			},
			right: {
				y: (GAME_CONSTANTS.FIELD_HEIGHT - GAME_CONSTANTS.PADDLE_HEIGHT) / 2,
			},
		},
		ball: {
			x: GAME_CONSTANTS.FIELD_WIDTH / 2,
			y: GAME_CONSTANTS.FIELD_HEIGHT / 2,
			vx: GAME_CONSTANTS.BALL_SPEED,
			vy: GAME_CONSTANTS.BALL_SPEED * GAME_CONSTANTS.INITIAL_BALL_VY_RATIO,
			r: GAME_CONSTANTS.BALL_RADIUS,
		},
		score: { left: 0, right: 0 },
		tick: 0,
		isOver: false,
		winner: undefined,
		winningScore: GAME_CONSTANTS.WINNING_SCORE,
	};
}

export function resetBall(state: MatchState, direction: -1 | 1): void {
	state.ball.x = state.width / 2;
	state.ball.y = state.height / 2;
	state.ball.vx = direction * GAME_CONSTANTS.BALL_SPEED;
	state.ball.vy = GAME_CONSTANTS.BALL_SPEED * GAME_CONSTANTS.INITIAL_BALL_VY_RATIO;
}

export function resetMatchState(match: Match) {
	match.state = {
		...match.state,
		isRunning: false,
		width: GAME_CONSTANTS.FIELD_WIDTH,
		height: GAME_CONSTANTS.FIELD_HEIGHT,
		paddles: {
			left: { y: (GAME_CONSTANTS.FIELD_HEIGHT - GAME_CONSTANTS.PADDLE_HEIGHT) / 2 },
			right: { y: (GAME_CONSTANTS.FIELD_HEIGHT - GAME_CONSTANTS.PADDLE_HEIGHT) / 2 },
		},
		ball: {
			x: GAME_CONSTANTS.FIELD_WIDTH / 2,
			y: GAME_CONSTANTS.FIELD_HEIGHT / 2,
			vx: GAME_CONSTANTS.BALL_SPEED,
			vy: GAME_CONSTANTS.BALL_SPEED * GAME_CONSTANTS.INITIAL_BALL_VY_RATIO,
			r: GAME_CONSTANTS.BALL_RADIUS,
		},
		score: { left: 0, right: 0 },
		tick: 0,
		isOver: false,
		winner: undefined,
		winningScore: GAME_CONSTANTS.WINNING_SCORE,
	};
	match.inputs = { left: 0, right: 0 };
	console.log(`[game] match=${match.id} reset`);
	broadcast(buildPayload("state", match.state), match);
}

export function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}
