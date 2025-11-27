// GAME RELATED TYPES

export type PaddleSide = "left" | "right";

export type Direction = "up" | "down" | "stop";

export type Paddle = { x: number; y: number; w: number; h: number; speed: number };

export type Ball = { x: number; y: number; vx: number; vy: number; r: number };

export type MatchState = {
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
	mode?: "local" | "online" | "tournament"; // track game mode to conditionally show blockchain popup
};
