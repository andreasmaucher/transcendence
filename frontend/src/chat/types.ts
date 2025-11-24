export type ChatEvent = "direct" 
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
	type: ChatEvent;
	id: string;
	sender: string;
	sentAt: string | undefined;
	receiver?: string;
	content?: string;
	gameId?: string;
	username?: string;
	onlineUser?: string[];
	chatHistory?: chatHistory;
};

export type chatHistory = {
	user: string;
	global: Message[];
	private: Map<string, Message[]>;
	tournament: Message[];
};

export type chatType = "global"
| "private";
