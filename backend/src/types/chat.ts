// CHAT RELATED TYPES

export type ChatEvent =
	| "direct"
	| "broadcast"
	| "invite"
	| "tournament"
	| "profile-link"
	| "block"
	| "unblock"
	| "onlineUser"
	| "init"
	| "requestInit";

export type Message = {
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
	global: Message[];
	private: Map<string, Message[]>;
	tournament: Message[];
};
