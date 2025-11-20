import { Message } from "./chat.js";
import { MatchState } from "./match.js";

export type PayloadTypes = "state" | "match-assigned" | "waiting" | "countdown" | "start" | "player-left" | "chat";
export type PayloadDataTypes =
	| MatchState
	| { matchId: string; playerSide: string }
	| { value: number }
	| undefined
	| { player: string }
	| Message;

export type Payload = {
	type: string;
	data: PayloadDataTypes;
};
