// Shared backend game types
import { Match, PaddleSide } from "./match.js";

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
