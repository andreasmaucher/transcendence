// main game loop and collision/score logic
import { GAME_CONSTANTS } from "../config/constants.js";
import type { Match } from "../types/game.js";
import { clamp, resetBall } from "./state.js";
import { updateMatchDB, endMatchDB } from "../database/matches/setters.js";
import { endTournamentDB } from "../database/tournaments/setters.js";

export function maybeCompleteGame(match: Match): void {
	const state = match.state;
	const { score, winningScore } = state;
	if (state.gameOver) return;
	let gameEnded = false;
	if (score.left >= winningScore) {
		state.gameOver = true;
		state.winner = "left";
		gameEnded = true;
	}
	if (score.right >= winningScore) {
		state.gameOver = true;
		state.winner = "right";
		gameEnded = true;
	}
	if (state.gameOver) {
		endMatchDB(match.id, state.winner); // Update database
		endTournamentDB(match.tournament_id, state.winner); // hardcoded for the moment
		match.inputs.left = 0;
		match.inputs.right = 0;
		if (gameEnded) {
			console.log(`[game] room=${match.id} event=game-over winner=${state.winner ?? "unknown"}`);
		}
	}
}

// ...existing code...
export function stepMatch(match: Match, dt: number): void {
	const { state, inputs } = match;
	if (state.gameOver) return;

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

	// Swept tests: did we cross the front plane this frame?
	const crossedLeftFront =
		overlapsLeftVert && ball.vx < 0 && prevX - ball.r > LEFT_FRONT && ball.x - ball.r <= LEFT_FRONT;

	const crossedRightFront =
		overlapsRightVert && ball.vx > 0 && prevX + ball.r < RIGHT_FRONT && ball.x + ball.r >= RIGHT_FRONT;

	// Penetration (paddle moved into ball) without crossing: push out, no bounce
	const penetratedFromBehindLeft =
		overlapsLeftVert &&
		ball.vx > 0 && // ball moving away from left paddle
		ball.x - ball.r < LEFT_FRONT &&
		prevX - ball.r <= LEFT_FRONT;

	const penetratedFromBehindRight =
		overlapsRightVert && ball.vx < 0 && ball.x + ball.r > RIGHT_FRONT && prevX + ball.r >= RIGHT_FRONT;

	if (crossedLeftFront) {
		console.log(`[ball] room=${match.id} event=paddle-hit paddle=left type=front`);
		// Snap to surface and bounce
		ball.x = LEFT_FRONT + ball.r;
		ball.vx = -ball.vx;
	} else if (penetratedFromBehindLeft) {
		// Just extrude
		ball.x = LEFT_FRONT + ball.r;
	}

	if (crossedRightFront) {
		console.log(`[ball] room=${match.id} event=paddle-hit paddle=right type=front`);
		ball.x = RIGHT_FRONT - ball.r;
		ball.vx = -ball.vx;
	} else if (penetratedFromBehindRight) {
		ball.x = RIGHT_FRONT - ball.r;
	}

	// Scoring (after collision resolution so we don't falsely score mid-penetration)
	if (ball.x < -GAME_CONSTANTS.SCORE_OUT_MARGIN) {
		state.score.right += 1;
		updateMatchDB(match.id, state.score.left, state.score.right);
		console.log(`[score] room=${match.id} scorer=right score=${state.score.left}-${state.score.right}`);
		maybeCompleteGame(match);
		resetBall(state, 1);
	} else if (ball.x > state.width + GAME_CONSTANTS.SCORE_OUT_MARGIN) {
		state.score.left += 1;
		updateMatchDB(match.id, state.score.left, state.score.right);
		console.log(`[score] room=${match.id} scorer=left score=${state.score.left}-${state.score.right}`);
		maybeCompleteGame(match);
		resetBall(state, -1);
	}

	state.tick += 1;
}
