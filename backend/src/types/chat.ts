// CHAT RELATED TYPES

export type ChatEvent = "direct" | "broadcast" | "invite" | "tournament" | "block" | "unblock";

export type Message = {
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
	global: Message[];
	private: Map<string, Message[]>;
	tournament: Message[];
};
