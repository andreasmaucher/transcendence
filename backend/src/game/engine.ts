// main game loop and collision/score logic
import { GAME_CONSTANTS } from "../config/constants.js";
import { clamp, resetBall } from "./state.js";
import { updateMatchDB } from "../database/matches/setters.js";
import { endMatch } from "../managers/matchManager.js";
import { Match } from "../types/match.js";
import { broadcast, buildPayload } from "../transport/broadcaster.js";

export function isGameOver(match: Match): void {
	const state = match.state;
	const { score, winningScore } = state;
	if (state.isOver) return;
	let gameOver = false;
	if (score.left >= winningScore) {
		state.isOver = true;
		state.winner = "left";
		gameOver = true;
	}
	if (score.right >= winningScore) {
		state.isOver = true;
		state.winner = "right";
		gameOver = true;
	}
	if (state.isOver) {
		endMatch(match);
		match.inputs.left = 0;
		match.inputs.right = 0;
		if (gameOver) console.log(`[ENGINE] Match ${match.id} is over and winner is ${state.winner ?? "unknown"}`);
	}
}

export function stepMatch(match: Match, dt: number): void {
	const { state, inputs } = match;
	if (!match.state.isRunning || state.isOver) return; // Game logic starts only when the match starts and stops when the match is over

	// Capture previous paddle positions to derive per-frame velocity
	const prevLeftY = state.paddles.left.y;
	const prevRightY = state.paddles.right.y;

	// Move paddles
	const maxPaddleY = state.height - GAME_CONSTANTS.PADDLE_HEIGHT;
	for (const side of ["left", "right"] as const) {
		const paddle = state.paddles[side];
		const input = inputs[side];
		const previousY = paddle.y;
		paddle.y = clamp(paddle.y + input * GAME_CONSTANTS.PADDLE_SPEED * dt, 0, maxPaddleY);
		if (Math.abs(paddle.y - previousY) > 0.001) {
			console.log(`[paddle] room=${match.id} paddle=${side} y=${paddle.y.toFixed(1)}`);
		}
	}
	// Per-frame paddle vertical velocity (units per second)
	const leftPaddleVel = (state.paddles.left.y - prevLeftY) / dt;
	const rightPaddleVel = (state.paddles.right.y - prevRightY) / dt;

	const ball = state.ball;

	// Track previous position for swept collision
	const prevX = ball.x;
	const prevY = ball.y;

	// Integrate ball
	ball.x += ball.vx * dt;
	ball.y += ball.vy * dt;

	// Wall collisions (top/bottom)
	if (ball.y - ball.r <= 0 && ball.vy < 0) {
		console.log(`[ball] room=${match.id} event=wall-bounce wall=top`);
		ball.vy = Math.abs(ball.vy);
		ball.y = ball.r; // positional correction
	}
	if (ball.y + ball.r >= state.height && ball.vy > 0) {
		console.log(`[ball] room=${match.id} event=wall-bounce wall=bottom`);
		ball.vy = -Math.abs(ball.vy);
		ball.y = state.height - ball.r;
	}

	// Paddle front planes
	const LEFT_FRONT = GAME_CONSTANTS.PADDLE_MARGIN + GAME_CONSTANTS.PADDLE_WIDTH;
	const RIGHT_FRONT = GAME_CONSTANTS.FIELD_WIDTH - GAME_CONSTANTS.PADDLE_MARGIN;

	// Vertical overlap helpers
	const leftPad = state.paddles.left;
	const rightPad = state.paddles.right;

	const overlapsLeftVert = ball.y + ball.r >= leftPad.y && ball.y - ball.r <= leftPad.y + GAME_CONSTANTS.PADDLE_HEIGHT;
	const overlapsRightVert =
		ball.y + ball.r >= rightPad.y && ball.y - ball.r <= rightPad.y + GAME_CONSTANTS.PADDLE_HEIGHT;

	const crossedLeftFront =
		overlapsLeftVert && ball.vx < 0 && prevX - ball.r > LEFT_FRONT && ball.x - ball.r <= LEFT_FRONT;

	const crossedRightFront =
		overlapsRightVert && ball.vx > 0 && prevX + ball.r < RIGHT_FRONT && ball.x + ball.r >= RIGHT_FRONT;

	const penetratedFromBehindLeft =
		overlapsLeftVert && ball.vx > 0 && ball.x - ball.r < LEFT_FRONT && prevX - ball.r <= LEFT_FRONT;

	const penetratedFromBehindRight =
		overlapsRightVert && ball.vx < 0 && ball.x + ball.r > RIGHT_FRONT && prevX + ball.r >= RIGHT_FRONT;

	// Spin tuning constants
	// const IMPACT_OFFSET_SPIN_SCALE = 0.6; // how strongly off-center impact modifies vy
	// const PADDLE_MOVE_SPIN_SCALE = 0.15; // how strongly paddle vertical velocity adds spin
	// const MAX_VY = GAME_CONSTANTS.BALL_SPEED * 0.85; // cap vertical speed

	if (crossedLeftFront) {
		ball.x = LEFT_FRONT + ball.r;
		ball.vx = -ball.vx;
		// Impact offset relative to paddle center (-1 top, +1 bottom)
		const centerY = leftPad.y + GAME_CONSTANTS.PADDLE_HEIGHT / 2;
		const impactOffset = (ball.y - centerY) / (GAME_CONSTANTS.PADDLE_HEIGHT / 2);
		// New spin contribution
		const spinFromOffset = impactOffset * GAME_CONSTANTS.IMPACT_OFFSET_SPIN_SCALE * Math.abs(ball.vx);
		const spinFromMove = leftPaddleVel * GAME_CONSTANTS.PADDLE_MOVE_SPIN_SCALE;
		ball.vy += spinFromOffset + spinFromMove;
		// Clamp vertical velocity
		ball.vy = clamp(ball.vy, -GAME_CONSTANTS.MAX_VY, GAME_CONSTANTS.MAX_VY);
	} else if (penetratedFromBehindLeft) {
		ball.x = LEFT_FRONT + ball.r; // extrude only, no spin
	}

	if (crossedRightFront) {
		ball.x = RIGHT_FRONT - ball.r;
		ball.vx = -ball.vx;
		const centerY = rightPad.y + GAME_CONSTANTS.PADDLE_HEIGHT / 2;
		const impactOffset = (ball.y - centerY) / (GAME_CONSTANTS.PADDLE_HEIGHT / 2);
		const spinFromOffset = impactOffset * GAME_CONSTANTS.IMPACT_OFFSET_SPIN_SCALE * Math.abs(ball.vx);
		const spinFromMove = rightPaddleVel * GAME_CONSTANTS.PADDLE_MOVE_SPIN_SCALE;
		ball.vy += spinFromOffset + spinFromMove;
		ball.vy = clamp(ball.vy, -GAME_CONSTANTS.MAX_VY, GAME_CONSTANTS.MAX_VY);
	} else if (penetratedFromBehindRight) {
		ball.x = RIGHT_FRONT - ball.r;
	}

	// Scoring (after collision resolution so we don't falsely score mid-penetration)
	if (ball.x < -GAME_CONSTANTS.SCORE_OUT_MARGIN) {
		state.score.right += 1;
		updateMatchDB(match.id, state.score.left, state.score.right);
		console.log(`[score] room=${match.id} scorer=right score=${state.score.left}-${state.score.right}`);
		isGameOver(match);
		resetBall(state, 1);
	} else if (ball.x > state.width + GAME_CONSTANTS.SCORE_OUT_MARGIN) {
		state.score.left += 1;
		updateMatchDB(match.id, state.score.left, state.score.right);
		console.log(`[score] room=${match.id} scorer=left score=${state.score.left}-${state.score.right}`);
		isGameOver(match);
		resetBall(state, -1);
	}

	state.tick += 1;
}
