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
	isRunning: boolean;
	round: number;
	isOver: boolean;
	winner: PaddleSide | null;
};

export type Tournament = {
	id: string;

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
	isRunning: boolean;
	width: number;
	height: number;
	paddles: Record<PaddleSide, PaddleState>;
	ball: BallState;
	score: Record<PaddleSide, number>;
	tick: number;
	isOver: boolean;
	winner: PaddleSide | undefined;
	winningScore: number;
};

export type TournamentMatchType = "normal" | "final" | "thirdPlace" | "placement"; // Types for tournament matches

export type TournamentMatchInfo = {
	id: string;
	round: number;
	type: TournamentMatchType;
	placementRange: [number, number];
};

export type MatchType = "local" | "remote";

export type Match = {
	id: string;
	tournament: TournamentMatchInfo | undefined;
	singleGameId: string | undefined;
	state: MatchState;
	inputs: Record<PaddleSide, PaddleInput>;
	players: { left: string | undefined; right: string | undefined };
	type: MatchType;
	clients: Set<WebSocket>;
};

export type MatchDB = {
	internal_id: number;
	id: string;
	player_left_id: string | null;
	player_right_id: string | null;
	tournament_id: string | null;
	round: number;
	in_tournament_type: TournamentMatchType | null;
	in_tournament_placement_range: string | null;
	score_left: number;
	score_right: number;
	winner: string | null;
	is_winner_guest: boolean;
	started_at: string | null;
	ended_at: string | null;
};
