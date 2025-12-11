// GAMES RELATED TYPES
import { Match, PaddleSide } from "./match.js";

export type SingleGame = {
	id: string;
	name?: string; // to show the game in the lobby e.g.  "username game #1"
	match: Match;
	mode: "remote" | "local";
	creator?: string; // username of the player who created the game
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
