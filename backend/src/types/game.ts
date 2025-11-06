// Shared backend game types
import type { WebSocket } from "ws";

export type TournamentState = {
	size: number;
	tournamentOver: boolean;
	winner: PaddleSide | null;
};

export type Tournament = {
	id: string;
	state: TournamentState;
	matches: Match[];
	//inputs: Record<PaddleSide, PaddleInput>;
};

export type TournamentDB = {
	id: string;
	size: number;
	winner: string | null;
	started_at: string;
	ended_at: string | null;
};

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

export type Match = {
	id: string;
	tournament_id: string;
	state: GameState;
	inputs: Record<PaddleSide, PaddleInput>;
	clients: Set<WebSocket>;
};

export type MatchDB = {
	id: string;
	tournament_id: string;
	player_left_id: number;
	player_right_id: number;
	score_left: number;
	score_right: number;
	winner: string | null;
	started_at: string;
	ended_at: string | null;
};
