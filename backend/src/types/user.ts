// USER RELATED TYPES
import type WebSocket from "ws";

// The User structure stored in the usersOnline map
export type User = {
	username: string;
	provider: string;
	providerId?: string;
	avatar: string;
	userWS: WebSocket;
	isAlive: boolean;
	gameWS?: WebSocket;
	gameId?: string;
	//blocked: User[];
	//friends: User[];
	//stats: string | null;
	createdAt: string;
};

// This is the data that is put inside the token.
// - username: the logged-in user's username
// - exp: when the token expires (in seconds)
export type SessionPayload = {
	username: string;
	exp: number;
};
