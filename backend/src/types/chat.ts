// CHAT RELATED TYPES

export type ChatEvent =
	| "direct"
	| "broadcast"
	| "invite"
	| "tournament"
	| "profile-link"
	| "block"
	| "unblock"
	| "blockedByMeMessage"
	| "blockedByOthersMessage"
;

export type ChatMessage = {
	id: string;
	sender: string;
	receiver?: string;
	type: ChatEvent;
	gameId?: string;
	content?: string;
	sentAt: string;
	tournamentName?: string;
};

export type chatHistoryBE = {
	user: string;
	global: ChatMessage[];
	private: ChatMessage[];
	tournament: ChatMessage[];
};

export type userData = {
	user: string;
	chatHistory: chatHistoryBE;
	blockedUsers: string[];
	friends: string[];
};
