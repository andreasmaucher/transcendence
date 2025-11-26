export type ChatEvent = "direct" 
| "broadcast" 
| "invite" 
| "tournament" 
| "profile-link" 
| "block" 
| "unblock"
| "onlineUser";

export type Message = {
	type: ChatEvent;
	id?: string;
	sender: string;
	sentAt?: string;
	receiver?: string;
	content?: string;
	gameId?: string;
	username?: string;
	onlineUser?: string[];
	chatHistory?: chatHistory;
};

export type chatHistory = {
	user: string;
	global: Message[];
	private: Map<string, Message[]>;
	tournament: Message[];
};

export type Payload =
	| { type: "user-online"; data: { username: string } }
	| { type: "user-offline"; data: { username: string } }
	| { type: "chat"; data: Message }
	| { type: "match-assigned"; data: { matchId: string; playerSide: string } }
	| { type: "countdown"; data: { value: number } }
	| { type: "state"; data: undefined }
	| { type: "waiting"; data: undefined }
	| { type: "start"; data: undefined }
	| { type: "player-left"; data: undefined };

/*export type PayloadTypes =
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
	//| MatchState
	| { matchId: string; playerSide: string }
	| { value: number }
	| undefined
	| { username: string }
	| ChatMessage;

export type Payload = {
	type: PayloadTypes;
	data: PayloadDataTypes;
};*/
