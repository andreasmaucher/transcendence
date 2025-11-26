// CHAT RELATED TYPES

export type ChatEvent =
	| "direct"
	| "broadcast"
	| "invite"
	| "tournament"
	| "profile-link"
	| "block"
	| "unblock";

export type ChatMessage = {
	id: string;
	sender: string;
	receiver?: string;
	type: ChatEvent;
	gameId?: string;
	content?: string;
	sentAt: string;
	onlineUser?: string[];
	chatHistory?: chatHistory;
};

export type chatHistory = {
	user: string;
	global: ChatMessage[];
	private: { [username: string]: ChatMessage[] };
	tournament: ChatMessage[];
};
