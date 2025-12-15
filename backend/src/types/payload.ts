// PAYLOAD RELATED TYPES

import { ChatMessage } from "./chat.js";
import { MatchState } from "./match.js";

export type PlayerInfo = {
	username: string;
	displayName?: string;
};

export type MatchStatePayload = MatchState & {
	playerLeft?: PlayerInfo;
	playerRight?: PlayerInfo;
};

export type PayloadTypes =
	| "state"
	| "match-assigned"
	| "waiting"
	| "countdown"
	| "start"
	| "player-left"
	| "chat"
	| "user-online"
	| "user-offline";

export type PayloadDataTypes =
	| MatchStatePayload
	| { matchId: string; playerSide: string }
	| { value: number }
	| undefined
	| { username: string }
	| ChatMessage;

export type Payload = {
	type: PayloadTypes;
	data: PayloadDataTypes;
};
