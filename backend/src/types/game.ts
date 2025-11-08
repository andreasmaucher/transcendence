// Shared backend game types
import type { WebSocket } from "ws";

export type SingleGame = {
	id: string;
	match: Match;
	mode: "remote" | "local";
	expirationTimer?: NodeJS.Timeout;
};

export type TournamentState = {
	size: number;
	round: number;
	tournamentOver: boolean;
	winner: PaddleSide | null;
};

export type Tournament = {
	id: string;
	isRunning: boolean;
	state: TournamentState;
	matches: Map<number, Match[]>;
	expirationTimer?: NodeJS.Timeout;

	//inputs: Record<PaddleSide, PaddleInput>;
};

export type TournamentDB = {
	internal_id: number;
	id: string;
	size: number;
	winner: string | null;
	started_at: string | null;
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

export type MatchState = {
	round: number;
	width: number;
	height: number;
	paddles: Record<PaddleSide, PaddleState>;
	ball: BallState;
	score: Record<PaddleSide, number>;
	tick: number;
	gameOver: boolean;
	winner: PaddleSide | undefined;
	winningScore: number;
};

export type Match = {
	id: string;
	tournamentId: string | undefined;
	singleGameId: string | undefined;
	isRunning: boolean;
	state: MatchState;
	inputs: Record<PaddleSide, PaddleInput>;
	players: { left: string | undefined; right: string | undefined };
	clients: Set<WebSocket>;
};

export type MatchDB = {
	internal_id: number;
	id: string;
	tournament_id: string | null;
	player_left_id: string | null;
	player_right_id: string | null;
	score_left: number;
	score_right: number;
	winner: string | null;
	is_winner_guest: boolean;
	started_at: string | null;
	ended_at: string | null;
};
