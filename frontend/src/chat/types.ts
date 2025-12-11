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
	tournamentName?: string;
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

export type OpenGames = {
	type: "tournament" | "single";
	id: string;
	name: string;
	creator?: string;
};

export type SingleGame = {
	id: string;
	match: Match;
	mode: "remote" | "local";
	creator: string; // username of the player who created the game (only for naming the game)
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

export interface ApiOpenSingleGame {
	id: string;
	mode: string;
	match: {
		id: string;
		isRunning: boolean;
		isOver: boolean;
		players: { left?: string; right?: string };
		mode: string;
	};
	playersJoined: number;
}

export interface ApiOpenTournament {
	id: string;
	name: string;
	state: { size: number; isRunning: boolean; round: number };
	players: { username: string; displayName: string }[];
	playersJoined: number;
}

export interface OpenGamesResponse {
	openSingleGames: ApiOpenSingleGame[];
	openTournaments: ApiOpenTournament[];
}