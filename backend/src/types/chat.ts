// CHAT RELATED TYPES

export type Message = {
	id: string;
	sender: string;
	receiver: string | null;
	type: string;
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
