// PAYLOAD RELATED TYPES

import { ChatMessage } from "./chat.js";
import { MatchState } from "./match.js";

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
	| MatchState
	| { matchId: string; playerSide: string }
	| { value: number }
	| undefined
	| { username: string }
	| ChatMessage;

export type Payload = {
	type: PayloadTypes;
	data: PayloadDataTypes;
};
