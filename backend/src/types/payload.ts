// PAYLOAD RELATED TYPES

import { ChatMessage } from "./chat.js";
import { MatchState } from "./match.js";

export type PayloadTypes =
	| "state"
	| "match-assigned"
	| "tournament-finished"
	| "tournament-match-save-started"
	| "tournament-match-saved"
	| "tournament-match-save-failed"
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
	| { tournamentId: string; name?: string; winner?: string }
	| {
			tournamentId: string;
			matchId: string;
			gameIndex: number;
			playerLeft: string;
			playerRight: string;
			scoreLeft: number;
			scoreRight: number;
			winner: string;
			txHash?: string;
			alreadySaved?: boolean;
	  }
	| { tournamentId: string; matchId: string; gameIndex: number; error: string }
	| { value: number }
	| undefined
	| { username: string }
	| ChatMessage;

export type Payload = {
	type: PayloadTypes;
	data: PayloadDataTypes;
};
