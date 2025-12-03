// GAMES RELATED TYPES
import { Match, PaddleSide } from "./match.js";

export type SingleGame = {
	id: string;
	match: Match;
	mode: "remote" | "local";
	//creator: string; // username of the player who created the game (only for naming the game)
	//gameNumber: number; // number of games a user has created (only for naming the game)
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
	name: string;
	state: TournamentState;
	matches: Map<number, Match[]>;
	players: {
		username: string;
		displayName: string;
		socket: any;
		currentMatch: Match;
	}[];
	expirationTimer?: NodeJS.Timeout;
};
