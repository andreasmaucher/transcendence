// main game loop and collision/score logic
import { GAME_CONSTANTS } from "../config/constants.js";
import type { Match } from "../types/game.js";
import { clamp, resetBall } from "./state.js";
import {
	updateMatchDB,
	endMatchDB,
} from "../database/helpers/match_setters.js";
import { endTournamentDB } from "../database/helpers/tournament_setters.js";

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
			console.log(
				`[game] room=${match.id} event=game-over winner=${
					state.winner ?? "unknown"
				}`
			);
		}
	}
}

export function stepMatch(match: Match, dt: number): void {
	const { state, inputs } = match;
	if (state.gameOver) return;

	const maxPaddleY = state.height - GAME_CONSTANTS.PADDLE_HEIGHT;
	for (const side of ["left", "right"] as const) {
		const paddle = state.paddles[side];
		const input = inputs[side];
		const previousY = paddle.y;
		paddle.y = clamp(
			paddle.y + input * GAME_CONSTANTS.PADDLE_SPEED * dt,
			0,
			maxPaddleY
		);
		if (Math.abs(paddle.y - previousY) > 0.001) {
			console.log(
				`[paddle] room=${match.id} paddle=${side} y=${paddle.y.toFixed(1)}`
			);
		}
	}

	const ball = state.ball;
	ball.x += ball.vx * dt;
	ball.y += ball.vy * dt;

	if (ball.y - ball.r <= 0 && ball.vy < 0) {
		console.log(`[ball] room=${match.id} event=wall-bounce wall=top`);
		ball.vy = Math.abs(ball.vy);
	}
	if (ball.y + ball.r >= state.height && ball.vy > 0) {
		console.log(`[ball] room=${match.id} event=wall-bounce wall=bottom`);
		ball.vy = -Math.abs(ball.vy);
	}

	const PADDLE_X = {
		left: GAME_CONSTANTS.PADDLE_MARGIN,
		right:
			GAME_CONSTANTS.FIELD_WIDTH -
			GAME_CONSTANTS.PADDLE_MARGIN -
			GAME_CONSTANTS.PADDLE_WIDTH,
	} as const;

	const hitsLeft =
		ball.vx < 0 &&
		ball.x - ball.r <= PADDLE_X.left + GAME_CONSTANTS.PADDLE_WIDTH &&
		ball.y >= state.paddles.left.y &&
		ball.y <= state.paddles.left.y + GAME_CONSTANTS.PADDLE_HEIGHT;
	const hitsRight =
		ball.vx > 0 &&
		ball.x + ball.r >= PADDLE_X.right &&
		ball.y >= state.paddles.right.y &&
		ball.y <= state.paddles.right.y + GAME_CONSTANTS.PADDLE_HEIGHT;

	if (hitsLeft) {
		console.log(`[ball] room=${match.id} event=paddle-hit paddle=left`);
	}
	if (hitsRight) {
		console.log(`[ball] room=${match.id} event=paddle-hit paddle=right`);
	}
	if (hitsLeft || hitsRight) {
		ball.vx = -ball.vx;
	}

	// Check for scoring
	if (ball.x < -GAME_CONSTANTS.SCORE_OUT_MARGIN) {
		// Right player scored
		state.score.right += 1;
		updateMatchDB(match.id, state.score.left, state.score.right); // Update database
		console.log(
			`[score] room=${match.id} scorer=right score=${state.score.left}-${state.score.right}`
		);
		maybeCompleteGame(match);
		resetBall(state, 1);
	} else if (ball.x > state.width + GAME_CONSTANTS.SCORE_OUT_MARGIN) {
		// Left player scored
		state.score.left += 1;
		updateMatchDB(match.id, state.score.left, state.score.right); // Update database
		console.log(
			`[score] room=${match.id} scorer=left score=${state.score.left}-${state.score.right}`
		);
		maybeCompleteGame(match);
		resetBall(state, -1);
	}

	state.tick += 1;
}
