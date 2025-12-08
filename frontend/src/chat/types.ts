export type ChatEvent = "direct" 
| "broadcast" 
| "invite" 
| "tournament" 
| "profile-link" 
| "block" 
| "unblock"
| "onlineUser"
| "blockedByMeMessage"
| "blockedByOthersMessage";

export type Message = {
	type: ChatEvent;
	id?: string;
	sender: string;
	sentAt?: string;
	receiver?: string;
	content?: string;
	gameId?: string;
	username?: string;
	//onlineUser?: string[];
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

export type Player = {
	username: string;
	socket: any;
};

export type Match = {
	id: string;
	tournament?: TournamentMatchInfo;
	singleGameId?: string;
	state: MatchState;
	inputs: Record<PaddleSide, PaddleInput>;
	players: { left?: Player; right?: Player };
	mode: MatchMode;
	clients: Set<WebSocket>;
};

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
