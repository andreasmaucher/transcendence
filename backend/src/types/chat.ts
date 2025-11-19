// CHAT RELATED TYPES

export type ChatEvent = "direct" | "broadcast" | "invite" | "tournament" | "profile-link" | "block" | "unblock";

export type Message = {
	id: string;
	sender: string;
	receiver: string | null;
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
