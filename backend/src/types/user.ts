// USER RELATED TYPES

// The User structure stored in the usersOnline map
export type User = {
	username: string;
	provider: string;
	provider_id: string;
	avatar: string;
	socket: WebSocket;
	game: WebSocket | undefined;
	//friends: User[];
	//stats: string | null;
	created_at: string;
};

// This is the data that is put inside the token.
// - username: the logged-in user's username
// - exp: when the token expires (in seconds)
export type SessionPayload = {
	username: string;
	exp: number;
};
