import { MatchState } from "./match.js";

export type PayloadTypes = "state" | "match-assigned" | "waiting" | "countdown" | "start" | "player-left" | "chat" | "round-transition";
export type PayloadDataTypes =
	| MatchState
	| { matchId: string; playerSide: string }
	| { value: number }
	| undefined
	| { player: string };

export type Payload = {
	type: string;
	data: PayloadDataTypes;
};
