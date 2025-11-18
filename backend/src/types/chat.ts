// CHAT RELATED TYPES

export type Message = {
	sender: string;
	receiver: string | null;
	type: string;
	content: string;
};

export type chatHistory = {
	user: string;
	global: Message[];
	private: Map<string, Message[]>;
};
