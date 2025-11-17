export type DirectChatMessage = {
	type: "direct";
	id: string;
	sentAt: number;
	from: string;
	to: string;
	body: string;
};

export type BroadcastChatMessage = {
	type: "broadcast";
	id: string;
	sentAt: number;
	from: string;
	body: string;
};

export type InviteChatMessage = {
	type: "invite";
	id: string;
	sentAt: number;
	from: string;
	to: string;
	gameId: string;
	message?: string;
};

export type TournamentChatMessage = {
	type: "tournament";
	id: string;
	sentAt: number;
	matchId: string;
	opponents: string[];
	startsAt: number;
	info?: string;
};

export type ProfileLinkMessage = {
	type: "profile-link";
	id: string;
	sentAt: number;
	from: string;
	to: string;
	targetProfile: string;
};

export type BlockMessage = {
	type: "block";
	id: string;
	sentAt: number;
	from: string;
	username: string;
};

export type UnblockMessage = {
	type: "unblock";
	id: string;
	sentAt: number;
	from: string;
	username: string;
};

export type ChatEvent =
	| DirectChatMessage
	| BroadcastChatMessage
	| InviteChatMessage
	| TournamentChatMessage
	| ProfileLinkMessage
	| BlockMessage
	| UnblockMessage;

export type ChatInboundMessage =
	| {
			type: "direct";
			to: string;
			body: string;
	  }
	| {
			type: "broadcast";
			body: string;
	  }
	| {
			type: "invite";
			to: string;
			gameId: string;
			message?: string;
	  }
	| {
			type: "profile-link";
			to: string;
			targetProfile: string;
	  }
	| {
			type: "block";
			username: string;
	  }
	| {
			type: "unblock";
			username: string;
	  };
