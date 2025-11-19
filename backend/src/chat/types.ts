export type ChatEvent = "direct" 
	| "broadcast"
	| "invite"
	| "tournament"
	| "profile-link"
	| "block"
	| "unblock";


export type Message = {
	type: ChatEvent;
	id: string;
	sender: string;
	sentAt: number;
	receiver?: string;
	content?: string;
	gameId?: string;
	username?: string;
}
