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

export type ChatMessage = {
	id: string;
	sender: string;
	receiver?: string;
	type: ChatEvent;
	gameId?: string;
	content?: string;
	sentAt: string;
};

export type chatHistory = {
	user: string;
	global: ChatMessage[];
	private: Map<string, ChatMessage[]>;
	tournament: ChatMessage[];
};
