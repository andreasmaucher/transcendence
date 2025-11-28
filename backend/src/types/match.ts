// MACTH RELATED TYPES
import type { WebSocket } from "ws";

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

export type MatchMode = "local" | "remote";

export type Match = {
	id: string;
	tournament?: TournamentMatchInfo;
	singleGameId?: string;
	state: MatchState;
	inputs: Record<PaddleSide, PaddleInput>;
	players: { left: string | undefined; right: string | undefined };
	players2: {
		username: string;
		side: "left" | "right";
		socket: any;
	}[];
	mode: MatchMode;
	clients: Set<WebSocket>;
};
